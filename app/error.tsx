'use client';
export default function E({ error, reset }: { error: Error; reset: () => void }) {
  return <main className="page"><div className="empty"><b>Sahifani ochib bo'lmadi</b><p>{error.message || "Server javob bermadi."} Bir oz kutib qayta urinib ko'ring. Xato takrorlansa, Sozlamalar sahifasida Meta token va ulanishlarni tekshiring.</p>
    <div className="row"><button type="button" className="btn btn-p" onClick={reset}>Qayta urinish</button><a className="btn" href="/">Bosh sahifa</a></div></div></main>;
}
