// Produkte die NICHT angezeigt werden
const HIDDEN = new Set(['subway','bus','taxi','tram','ferry']);

let currentStation = null;
let currentDeps = [];
let currentLevel = 'all';
let clockInterval = null;
let refreshInterval = null;
let isFullscreen = false;

function startClock() {
  if (clockInterval) clearInterval(clockInterval);
  const tick = () => {
    const el = document.getElementById('board-clock');
    if (el) el.textContent = new Date().toLocaleTimeString('de-DE', {hour:'2-digit',minute:'2-digit',second:'2-digit'});
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
    currentStation = stations[0];

    await refresh();

    if (refreshInterval) clearInterval(refreshInterval);
    refreshInterval = setInterval(refresh, 30000);
  } catch(e) { showError(el, e.message); }
}

async function refresh() {
  if (!currentStation) return;
  const deps = await getDepartures(currentStation.id, { results: 80, duration: 120 });
  // U-Bahn, Bus etc. rausfiltern
  currentDeps = deps.filter(d => !HIDDEN.has(d.line?.product));
  render();
}

function detectLevels() {
  const hasTop  = currentDeps.some(d => { const n=parseInt(d.plannedPlatform||d.platform||''); return n>=1 && n<100; });
  const hasDeep = currentDeps.some(d => { const n=parseInt(d.plannedPlatform||d.platform||''); return n>=100; });
  return hasTop && hasDeep;
}

function render() {
  const el = document.getElementById('boards-result');
  if (!currentStation) return;

  const hasBoth = detectLevels();
  let deps = currentDeps;
  if (currentLevel === 'top')  deps = currentDeps.filter(d => { const n=parseInt(d.plannedPlatform||d.platform||''); return n<100; });
  if (currentLevel === 'deep') deps = currentDeps.filter(d => { const n=parseInt(d.plannedPlatform||d.platform||''); return n>=100; });

  const city = detectCity(currentStation.id, currentStation.name);

  let html = `<div class="bigboard" id="bigboard">
    <div class="bb-header">
      <div class="bb-left">
        <div class="bb-title">Abfahrt <span style="font-size:0.6em;opacity:0.6">Departure</span></div>
        <div class="bb-station">${currentStation.name}</div>
      </div>
      <div class="bb-clock" id="board-clock"></div>
    </div>`;

  // Level-Tabs
  if (hasBoth) {
    html += `<div class="bb-tabs">
      <button class="bb-tab ${currentLevel==='all'?'active':''}" onclick="setLevel('all')">Alle Gleise</button>
      <button class="bb-tab ${currentLevel==='top'?'active':''}" onclick="setLevel('top')">🔝 Kopfbahnhof</button>
      <button class="bb-tab ${currentLevel==='deep'?'active':''}" onclick="setLevel('deep')">🔽 Tief</button>
    </div>`;
  }

  // Spaltenköpfe wie echte Tafel
  html += `<div class="bb-cols">
    <div>Zeit</div>
    <div>Zug</div>
    <div>Über / Via</div>
    <div>Ziel / Destination</div>
    <div class="bb-col-track">Gleis</div>
  </div>`;

  for (const dep of deps.slice(0, 30)) {
    const cancelled = dep.cancelled;
    const delay = calcDelay(dep.plannedWhen, dep.when);
    const hasDelay = delay !== null && delay > 0;

    const tPlanned = fmtTime(dep.plannedWhen);
    const tReal    = dep.when ? fmtTime(dep.when) : null;

    const track = dep.platform || dep.plannedPlatform || '–';
    const trackChanged = dep.platform && dep.platform !== dep.plannedPlatform;

    // Via: nextstopovers ohne ersten (der ist der aktuelle halt)
    const via = dep.nextStopovers
      ?.slice(1, 5).map(s => s.stop?.name).filter(Boolean).join(' – ') || '';

    const badge = linePill(dep.line, city);

    let timeHtml = '';
    if (cancelled) {
      timeHtml = `<span class="bb-time bb-cancelled-time">${tPlanned}</span>`;
    } else if (hasDelay) {
      timeHtml = `<span class="bb-time bb-time-old">${tPlanned}</span><span class="bb-time bb-time-new ${delay>5?'heavy':'slight'}">${tReal}</span>`;
    } else {
      timeHtml = `<span class="bb-time">${tPlanned}</span>`;
    }

    html += `<div class="bb-row ${cancelled?'bb-cancelled':''}">
      <div class="bb-col-time">${timeHtml}</div>
      <div class="bb-col-zug">${badge}</div>
      <div class="bb-col-via">${via}</div>
      <div class="bb-col-dest">${dep.direction||'–'}
        ${cancelled ? '<span class="bb-ausfall">Zug fällt aus</span>' : ''}
      </div>
      <div class="bb-col-track ${trackChanged?'bb-track-changed':''}">${track}</div>
    </div>`;
  }

  html += `</div>`; // bigboard
  el.innerHTML = html;
  startClock();
}

function setLevel(level) {
  currentLevel = level;
  render();
}

function toggleFullscreen() {
  isFullscreen = !isFullscreen;
  const header = document.getElementById('app-header');
  const searchRow = document.getElementById('search-row');
  const container = document.getElementById('main-container');

  if (isFullscreen) {
    header.style.display = 'none';
    searchRow.style.display = 'none';
    container.style.padding = '0';
    container.style.maxWidth = '100%';
    document.body.style.background = '#003189';
    document.documentElement.requestFullscreen?.();
  } else {
    header.style.display = '';
    searchRow.style.display = '';
    container.style.padding = '';
    container.style.maxWidth = '';
    document.body.style.background = '';
    document.exitFullscreen?.();
  }
}

document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement && isFullscreen) {
    isFullscreen = false;
    toggleFullscreen(); // reset styles
    isFullscreen = false;
  }
});
