export default function L() {
  return <div className="app" aria-busy="true"><aside className="side"><div className="sk" style={{ height: 28, width: '60%' }} />{[1, 2, 3, 4, 5].map(i => <div key={i} className="sk" style={{ height: 32 }} />)}</aside>
    <div className="main"><div className="bar" /><div className="page"><div className="sk" style={{ height: 36, width: '40%' }} /><div className="sk" style={{ height: 96 }} /><div className="sk" style={{ height: 240 }} /><span className="visually-hidden">Yuklanmoqda</span></div></div></div>;
}
