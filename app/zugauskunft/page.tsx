'use client';
import { useState } from 'react';
import { searchTrips, getTripDetails, getDepartures, fmt, delayMin } from '@/lib/api';
import { detectCity, getLineColor } from '@/lib/colors';

export default function Zugauskunft() {
  const [query, setQuery] = useState('');
  const [trip, setTrip] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    if (!query.trim()) return;
    setLoading(true); setError(''); setTrip(null);
    try {
      let trips = await searchTrips(query);
      if (!trips.length) {
        const nr = query.match(/\d+/)?.[0];
        if (nr) {
          const deps = await getDepartures('8000096', 200, 180);
          const found = deps.find((d:any) =>
            d.line?.fahrtNr === nr ||
            d.line?.name?.replace(/\s/g,'').toLowerCase() === query.replace(/\s/g,'').toLowerCase()
          );
          if (found?.tripId) trips = [{ id: found.tripId }];
        }
      }
      if (!trips.length) { setError('Zug nicht gefunden'); setLoading(false); return; }
      const t = await getTripDetails(trips[0].id);
      setTrip(t);
    } catch(e:any) { setError(e.message); }
    setLoading(false);
  }

  const line = trip?.line;
  const stopovers = trip?.stopovers || [];
  const origin = stopovers[0];
  const dest = stopovers[stopovers.length-1];
  const city = detectCity(origin?.stop?.id||'', origin?.stop?.name||'');
  const color = line ? getLineColor(line, city) : {bg:'#444',text:'#fff'};
  const now = new Date();

  return (
    <div className="container">
      <div className="search-bar">
        <input className="search-input" value={query} onChange={e=>setQuery(e.target.value)}
          onKeyDown={e=>e.key==='Enter'&&load()}
          placeholder="Zugnummer, z.B. ICE 599, RE 19022…" />
        <button className="btn" onClick={load}>Suchen</button>
      </div>

      {loading && <div className="spinner"><div className="spin"/><span>Suchen…</span></div>}
      {error   && <div className="error-box">{error}</div>}

      {trip && !loading && (
        <>
          <div className="journey-card">
            <div className="journey-head">
              <div>
                <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6}}>
                  <span className="line-badge" style={{background:color.bg,color:color.text}}>{line?.name||'?'}</span>
                  <span className="journey-name">{line?.name||query}</span>
                </div>
                <div className="journey-meta">
                  {[line?.operator?.name, line?.product?.toUpperCase(), line?.fahrtNr ? `Nr. ${line.fahrtNr}` : null].filter(Boolean).join(' · ')}
                </div>
              </div>
            </div>
            <div className="info-grid">
              {[
                {label:'Von', val:origin?.stop?.name||'–', sub:fmt(origin?.plannedDeparture)},
                {label:'Nach', val:dest?.stop?.name||'–', sub:fmt(dest?.plannedArrival)},
                {label:'Halte', val:String(stopovers.length)},
                {label:'Produkt', val:line?.product?.toUpperCase()||'–'},
              ].map(c=>(
                <div key={c.label} className="info-cell">
                  <div className="cell-label">{c.label}</div>
                  <div className="cell-val">{c.val}</div>
                  {c.sub && <div className="cell-sub">{c.sub}</div>}
                </div>
              ))}
            </div>
          </div>

          <div className="section-label">Fahrtweg · {stopovers.length} Halte</div>
          <div className="journey-card">
            <div className="stops-header">
              <div>Plan</div><div>Real</div><div>Halt</div><div style={{textAlign:'right'}}>Gl.</div>
            </div>
            {stopovers.map((s:any, i:number) => {
              const tP = s.plannedDeparture||s.plannedArrival;
              const tR = s.departure||s.arrival;
              const d = delayMin(tP, tR);
              const past = tR ? new Date(tR)<now : tP ? new Date(tP)<now : false;
              let realClass = '';
              if (d!==null && d>5) realClass='very-late';
              else if (d!==null && d>0) realClass='late';
              return (
                <div key={i} className={`stop-row ${past?'past':''} ${s.cancelled?'past':''}`}>
                  <span className="stop-plan">{fmt(tP)}</span>
                  <span className={`stop-real ${realClass}`}>{tR&&tR!==tP?fmt(tR):''}</span>
                  <span>{s.stop?.name||'?'}</span>
                  <span className="stop-track">{s.platform||s.plannedPlatform||'–'}</span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
