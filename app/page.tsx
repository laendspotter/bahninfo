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
  const [boardMode, setBoardMode] = useState<'normal'|'sbahn'>('normal');
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
      const stations = await searchStation(query) as any[];
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

  // S-Bahn only deps
  const sbahnDeps = deps.filter(d => d.line?.product === 'suburban');

  function toggleFullscreen() {
    if (!fullscreen) { document.documentElement.requestFullscreen?.(); }
    else { document.exitFullscreen?.(); }
    setFullscreen(!fullscreen);
  }

  function getMinutesUntil(when: string | null | undefined): string {
    if (!when) return '–';
    const diff = Math.round((new Date(when).getTime() - Date.now()) / 60000);
    if (diff <= 0) return 'sofort';
    return `${diff}`;
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
        <>
          {/* Board mode switcher */}
          <div style={{display:'flex',gap:8,marginBottom:12}}>
            <button className={`bb-tab ${boardMode==='normal'?'active':''}`} onClick={()=>setBoardMode('normal')}
              style={{background: boardMode==='normal'?'#003189':'#002070',border:'1px solid #3a5adb',color:'white',padding:'6px 16px',borderRadius:4,fontSize:13,cursor:'pointer'}}>
              📋 Megaboard
            </button>
            {sbahnDeps.length > 0 && (
              <button className={`bb-tab ${boardMode==='sbahn'?'active':''}`} onClick={()=>setBoardMode('sbahn')}
                style={{background: boardMode==='sbahn'?'#003189':'#002070',border:'1px solid #3a5adb',color:'white',padding:'6px 16px',borderRadius:4,fontSize:13,cursor:'pointer'}}>
                🚇 S-Bahn Hochkant
              </button>
            )}
          </div>

          {/* NORMAL MEGABOARD */}
          {boardMode === 'normal' && (
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

                // via: nimm alle zwischenhalte außer erster und letzter
                const allStops = dep.nextStopovers || [];
                const viaStops = allStops.slice(1, -1).slice(0, 3).map((s:any) => s.stop?.name).filter(Boolean);
                const via = viaStops.join(' – ');

                const color = getLineColor(dep.line, city);

                return (
                  <div key={i} className={`bb-row ${cancelled?'cancelled':''}`}>
                    <div className="bb-time-col">
                      {cancelled ? <span className="bb-time" style={{color:'#ff6b6b'}}>{tP}</span>
                      : hasDelay ? <><span className="bb-time-old">{tP}</span><span className={`bb-time-new ${(delay||0)>5?'heavy':'slight'}`}>{tR}</span></>
                      : <span className="bb-time">{tP}</span>}
                    </div>
                    <div>
                      <span className="line-badge" style={{background:color.bg,color:color.text,border:color.bg==='#ffffff'?'1px solid #ccc':'none'}}>
                        {dep.line?.name||'?'}
                      </span>
                    </div>
                    <div className="bb-via">{via || '–'}</div>
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

          {/* S-BAHN HOCHKANT BOARD */}
          {boardMode === 'sbahn' && (
            <div style={{background:'#003189',borderRadius:8,overflow:'hidden',maxWidth:400}}>
              <div style={{padding:'14px 20px',borderBottom:'1px solid #1a4aab',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div>
                  <div style={{fontSize:11,textTransform:'uppercase',letterSpacing:'0.1em',color:'#aac0f0'}}>S-Bahn Abfahrt</div>
                  <div style={{fontSize:18,fontWeight:700,color:'white'}}>{station.name}</div>
                </div>
                <div style={{fontSize:24,fontWeight:700,fontFamily:'monospace',color:'white'}}>{clock.substring(0,5)}</div>
              </div>

              {/* header cols */}
              <div style={{display:'grid',gridTemplateColumns:'55px 1fr 36px',padding:'6px 16px',fontSize:10,textTransform:'uppercase',letterSpacing:'0.1em',color:'#aac0f0',borderBottom:'1px solid #1a4aab'}}>
                <div>Min</div><div>Linie / Ziel</div><div style={{textAlign:'right'}}>Gl.</div>
              </div>

              {sbahnDeps.slice(0,15).map((dep, i) => {
                const cancelled = dep.cancelled;
                const delay = delayMin(dep.plannedWhen, dep.when);
                const hasDelay = delay !== null && delay > 0;
                const minutesRaw = Math.round((new Date(dep.when || dep.plannedWhen).getTime() - Date.now()) / 60000);
                const minutesTxt = minutesRaw <= 0 ? 'sofort' : minutesRaw <= 1 ? '1 Min' : `${minutesRaw} Min`;
                const track = dep.platform || dep.plannedPlatform || '–';
                const color = getLineColor(dep.line, city);

                const allStops = dep.nextStopovers || [];
                const viaStops = allStops.slice(1, -1).slice(0, 2).map((s:any) => s.stop?.name).filter(Boolean);
                const via = viaStops.join(' · ');

                return (
                  <div key={i} style={{
                    display:'grid', gridTemplateColumns:'55px 1fr 36px',
                    padding:'10px 16px', borderBottom:'1px solid rgba(255,255,255,0.06)',
                    alignItems:'center', opacity: cancelled ? 0.4 : 1,
                    background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)'
                  }}>
                    {/* minuten */}
                    <div style={{fontFamily:'monospace',fontWeight:700,fontSize:15,color: hasDelay ? '#f5c518' : 'white'}}>
                      {cancelled ? <span style={{color:'#ff6b6b',fontSize:11}}>Ausfall</span> : minutesTxt}
                    </div>
                    {/* linie + ziel */}
                    <div>
                      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:2}}>
                        <span style={{
                          background:color.bg, color:color.text,
                          padding:'2px 7px', borderRadius:3,
                          fontSize:12, fontWeight:700, whiteSpace:'nowrap'
                        }}>{dep.line?.name||'?'}</span>
                        <span style={{fontSize:14,fontWeight:600,color:'white',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                          {dep.direction||'–'}
                        </span>
                      </div>
                      {via && <div style={{fontSize:11,color:'#aac0f0',paddingLeft:2}}>via {via}</div>}
                    </div>
                    {/* gleis */}
                    <div style={{textAlign:'right',fontFamily:'monospace',fontWeight:700,fontSize:16,color:'white'}}>{track}</div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
