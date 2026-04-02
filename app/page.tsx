'use client';
import { useState, useEffect, useRef } from 'react';
import { searchStation, getDepartures, fmt, delayMin } from '@/lib/api';
import { detectCity, getLineColor, HIDDEN_PRODUCTS } from '@/lib/colors';

export default function Boards() {
  const [query, setQuery] = useState('');
  const [station, setStation] = useState<any>(null);
  const [deps, setDeps] = useState<any[]>([]);
  const [level, setLevel] = useState<'all'|'top'|'deep'>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [clock, setClock] = useState('');
  const [fullscreen, setFullscreen] = useState(false);
  const refreshRef = useRef<any>(null);

  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString('de-DE', {hour:'2-digit',minute:'2-digit',second:'2-digit'}));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  async function load() {
    if (!query.trim()) return;
    setLoading(true); setError('');
    try {
      const stations = await searchStation(query);
      if (!stations.length) { setError('Bahnhof nicht gefunden'); setLoading(false); return; }
      const st = stations[0];
      setStation(st);
      await fetchDeps(st.id);
      if (refreshRef.current) clearInterval(refreshRef.current);
      refreshRef.current = setInterval(() => fetchDeps(st.id), 30000);
    } catch(e: any) { setError(e.message); }
    setLoading(false);
  }

  async function fetchDeps(id: string) {
    const d = await getDepartures(id, 80, 120);
    setDeps(d.filter((dep: any) => !HIDDEN_PRODUCTS.has(dep.line?.product)));
  }

  const city = station ? detectCity(station.id, station.name) : 'default';
  const hasTop  = deps.some(d => { const n=parseInt(d.plannedPlatform||d.platform||''); return n>=1 && n<100; });
  const hasDeep = deps.some(d => { const n=parseInt(d.plannedPlatform||d.platform||''); return n>=100; });
  const hasBoth = hasTop && hasDeep;

  const filtered = deps.filter(d => {
    if (level === 'all') return true;
    const n = parseInt(d.plannedPlatform || d.platform || '');
    if (level === 'top')  return n >= 1 && n < 100;
    if (level === 'deep') return n >= 100;
    return true;
  });

  function toggleFullscreen() {
    if (!fullscreen) { document.documentElement.requestFullscreen?.(); }
    else { document.exitFullscreen?.(); }
    setFullscreen(!fullscreen);
  }

  return (
    <div className="container" style={fullscreen ? {maxWidth:'100%',padding:0} : {}}>
      {!fullscreen && (
        <div className="search-bar">
          <input className="search-input" value={query} onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key==='Enter' && load()}
            placeholder="Bahnhof eingeben… z.B. Stuttgart Hbf, Freudenstadt" />
          <button className="btn" onClick={load}>Laden</button>
          {station && <button className="btn-outline" onClick={toggleFullscreen} title="Vollbild">⛶</button>}
        </div>
      )}
      {fullscreen && station && (
        <button onClick={toggleFullscreen} style={{position:'fixed',top:10,right:10,zIndex:999,background:'rgba(0,0,0,0.5)',border:'none',color:'white',padding:'8px 12px',borderRadius:4,cursor:'pointer'}}>✕</button>
      )}

      {loading && <div className="spinner"><div className="spin"/><span>Laden…</span></div>}
      {error   && <div className="error-box">{error}</div>}

      {station && !loading && (
        <div className="bigboard">
          <div className="bb-header">
            <div>
              <div className="bb-label">Abfahrt Departure</div>
              <div className="bb-station">{station.name}</div>
            </div>
            <div className="bb-clock">{clock}</div>
          </div>

          {hasBoth && (
            <div className="bb-tabs">
              {(['all','top','deep'] as const).map(l => (
                <button key={l} className={`bb-tab ${level===l?'active':''}`} onClick={() => setLevel(l)}>
                  {l==='all'?'Alle Gleise': l==='top'?'🔝 Kopfbahnhof':'🔽 Tief'}
                </button>
              ))}
            </div>
          )}

          <div className="bb-cols">
            <div>Zeit</div><div>Zug</div><div>Über / Via</div>
            <div>Ziel / Destination</div><div className="bb-col-track-h">Gleis</div>
          </div>

          {filtered.slice(0,35).map((dep, i) => {
            const cancelled = dep.cancelled;
            const delay = delayMin(dep.plannedWhen, dep.when);
            const hasDelay = delay !== null && delay > 0;
            const tP = fmt(dep.plannedWhen);
            const tR = dep.when ? fmt(dep.when) : null;
            const track = dep.platform || dep.plannedPlatform || '–';
            const trackChanged = dep.platform && dep.platform !== dep.plannedPlatform;
            const via = dep.nextStopovers?.slice(1,5).map((s:any) => s.stop?.name).filter(Boolean).join(' – ') || '';
            const color = getLineColor(dep.line, city);

            return (
              <div key={i} className={`bb-row ${cancelled?'cancelled':''}`}>
                <div className="bb-time-col">
                  {cancelled ? <span className="bb-time" style={{color:'#ff6b6b'}}>{tP}</span>
                  : hasDelay ? <><span className="bb-time-old">{tP}</span><span className={`bb-time-new ${(delay||0)>5?'heavy':'slight'}`}>{tR}</span></>
                  : <span className="bb-time">{tP}</span>}
                </div>
                <div>
                  <span className="line-badge" style={{background:color.bg,color:color.text}}>
                    {dep.line?.name||'?'}
                  </span>
                </div>
                <div className="bb-via">{via}</div>
                <div className="bb-dest">
                  {dep.direction||'–'}
                  {cancelled && <span className="bb-ausfall">Zug fällt aus</span>}
                </div>
                <div className={`bb-track ${trackChanged?'changed':''}`}>{track}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
