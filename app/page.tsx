'use client';
import { useState, useEffect, useRef } from 'react';
import { searchStation, getDepartures, fmt, delayMin } from '@/lib/api';
import { detectCity, getLineColor, HIDDEN_PRODUCTS } from '@/lib/colors';

type FontMode = 'default' | 'dbtype' | 'bahnschrift';

function isRelevantStop(stop: any): boolean {
  const id = stop?.stop?.id || '';
  const num = parseInt(id.replace(/\D/g, ''), 10);

  const whitelist = new Set([
    '8000047','8000237','8003368','8000183','8000191',
    '8000156','8005017','8000170','8000198','8000107',
    '8000232','8000195','8000249','8003200','8000031',
    '8000055','8000244','8000105','8000096','8000261',
    '8011160','8000147','8000260','8000085','8000152',
    '8000128','8000068','8000050','8000078','8000025',
  ]);

  if (whitelist.has(id)) return true;
  if (!isNaN(num) && num < 8001000) return true;
  return false;
}

const FONT_MAP: Record<FontMode, string> = {
  default: '"Helvetica Neue", Arial, sans-serif',
  dbtype: '"DB Type", "Helvetica Neue", Arial, sans-serif',
  bahnschrift: '"Bahnschrift", "DB Type", Arial, sans-serif',
};

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
  const [fontMode, setFontMode] = useState<FontMode>('dbtype');
  const refreshRef = useRef<any>(null);

  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString('de-DE', {hour:'2-digit',minute:'2-digit',second:'2-digit'}));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    document.body.style.fontFamily = FONT_MAP[fontMode];
  }, [fontMode]);

  useEffect(() => {
    const handler = () => {
      if (!document.fullscreenElement) setFullscreen(false);
    };
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
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

  const sbahnDeps = deps.filter(d => d.line?.product === 'suburban');

  function toggleFullscreen() {
    if (!fullscreen) {
      document.documentElement.requestFullscreen?.();
      setFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setFullscreen(false);
    }
  }

  const exitBtn = (
    <button onClick={toggleFullscreen} style={{
      background:'rgba(255,255,255,0.15)',border:'none',color:'white',
      padding:'6px 12px',borderRadius:4,cursor:'pointer',fontSize:16
    }}>✕</button>
  );

  const fsBtn = (
    <button className="btn-outline" onClick={toggleFullscreen} title="Vollbild">⛶</button>
  );

  const fontToggle = (
    <div style={{display:'flex',gap:4}}>
      {(['default','dbtype','bahnschrift'] as FontMode[]).map(f => (
        <button key={f} onClick={() => setFontMode(f)} style={{
          background: fontMode===f ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)',
          border:'1px solid rgba(255,255,255,0.2)',color:'white',
          padding:'4px 10px',borderRadius:4,cursor:'pointer',fontSize:11,
          fontFamily: FONT_MAP[f],
        }}>
          {f==='default'?'Helvetica':f==='dbtype'?'DB Type':'Bahnschrift'}
        </button>
      ))}
    </div>
  );

  const normalBoard = (
    <div className="bigboard" style={fullscreen ? {flex:1,borderRadius:0,overflow:'auto'} : {}}>
      <div className="bb-header">
        <div>
          <div className="bb-label">Abfahrt Departure</div>
          <div className="bb-station">{station?.name}</div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          {fontToggle}
          {fullscreen ? exitBtn : fsBtn}
          <div className="bb-clock">{clock}</div>
        </div>
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

      {filtered.slice(0, fullscreen ? 999 : 35).map((dep, i) => {
        const cancelled = dep.cancelled;
        const delay = delayMin(dep.plannedWhen, dep.when);
        const hasDelay = delay !== null && delay > 0;
        const tP = fmt(dep.plannedWhen);
        const tR = dep.when ? fmt(dep.when) : null;
        const track = dep.platform || dep.plannedPlatform || '–';
        const trackChanged = dep.platform && dep.platform !== dep.plannedPlatform;
        const allStops = dep.nextStopovers || [];
        const viaStops = allStops
          .slice(1, -1)
          .filter((s: any) => isRelevantStop(s))
          .slice(0, 4)
          .map((s: any) => s.stop?.name)
          .filter(Boolean);
        const via = viaStops.join(' – ');
        const color = getLineColor(dep.line, city);

        return (
          <div key={i} className={`bb-row ${cancelled?'cancelled':''}`}>
            <div className="bb-time-col">
              {cancelled
                ? <span className="bb-time" style={{color:'#ff6b6b'}}>{tP}</span>
                : hasDelay
                  ? <><span className="bb-time-old">{tP}</span><span className={`bb-time-new ${(delay||0)>5?'heavy':'slight'}`}>{tR}</span></>
                  : <span className="bb-time">{tP}</span>}
            </div>
            <div>
              <span className="line-badge" style={{
                background:color.bg, color:color.text,
                border:color.bg==='#ffffff'?'1px solid #ccc':'none'
              }}>
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
  );

  const sbahnBoard = (
    <div style={{
      background:'#003189',
      borderRadius: fullscreen ? 0 : 8,
      overflow: fullscreen ? 'auto' : 'hidden',
      maxWidth: fullscreen ? '100%' : 400,
      width: fullscreen ? '100%' : undefined,
      flex: fullscreen ? 1 : undefined,
    }}>
      <div style={{padding:'14px 20px',borderBottom:'1px solid #1a4aab',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div>
          <div style={{fontSize:11,textTransform:'uppercase',letterSpacing:'0.1em',color:'#aac0f0'}}>S-Bahn Abfahrt</div>
          <div style={{fontSize:18,fontWeight:700,color:'white'}}>{station?.name}</div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          {fontToggle}
          {fullscreen ? exitBtn : fsBtn}
          <div style={{fontSize:24,fontWeight:700,fontFamily:'monospace',color:'white'}}>{clock.substring(0,5)}</div>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'55px 1fr 36px',padding:'6px 16px',fontSize:10,textTransform:'uppercase',letterSpacing:'0.1em',color:'#aac0f0',borderBottom:'1px solid #1a4aab'}}>
        <div>Min</div><div>Linie / Ziel</div><div style={{textAlign:'right'}}>Gl.</div>
      </div>

      {sbahnDeps.slice(0, fullscreen ? 999 : 15).map((dep, i) => {
        const cancelled = dep.cancelled;
        const delay = delayMin(dep.plannedWhen, dep.when);
        const hasDelay = delay !== null && delay > 0;
        const minutesRaw = Math.round((new Date(dep.when || dep.plannedWhen).getTime() - Date.now()) / 60000);
        const minutesTxt = minutesRaw <= 0 ? 'sofort' : minutesRaw <= 1 ? '1 Min' : `${minutesRaw} Min`;
        const track = dep.platform || dep.plannedPlatform || '–';
        const color = getLineColor(dep.line, city);
        const allStops = dep.nextStopovers || [];
        const viaStops = allStops
          .slice(1, -1)
          .filter((s: any) => isRelevantStop(s))
          .slice(0, 3)
          .map((s: any) => s.stop?.name)
          .filter(Boolean);
        const via = viaStops.join(' · ');

        return (
          <div key={i} style={{
            display:'grid', gridTemplateColumns:'55px 1fr 36px',
            padding:'10px 16px', borderBottom:'1px solid rgba(255,255,255,0.06)',
            alignItems:'center', opacity: cancelled ? 0.4 : 1,
            background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)'
          }}>
            <div style={{fontFamily:'monospace',fontWeight:700,fontSize:15,color: hasDelay ? '#f5c518' : 'white'}}>
              {cancelled ? <span style={{color:'#ff6b6b',fontSize:11}}>Ausfall</span> : minutesTxt}
            </div>
            <div>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:2}}>
                <span style={{background:color.bg,color:color.text,padding:'2px 7px',borderRadius:3,fontSize:12,fontWeight:700,whiteSpace:'nowrap'}}>
                  {dep.line?.name||'?'}
                </span>
                <span style={{fontSize:14,fontWeight:600,color:'white',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                  {dep.direction||'–'}
                </span>
              </div>
              {via && <div style={{fontSize:11,color:'#aac0f0',paddingLeft:2}}>via {via}</div>}
            </div>
            <div style={{textAlign:'right',fontFamily:'monospace',fontWeight:700,fontSize:16,color:'white'}}>{track}</div>
          </div>
        );
      })}
    </div>
  );

  return (
    <>
      {fullscreen && (
        <div style={{
          position:'fixed', inset:0, zIndex:200,
          background:'#003189',
          display:'flex', flexDirection:'column',
          overflow:'hidden',
        }}>
          {boardMode === 'normal' ? normalBoard : sbahnBoard}
        </div>
      )}

      {!fullscreen && (
        <div className="container">
          <div className="search-bar">
            <input className="search-input" value={query} onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key==='Enter' && load()}
              placeholder="Bahnhof eingeben… z.B. Stuttgart Hbf, Freudenstadt" />
            <button className="btn" onClick={load}>Laden</button>
          </div>

          {loading && <div className="spinner"><div className="spin"/><span>Laden…</span></div>}
          {error   && <div className="error-box">{error}</div>}

          {station && !loading && (
            <>
              <div style={{display:'flex',gap:8,marginBottom:12}}>
                <button onClick={()=>setBoardMode('normal')} style={{
                  background: boardMode==='normal'?'#003189':'#002070',
                  border:'1px solid #3a5adb',color:'white',
                  padding:'6px 16px',borderRadius:4,fontSize:13,cursor:'pointer'
                }}>📋 Megaboard</button>
                {sbahnDeps.length > 0 && (
                  <button onClick={()=>setBoardMode('sbahn')} style={{
                    background: boardMode==='sbahn'?'#003189':'#002070',
                    border:'1px solid #3a5adb',color:'white',
                    padding:'6px 16px',borderRadius:4,fontSize:13,cursor:'pointer'
                  }}>🚇 S-Bahn Hochkant</button>
                )}
              </div>

              {boardMode === 'normal' && normalBoard}
              {boardMode === 'sbahn' && (
                <div style={{display:'flex',justifyContent:'center'}}>
                  {sbahnBoard}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}
