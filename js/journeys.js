async function loadJourney() {
  const raw = document.getElementById('journeys-input').value.trim();
  if (!raw) return;
  const el = document.getElementById('journeys-result');
  showLoading(el, 'Zug suchen…');

  try {
    let trips = await searchTrips(raw);
    let trip = null;

    if (trips.length) {
      trip = await getTrip(trips[0].id);
    } else {
      showLoading(el, 'Suche über Stuttgart Hbf…');
      const deps = await getDepartures('8000096', { results: 200, duration: 120 });
      const nr = raw.match(/\d+/)?.[0];
      const found = deps.find(d =>
        d.line?.fahrtNr === nr ||
        (d.line?.name || '').replace(/\s/g, '').toLowerCase() === raw.replace(/\s/g, '').toLowerCase()
      );
      if (!found) {
        showError(el, `Zug "${raw}" nicht gefunden.`);
        return;
      }
      trip = await getTrip(found.tripId);
    }

    renderJourney(trip, el);
  } catch (e) {
    showError(el, 'Fehler: ' + e.message);
  }
}

function renderJourney(trip, el) {
  const line = trip.line;
  const stops = trip.stopovers || [];
  const origin = stops[0];
  const dest   = stops[stops.length - 1];

  const depDelay = calcDelay(origin?.plannedDeparture, origin?.departure);

  let html = `
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
        <div style="display:flex;align-items:center;gap:12px">
          ${linePill(line)}
          <div>
            <div style="font-family:var(--mono);font-size:17px;font-weight:600">${line?.name || '–'}</div>
            <div style="font-family:var(--mono);font-size:11px;color:var(--muted);margin-top:2px">
              ${line?.operator?.name || ''} · Fahrt ${line?.fahrtNr || ''}
            </div>
          </div>
        </div>
        ${delayBadge(depDelay)}
      </div>
      <div class="journey-grid">
        <div class="info-box">
          <div class="info-label">Von</div>
          <div class="info-val" style="font-size:13px">${origin?.stop?.name || '–'}</div>
          <div style="font-family:var(--mono);font-size:13px;color:var(--muted)">${fmtTime(origin?.plannedDeparture)}</div>
          ${origin?.departure && origin.departure !== origin.plannedDeparture
            ? `<div style="font-family:var(--mono);font-size:13px;color:var(--slight-delay)">${fmtTime(origin.departure)}</div>` : ''}
        </div>
        <div class="info-box">
          <div class="info-label">Nach</div>
          <div class="info-val" style="font-size:13px">${dest?.stop?.name || '–'}</div>
          <div style="font-family:var(--mono);font-size:13px;color:var(--muted)">${fmtTime(dest?.plannedArrival)}</div>
          ${dest?.arrival && dest.arrival !== dest.plannedArrival
            ? `<div style="font-family:var(--mono);font-size:13px;color:var(--slight-delay)">${fmtTime(dest.arrival)}</div>` : ''}
        </div>
        <div class="info-box"><div class="info-label">Halte</div><div class="info-val">${stops.length}</div></div>
        <div class="info-box"><div class="info-label">Produkt</div><div class="info-val">${(line?.product || '–').toUpperCase()}</div></div>
      </div>
    </div>
    <div class="section-title">Fahrtweg · alle Halte</div>
    <div class="card" style="padding:0;overflow:hidden">
      <div class="stop-row" style="padding:6px 20px;background:var(--db-blue);font-size:10px;text-transform:uppercase;letter-spacing:0.1em;color:var(--muted)">
        <span>Plan</span><span>Real</span><span>Halt</span><span style="text-align:right">Gl.</span>
      </div>
  `;

  for (const s of stops) {
    const planned = s.plannedDeparture || s.plannedArrival;
    const real    = s.departure || s.arrival;
    const d       = calcDelay(planned, real);
    let realClass = d > 5 ? 'heavy' : d > 0 ? 'slight' : '';
    const track = s.platform || s.plannedPlatform || '–';
    const trackChanged = s.platform && s.platform !== s.plannedPlatform;

    html += `
      <div class="stop-row" style="padding:6px 20px;${s.cancelled ? 'opacity:0.5;' : ''}">
        <span class="stop-plan">${fmtTime(planned)}</span>
        <span class="stop-real ${realClass}">${real && real !== planned ? fmtTime(real) : ''}</span>
        <span>${s.stop?.name || '?'}</span>
        <span class="stop-track-sm ${trackChanged ? 'track-changed' : ''}">${track}</span>
      </div>`;
  }

  html += `</div>`;
  el.innerHTML = html;
}
