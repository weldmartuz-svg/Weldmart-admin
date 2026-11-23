import { graph } from './s';
const RES = ['lead', 'onsite_conversion.messaging_conversation_started_7d'];
export const results = (a: any[] = []) => a.filter(x => RES.includes(x.action_type)).reduce((s, x) => s + Number(x.value || 0), 0);
export const empty = { spend: 0, impressions: 0, clicks: 0, results: 0 };
export const sum = (a: any[]) => a.reduce((s, x) => ({ spend: s.spend + x.spend, impressions: s.impressions + x.impressions, clicks: s.clicks + x.clicks, results: s.results + x.results }), { ...empty });
const tr = (since: string, until: string) => JSON.stringify({ since, until });
export async function accountStats(act: string, since: string, until: string) {
  const r = await graph(`${act}/insights`, { time_range: tr(since, until), fields: 'spend,impressions,clicks,actions' });
  const x = r.data?.[0] || {};
  return { spend: +x.spend || 0, impressions: +x.impressions || 0, clicks: +x.clicks || 0, results: results(x.actions) };
}
export async function campaigns(act: string, since: string, until: string) {
  const r = await graph(`${act}/insights`, { level: 'campaign', time_range: tr(since, until), fields: 'campaign_id,campaign_name,spend,impressions,clicks,actions', limit: '200' });
  return (r.data || []).map((x: any) => ({ id: x.campaign_id, name: x.campaign_name, spend: +x.spend || 0, impressions: +x.impressions || 0, clicks: +x.clicks || 0, results: results(x.actions) }));
}
export function grade(c: any, avgCpl: number) {
  if (!c.results) return c.spend > avgCpl * 2 && avgCpl > 0 ? { t: 'Yomon', cls: 'r', tip: "Natija yo'q — kreativ yoki auditoriyani almashtiring" } : { t: 'Kuting', cls: '', tip: "Ma'lumot hali kam" };
  const cpl = c.spend / c.results;
  if (!avgCpl || cpl <= avgCpl * 0.9) return { t: 'Yaxshi', cls: 'g', tip: 'Davom ettiring, byudjetni asta oshiring' };
  if (cpl <= avgCpl * 1.25) return { t: "O'rtacha", cls: 'w', tip: "Kuzating, kreativni sinab ko'ring" };
  return { t: 'Qimmat', cls: 'r', tip: 'Natija narxi o\'rtachadan yuqori' };
}
