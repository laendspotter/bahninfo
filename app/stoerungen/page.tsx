'use client';
import { useState, useEffect } from 'react';
import { getDepartures } from '@/lib/api';
import { detectCity, getLineColor } from '@/lib/colors';

const STATIONS = [
  {id:'8000096',name:'Stuttgart Hbf',city:'stuttgart'},
  {id:'8000105',name:'Frankfurt Hbf',city:'frankfurt'},
  {id:'8011160',name:'Berlin Hbf',city:'berlin'},
  {id:'8000261',name:'München Hbf',city:'munich'},
  {id:'8000147',name:'Hamburg Hbf',city:'hamburg'},
];

export default function Stoerungen() {
  const [warnings, setWarnings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updated, setUpdated] = useState('');

  async function load() {
    setLoading(true);
    const map = new Map<string,any>();
    await Promise.all(STATIONS.map(async st => {
      try {
        const deps = await getDepartures(st.id, 40, 60);
        for (const dep of deps) {
          for (const r of dep.remarks||[]) {
            if (r.type!=='warning' && r.type!=='status') continue;
            const key = (r.text||'').substring(0,80);
            if (!map.has(key)) map.set(key, {...r, lines:[], stations:[]});
            const w = map.get(key);
            if (dep.line?.name && !w.lines.find((l:any)=>l.name===dep.line.name))
              w.lines.push({...dep.line, city:st.city});
            if (!w.stations.includes(st.name)) w.stations.push(st.name);
          }
        }
      } catch {}
    }));
    setWarnings([...map.values()]);
    setUpdated(new Date().toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'}));
    setLoading(false);
  }

  useEffect(() => { load(); const t = setInterval(load, 60000); return ()=>clearInterval(t); }, []);

  return (
    <div className="container">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
        <div>
          <div style={{fontSize:20,fontWeight:700}}>Aktive Störungen</div>
          <div style={{fontSize:12,color:'var(--muted)',marginTop:4}}>
            <span className="live-dot" style={{marginRight:6}}/>Aktualisiert {updated} · alle 60s
          </div>
        </div>
        <button className="btn" onClick={load}>Aktualisieren</button>
      </div>

      {loading && <div className="spinner"><div className="spin"/><span>Störungen laden…</span></div>}

      {!loading && warnings.length===0 && (
        <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderLeft:'3px solid var(--green)',borderRadius:8,padding:36,textAlign:'center'}}>
          <div style={{fontSize:32,marginBottom:10}}>✅</div>
          <div style={{fontFamily:'monospace',color:'#56d364',fontWeight:600}}>Keine aktiven Störungen</div>
        </div>
      )}

      {!loading && warnings.map((w,i) => (
        <div key={i} className="dis-card">
          <div className="dis-head">
            <span className="dis-title">{w.summary||'Betriebsstörung'}</span>
            <span className="dis-where">{w.stations?.join(', ')}</span>
          </div>
          {w.lines?.length>0 && (
            <div className="dis-lines">
              {w.lines.slice(0,10).map((l:any,j:number) => {
                const c = getLineColor(l, l.city||'default');
                return <span key={j} className="line-badge" style={{background:c.bg,color:c.text}}>{l.name}</span>;
              })}
            </div>
          )}
          <div className="dis-text">{w.text}</div>
        </div>
      ))}
    </div>
  );
}
