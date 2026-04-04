'use client';
import { useState, useEffect } from 'react';
import { getLineColor } from '@/lib/colors';

export default function Stoerungen() {
  const [warnings, setWarnings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updated, setUpdated] = useState('');

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/proxy/remarks?type=warning&language=de');
      const data = await res.json();
      const remarks = (data.remarks || data || []) as any[];

      // deduplizieren nach text
      const map = new Map<string, any>();
      for (const r of remarks) {
        if (!r.text && !r.summary) continue;
        const key = (r.text || '').substring(0, 80);
        if (!map.has(key)) {
          map.set(key, {
            ...r,
            lines: r.lines || [],
          });
        }
      }

      setWarnings([...map.values()]);
      setUpdated(new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }));
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>Aktive Störungen</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
            <span className="live-dot" style={{ marginRight: 6 }} />
            Aktualisiert {updated} · alle 60s
          </div>
        </div>
        <button className="btn" onClick={load}>Aktualisieren</button>
      </div>

      {loading && <div className="spinner"><div className="spin" /><span>Störungen laden…</span></div>}

      {!loading && warnings.length === 0 && (
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderLeft: '3px solid var(--green)', borderRadius: 8,
          padding: 36, textAlign: 'center'
        }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>✅</div>
          <div style={{ fontFamily: 'monospace', color: '#56d364', fontWeight: 600 }}>Keine aktiven Störungen</div>
        </div>
      )}

      {!loading && warnings.map((w, i) => {
        const lines = w.lines || [];
        return (
          <div key={i} className="dis-card">
            <div className="dis-head">
              <span className="dis-title">{w.summary || w.code || 'Betriebsstörung'}</span>
              {w.validFrom && (
                <span className="dis-where">
                  {new Date(w.validFrom).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  {w.validUntil ? ` – ${new Date(w.validUntil).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}` : ''}
                </span>
              )}
            </div>
            {lines.length > 0 && (
              <div className="dis-lines">
                {lines.slice(0, 10).map((l: any, j: number) => {
                  const c = getLineColor(l, 'default');
                  return (
                    <span key={j} className="line-badge" style={{ background: c.bg, color: c.text }}>
                      {l.name}
                    </span>
                  );
                })}
              </div>
            )}
            <div className="dis-text">{w.text}</div>
          </div>
        );
      })}
    </div>
  );
}
