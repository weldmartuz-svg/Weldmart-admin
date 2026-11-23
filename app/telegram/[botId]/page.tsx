import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { notFound, redirect } from 'next/navigation';
import { db, requireAuth, tgApi } from '@/lib/s';
import { getBot, botSend, hookUp } from '@/lib/tg';
import { dt, num, q, range, addDays, dayOf, handle } from '@/lib/ui';
import Shell from '@/components/Shell';
import { BotTabs } from '@/components/Tabs';
import { Flash, Reading, Range, Confirm } from '@/components/Bits';
import Autopost from '@/components/Autopost';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
const TABS: [string, string][] = [['stat', 'Statistika'], ['auto', 'Avtopost'], ['inbox', 'Xabarlar'], ['chats', 'Chatlar'], ['send', 'Yuborish'], ['settings', 'Sozlamalar']];
const who = (c: any) => c ? (c.title || [c.first_name, c.username ? '@' + c.username : ''].filter(Boolean).join(' ') || c.chat_id) : '';
const TYPE: Record<string, string> = { private: 'foydalanuvchi', group: 'guruh', supergroup: 'guruh', channel: 'kanal' };
export default async function Bot({ params, searchParams }: any) {
  await requireAuth();
  const { botId } = await params, sp = await searchParams;
  const bot = await getBot(botId);
  if (!bot) notFound();
  const tab = TABS.find(t => t[0] === sp?.t) ? sp.t : 'stat';
  const path = `/telegram/${botId}`;
  const { data: chats } = await db().from('telegram_chats').select('*').eq('bot_id', botId).order('last_seen', { ascending: false }).limit(2000);
  const C = chats || [], byId = Object.fromEntries(C.map(c => [c.chat_id, c]));

  async function send(fd: FormData) {
    'use server'; await requireAuth();
    const b = await getBot(botId); const text = String(fd.get('text') || '').trim(), to = String(fd.get('chat') || '').trim(), back = String(fd.get('back') || 'send');
    if (!text || !to) redirect(`${path}?t=${back}&err=` + q('Chat va matn kerak.'));
    let m = '';
    try { await botSend(b, to, text); m = 'ok=' + q('Yuborildi.'); } catch (e: any) { m = 'err=' + q(e.message); }
    revalidatePath(path); redirect(`${path}?t=${back}&${m}`);
  }
  async function broadcast(fd: FormData) {
    'use server'; await requireAuth();
    const b = await getBot(botId); const text = String(fd.get('text') || '').trim(), aud = String(fd.get('aud') || 'private');
    if (!text) redirect(`${path}?t=send&err=` + q('Matn kerak.'));
    let qb = db().from('telegram_chats').select('chat_id,type').eq('bot_id', botId).eq('status', 'active');
    const { data: list } = await qb;
    const targets = (list || []).filter(c => aud === 'all' || (aud === 'private' ? c.type === 'private' : c.type !== 'private'));
    const t0 = Date.now(); let ok = 0, bad = 0, left = 0;
    for (const c of targets) {
      if (Date.now() - t0 > 50000) { left++; continue; }
      try { await botSend(b, c.chat_id, text); ok++; } catch { bad++; }
      await new Promise(r => setTimeout(r, 40));
    }
    revalidatePath(path); redirect(`${path}?t=send&ok=` + q(`${ok} ta chatga yuborildi${bad ? `, ${bad} tasiga yetmadi (bloklagan yoki o'chgan)` : ''}${left ? `, ${left} tasi vaqt yetmagani uchun qoldi` : ''}.`));
  }
  async function saveSet(fd: FormData) {
    'use server'; await requireAuth();
    const nm = String(fd.get('name') || '').trim();
    await db().from('telegram_bots').update({ ...(nm ? { name: nm } : {}), welcome_text: String(fd.get('welcome') || '').trim() || null }).eq('id', botId);
    revalidatePath('/', 'layout'); redirect(`${path}?t=settings&ok=1`);
  }
  async function rehook() {
    'use server'; await requireAuth();
    const b = await getBot(botId); let m = 'ok=' + q('Webhook qayta o\'rnatildi.');
    try { await hookUp(botId, b!.tok, b!.webhook_secret); } catch (e: any) { m = 'err=' + q(e.message); }
    redirect(`${path}?t=settings&${m}`);
  }
  async function del() {
    'use server'; await requireAuth();
    const b = await getBot(botId); try { await tgApi(b!.tok, 'deleteWebhook'); } catch {}
    await db().from('telegram_bots').delete().eq('id', botId); revalidatePath('/', 'layout'); redirect('/telegram');
  }

  let body: any = null;
  if (tab === 'stat') {
    const r = range(sp, '30');
    const s0 = new Date(r.since + 'T00:00:00+05:00').toISOString(), s1 = new Date(r.until + 'T23:59:59+05:00').toISOString();
    const p0 = new Date(r.pSince + 'T00:00:00+05:00').toISOString();
    const { data: msgs } = await db().from('telegram_messages').select('direction,chat_id,created_at').eq('bot_id', botId).gte('created_at', p0).lte('created_at', s1).limit(20000);
    const M = msgs || [], cur = M.filter(x => x.created_at >= s0), prv = M.filter(x => x.created_at < s0);
    const users = C.filter(c => c.type === 'private'), groups = C.filter(c => c.type !== 'private');
    const newIn = (a: string, b: string) => users.filter(c => c.started_at >= a && c.started_at <= b).length;
    const nNew = newIn(s0, s1), pNew = newIn(p0, s0);
    const act = new Set(cur.filter(x => x.direction === 'in').map(x => x.chat_id)).size, pAct = new Set(prv.filter(x => x.direction === 'in').map(x => x.chat_id)).size;
    const inN = cur.filter(x => x.direction === 'in').length, outN = cur.filter(x => x.direction === 'out').length;
    const days = Array.from({ length: Math.min(r.len, 31) }, (_, i) => addDays(r.until, -i));
    const per = (d: string, dir: string) => cur.filter(x => x.direction === dir && dayOf(x.created_at) === d).length;
    const nw = (d: string) => users.filter(c => dayOf(c.started_at) === d).length;
    const mx = Math.max(1, ...days.map(d => Math.max(per(d, 'in'), per(d, 'out'))));
    body = <>
      <Range r={r} presets={[['today', 'Bugun'], ['7', '7 kun'], ['30', '30 kun'], ['90', '90 kun']]} />
      <dl className="readings">
        <Reading label="Foydalanuvchilar" v={num(users.filter(c => c.status === 'active').length)} sub={`${users.filter(c => c.status === 'blocked').length} tasi botni bloklagan`} />
        <Reading label="Davrda yangi" v={num(nNew)} cur={nNew} prev={pNew} f={num} good="up" />
        <Reading label="Faol chatlar" v={num(act)} cur={act} prev={pAct} f={num} good="up" />
        <Reading label="Kelgan xabarlar" v={num(inN)} sub={`${num(outN)} ta yuborilgan`} />
        <Reading label="Guruh va kanallar" v={num(groups.filter(c => c.status === 'active').length)} />
      </dl>
      <section className="sec" aria-labelledby="d-h"><div className="sec-h"><h2 id="d-h">Kunlar bo'yicha</h2><p><span className="bar-in" style={{ width: 12 }} /> kelgan  <span className="bar-out" style={{ width: 12 }} /> yuborilgan</p></div>
        <div className="scroll"><table className="tbl"><thead><tr><th>Sana</th><th className="r">Yangi</th><th className="r">Kelgan</th><th className="r">Yuborilgan</th><th style={{ width: '40%' }}><span className="visually-hidden">Taqqoslash</span></th></tr></thead>
          <tbody>{days.map(d => { const a = per(d, 'in'), b = per(d, 'out'); return <tr key={d}><td className="m cool">{d.slice(8)}.{d.slice(5, 7)}</td><td className="r m">{nw(d)}</td><td className="r m">{a}</td><td className="r m">{b}</td>
            <td><div className="days"><span className="bar-in" style={{ width: `${(a / mx) * 100}%` }} /><span className="bar-out" style={{ width: `${(b / mx) * 100}%` }} /></div></td></tr>; })}</tbody></table></div></section>
    </>;
  } else if (tab === 'auto') {
    body = <Autopost botId={botId} chats={C} sp={sp} />;
  } else if (tab === 'inbox') {
    const { data: msgs } = await db().from('telegram_messages').select('*').eq('bot_id', botId).order('created_at', { ascending: false }).limit(150);
    const M = msgs || [];
    body = M.length ? <div className="scroll"><table className="tbl stack"><thead><tr><th>Vaqt</th><th>Chat</th><th>Xabar</th><th><span className="visually-hidden">Javob</span></th></tr></thead>
      <tbody>{M.map(x => <tr key={x.id}><td className="m cool">{dt(x.created_at)}</td><td className={x.direction === 'in' ? 'amber' : 'muted'}>{x.direction === 'in' ? who(byId[x.chat_id]) : 'Bot'}</td>
        <td style={{ minWidth: '18rem' }}><div className={x.direction === 'in' ? 'msg-in' : 'muted'} style={{ whiteSpace: 'pre-wrap' }}>{x.text}</div></td>
        <td className="r">{x.direction === 'in' && <details className="disc"><summary className="btn btn-s">Javob</summary><form action={send} className="row"><input type="hidden" name="chat" value={x.chat_id} /><input type="hidden" name="back" value="inbox" /><input name="text" required aria-label="Javob matni" style={{ minWidth: '14rem' }} /><button type="submit" className="btn btn-s btn-p">Yuborish</button></form></details>}</td></tr>)}</tbody></table></div>
      : <div className="empty"><b>Hali xabar yo'q</b><p>Kimdir botga yozsa, xabar shu yerda chiqadi va shu yerning o'zidan javob berasiz.</p>{bot.username && <a className="btn" href={`https://t.me/${bot.username}`} target="_blank" rel="noopener">Botni ochish</a>}</div>;
  } else if (tab === 'chats') {
    const f = ['private', 'group', 'blocked'].includes(sp?.f) ? sp.f : 'all';
    const L = C.filter(c => f === 'all' || (f === 'blocked' ? c.status === 'blocked' : f === 'private' ? c.type === 'private' : c.type !== 'private'));
    body = <>
      <nav className="seg" aria-label="Turi">{[['all', 'Hammasi'], ['private', 'Foydalanuvchilar'], ['group', 'Guruh va kanallar'], ['blocked', 'Bloklaganlar']].map(([k, l]) => <a key={k} href={`?t=chats&f=${k}`} {...(f === k ? { 'aria-current': 'true' } : {})}>{l}</a>)}</nav>
      {L.length ? <div className="scroll"><table className="tbl stack"><thead><tr><th>Chat</th><th>Turi</th><th>Holat</th><th>Boshlagan</th><th>Oxirgi faollik</th><th><span className="visually-hidden">Amal</span></th></tr></thead>
        <tbody>{L.map(c => <tr key={c.chat_id}><td><b style={{ fontWeight: 500 }}>{who(c)}</b><div className="was m">{c.chat_id}</div></td><td>{TYPE[c.type] || c.type}</td>
          <td><span className={'chip ' + (c.status === 'active' ? 'chip-ok' : 'chip-bad')}>{c.status === 'active' ? 'faol' : 'bloklagan'}</span></td>
          <td className="m cool">{dt(c.started_at)}</td><td className="m cool">{dt(c.last_seen)}</td>
          <td className="r">{c.status === 'active' && <Link className="btn btn-s" href={`?t=send&chat=${c.chat_id}`}>Yozish</Link>}</td></tr>)}</tbody></table></div>
        : <div className="empty"><b>Bu ro'yxat bo'sh</b><p>Botga /start bosgan har bir foydalanuvchi, guruh va kanal shu yerda paydo bo'ladi.</p></div>}</>;
  } else if (tab === 'send') {
    const act = C.filter(c => c.status === 'active');
    const nU = act.filter(c => c.type === 'private').length, nG = act.length - nU;
    body = <div className="grid2" style={{ alignItems: 'start' }}>
      <form action={send} className="panel form"><h2>Bitta chatga</h2><input type="hidden" name="back" value="send" />
        <label className="field"><span>Chat</span><select name="chat" required defaultValue={sp?.chat || ''}><option value="">Tanlang</option>{act.map(c => <option key={c.chat_id} value={c.chat_id}>{who(c)} ({TYPE[c.type] || c.type})</option>)}</select><span className="help">Faqat botga yozgan yoki botni qo'shgan chatlar.</span></label>
        <label className="field"><span>Matn</span><textarea name="text" rows={5} required /></label>
        <div><button type="submit" className="btn btn-p">Yuborish</button></div></form>
      <form action={broadcast} className="panel form"><h2>Hammaga yuborish</h2>
        <fieldset style={{ border: 0, padding: 0, margin: 0 }}><legend className="visually-hidden">Kimga</legend><div className="choice">
          <label><input type="radio" name="aud" value="private" defaultChecked />Foydalanuvchilar<small className="m">{nU}</small></label>
          <label><input type="radio" name="aud" value="groups" />Guruh va kanallar<small className="m">{nG}</small></label>
          <label><input type="radio" name="aud" value="all" />Hammasi<small className="m">{act.length}</small></label></div></fieldset>
        <label className="field"><span>Matn</span><textarea name="text" rows={5} required /><span className="help">Bir martada taxminan 1 000 tagacha chatga yuboriladi. Bloklaganlar avtomatik belgilanadi.</span></label>
        <div><Confirm label="Hammaga yuborish" tone="plain"><button type="submit" className="btn btn-s btn-p">Ha, hammaga yuborish</button></Confirm></div></form></div>;
  } else {
    const { data: linked } = await db().from('projects').select('id,name,ig_username,tg_chat_id').eq('tg_bot_id', botId);
    let hook: any = null, herr = ''; try { hook = await tgApi(bot.tok, 'getWebhookInfo'); } catch (e: any) { herr = e.message; }
    body = <>
      <form action={saveSet} className="panel form"><h2>Bot</h2>
        <label className="field"><span>Paneldagi nomi</span><input name="name" defaultValue={bot.name} autoComplete="off" /></label>
        <label className="field"><span>/start javobi</span><textarea name="welcome" rows={4} defaultValue={bot.welcome_text || ''} placeholder="Assalomu alaykum! Xabaringizni yozing, tez orada javob beramiz." /><span className="help">Foydalanuvchi botni birinchi marta ochganda shu matn boradi.</span></label>
        <div><button type="submit" className="btn btn-p">Saqlash</button></div></form>
      <section className="panel"><div className="sec-h"><h2>Bildirishnomalar</h2></div><p className="muted">Instagram akkauntlar shu bot orqali qaysi chatga xabar yuborishi. Ulash: Instagram → akkaunt → Sozlamalar → Telegram.</p>
        {linked?.length ? <table className="tbl"><tbody>{linked.map(p => <tr key={p.id}><td>{handle(p)}</td><td className="m cool">{p.tg_chat_id || "chat yo'q"}</td><td className="r"><Link className="btn btn-s" href={`/p/${p.id}/settings`}>Sozlash</Link></td></tr>)}</tbody></table> : <p className="was">Hali hech qaysi akkaunt bu botga ulanmagan.</p>}</section>
      <section className="panel"><div className="sec-h"><h2>Webhook</h2>{hook?.url ? <span className="chip chip-ok">ishlayapti</span> : <span className="chip chip-bad">o'rnatilmagan</span>}</div>
        {herr && <p className="note note-bad">{herr}</p>}
        {hook && <dl className="readings"><div><dt>Kutilayotgan</dt><dd className="reading">{hook.pending_update_count || 0}</dd></div>{hook.last_error_message && <div><dt>Oxirgi xato</dt><dd className="bad">{hook.last_error_message}</dd></div>}</dl>}
        <form action={rehook}><button type="submit" className="btn">Qayta o'rnatish</button></form></section>
      <form action={del} className="panel form"><h2>Botni o'chirish</h2><p className="muted">Bot paneldan olib tashlanadi, chatlar va xabarlar tarixi o'chadi. Telegram'dagi botning o'zi qoladi.</p><div><Confirm label="O'chirish"><button type="submit" className="btn btn-s btn-bad">Ha, o'chirish</button></Confirm></div></form>
    </>;
  }
  return <Shell active="tg" crumbs={[{ label: 'Telegram', href: '/telegram' }, { label: bot.username ? '@' + bot.username : bot.name }]}>
    <BotTabs bot={bot} tab={tab} /><Flash sp={sp} />
    <div className="head"><div><h1>{bot.name}</h1><p>{bot.username ? <a href={`https://t.me/${bot.username}`} target="_blank" rel="noopener">t.me/{bot.username}</a> : null}</p></div></div>
    <nav className="seg" aria-label="Bo'lim">{TABS.map(([k, l]) => <a key={k} href={`?t=${k}`} {...(tab === k ? { 'aria-current': 'true' } : {})}>{l}</a>)}</nav>
    {body}
  </Shell>;
}
