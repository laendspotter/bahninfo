const MAJOR_STATIONS = [
  { id: '8000096', name: 'Stuttgart Hbf' },
  { id: '8000105', name: 'Frankfurt Hbf' },
  { id: '8011160', name: 'Berlin Hbf' },
  { id: '8000261', name: 'München Hbf' },
  { id: '8000207', name: 'Hamburg Hbf' },
  { id: '8000080', name: 'Düsseldorf Hbf' },
  { id: '8000152', name: 'Hannover Hbf' },
];

async function loadDisruptions() {
  const el = document.getElementById('disruptions-result');
  showLoading(el, 'Störungen laden…');

  try {
    const allWarnings = new Map();

    await Promise.all(MAJOR_STATIONS.map(async (st) => {
      try {
        const deps = await getDepartures(st.id, { results: 30, duration: 60 });
        for (const dep of deps) {
          for (const r of dep.remarks || []) {
            if (r.type === 'warning' || r.type === 'status') {
              const key = (r.text || '').substring(0, 60);
              if (!allWarnings.has(key)) {
                allWarnings.set(key, { ...r, lines: new Set(), stations: new Set() });
              }
              const w = allWarnings.get(key);
              if (dep.line?.name) w.lines.add(dep.line.name);
              w.stations.add(st.name);
            }
          }
        }
      } catch {}
    }));

    if (!allWarnings.size) {
      el.innerHTML = `
        <div class="card" style="border-color:var(--on-time);border-left:3px solid var(--on-time);text-align:center;padding:40px">
          <div style="font-size:28px;margin-bottom:10px">✅</div>
          <div style="font-family:var(--mono);font-size:14px;color:var(--on-time)">Keine aktiven Störungen</div>
          <div style="font-family:var(--mono);font-size:11px;color:var(--muted);margin-top:4px">Alle geprüften Strecken ohne Meldungen</div>
        </div>`;
      return;
    }

    let html = `<div class="section-title">${allWarnings.size} aktive Störung${allWarnings.size !== 1 ? 'en' : ''}</div>`;

    for (const [, w] of allWarnings) {
      const lines    = [...w.lines].slice(0, 10);
      const stations = [...w.stations].join(', ');

      html += `
        <div class="disruption-card">
          <div class="disruption-title">${w.summary || 'Betriebsstörung'}</div>
          ${lines.length ? `<div class="disruption-lines">${lines.map(l => `<span class="line-pill" style="background:#EC001625;color:#ff9999;border:1px solid #EC001650">${l}</span>`).join('')}</div>` : ''}
          <div class="disruption-text">${w.text || ''}</div>
          <div class="disruption-meta">
            ${stations}
            ${w.validFrom ? ' · ab ' + new Date(w.validFrom).toLocaleString('de-DE', {day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}) : ''}
            ${w.validUntil ? ' · bis ' + new Date(w.validUntil).toLocaleString('de-DE', {day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}) : ''}
          </div>
        </div>`;
    }

    el.innerHTML = html;
  } catch (e) {
    showError(el, 'Fehler: ' + e.message);
  }
}
