let currentDeps = [];
let currentLevel = 'all'; // 'all' | 'high' | 'low'
let clockInterval = null;
let refreshInterval = null;

function startClock() {
  if (clockInterval) clearInterval(clockInterval);
  const el = document.getElementById('board-clock');
  if (!el) return;
  const tick = () => {
    el.textContent = new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };
  tick();
  clockInterval = setInterval(tick, 1000);
}

async function loadBoards() {
  const query = document.getElementById('boards-input').value.trim();
  if (!query) return;
  const el = document.getElementById('boards-result');
  showLoading(el, 'Bahnhof suchen…');

  try {
    const stations = await searchStation(query);
    if (!stations.length) { showError(el, 'Bahnhof nicht gefunden'); return; }
    const station = stations[0];

    showLoading(el, 'Abfahrten laden…');
    const deps = await getDepartures(station.id, { results: 80, duration: 90 });

    currentDeps = deps;
    renderBoards(station, deps);

    if (refreshInterval) clearInterval(refreshInterval);
    refreshInterval = setInterval(async () => {
      const fresh = await getDepartures(station.id, { results: 80, duration: 90 });
      currentDeps = fresh;
      renderBoards(station, fresh);
    }, 30000);

  } catch (e) {
    showError(el, 'Fehler: ' + e.message);
  }
}

function renderBoards(station, deps) {
  const el = document.getElementById('boards-result');
  const levels = detectLevels(deps);

  // Level-Filter
  let filtered = deps;
  if (currentLevel === 'high') filtered = deps.filter(d => {
    const n = parseInt(d.plannedPlatform || d.platform || '0');
    return !isNaN(n) && n >= 1 && n <= 50;
  });
  if (currentLevel === 'low') filtered = deps.filter(d => {
    const n = parseInt(d.plannedPlatform || d.platform || '0');
    return !isNaN(n) && n >= 100;
  });

  let html = `
    <div class="board-container">
      <div class="board-station-header">
        <div>
          <div class="board-station-name">${station.name}</div>
          <div style="font-family:var(--mono);font-size:11px;color:#aabbdd;margin-top:2px">
            <span class="live-dot"></span>Echtzeit
          </div>
        </div>
        <div class="board-clock" id="board-clock"></div>
      </div>
  `;

  // Level-Tabs nur wenn beide vorhanden
  if (levels.hasBoth) {
    html += `
      <div class="board-level-tabs">
        <button class="btn-ghost ${currentLevel === 'all'  ? 'active' : ''}" onclick="setLevel('all')">Alle Gleise</button>
        <button class="btn-ghost ${currentLevel === 'high' ? 'active' : ''}" onclick="setLevel('high')">Kopfbahnhof (1–16)</button>
        <button class="btn-ghost ${currentLevel === 'low'  ? 'active' : ''}" onclick="setLevel('low')">S-Bahn tief (101–102)</button>
      </div>
    `;
  }

  html += `
    <div class="board-col-headers">
      <div>Abfahrt</div>
      <div>Linie</div>
      <div>Ziel / Via</div>
      <div style="text-align:center">Gleis</div>
      <div style="text-align:right">Status</div>
    </div>
  `;

  if (!filtered.length) {
    html += `<div class="empty">Keine Abfahrten</div>`;
  } else {
    for (const dep of filtered.slice(0, 40)) {
      const delay = calcDelay(dep.plannedWhen, dep.when);
      const cancelled = dep.cancelled;
      const color = getLineColor(dep.line);

      const plannedStr = fmtTime(dep.plannedWhen);
      const realStr    = dep.when ? fmtTime(dep.when) : null;
      const hasDelay   = delay !== null && delay > 0;

      let delayClass = '';
      if (delay !== null && delay > 5) delayClass = 'heavy';
      else if (delay !== null && delay > 0) delayClass = 'slight';

      const track = dep.platform || dep.plannedPlatform || '–';
      const trackChanged = dep.platform && dep.platform !== dep.plannedPlatform;

      // Via-Stops (erste 3)
      const via = dep.nextStopovers?.slice(1, 4).map(s => s.stop?.name).filter(Boolean).join(' – ') || '';

      html += `
        <div class="board-row ${cancelled ? 'cancelled' : ''}">
          <div class="board-time-col">
            ${hasDelay && !cancelled
              ? `<span class="time-planned has-delay">${plannedStr}</span>
                 <span class="time-real ${delayClass}">${realStr}</span>`
              : `<span class="time-planned">${plannedStr}</span>`
            }
          </div>
          <div>${linePill(dep.line)}</div>
          <div>
            <div class="board-dest">${dep.direction || '–'}</div>
            ${via ? `<div class="board-via">${via}</div>` : ''}
          </div>
          <div class="board-track ${trackChanged ? 'track-changed' : ''}" style="text-align:center">${track}</div>
          <div class="board-status">
            ${cancelled
              ? `<span class="cancelled-text">Ausfall</span>`
              : delayBadge(delay)
            }
          </div>
        </div>
      `;
    }
  }

  html += `</div>`;
  el.innerHTML = html;
  startClock();
}

function setLevel(level) {
  currentLevel = level;
  // Re-render mit aktuellen Daten
  const query = document.getElementById('boards-input').value.trim();
  if (currentDeps.length) {
    // Station neu holen wäre aufwändig, einfach re-render
    // station name aus header lesen
    const nameEl = document.querySelector('.board-station-name');
    const fakeSt = { name: nameEl?.textContent || query, id: null };
    renderBoards(fakeSt, currentDeps);
  }
}
