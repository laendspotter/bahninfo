// Aktive Seite aus URL ermitteln
function getActivePage() {
  const path = location.pathname.replace(/\//g, '').replace('.html', '');
  if (!path || path === 'index') return 'boards';
  return path;
}

function injectHeader() {
  const active = getActivePage();
  const nav = [
    { id: 'boards',      label: '📋 Abfahrtstafel', href: 'boards.html' },
    { id: 'journeys',    label: '🚆 Zugauskunft',   href: 'journeys.html' },
    { id: 'disruptions', label: '⚠️ Störungen',     href: 'disruptions.html' },
  ];

  const html = `
    <header class="site-header">
      <div class="header-inner">
        <a href="boards.html" class="db-logo">DB</a>
        <div class="header-text">
          <span class="header-title">Bahninfo Suite</span>
          <span class="header-sub">Echtzeit · transport.rest</span>
        </div>
      </div>
    </header>
    <nav class="site-nav">
      ${nav.map(n => `
        <a href="${n.href}" class="nav-btn ${active === n.id ? 'active' : ''}">${n.label}</a>
      `).join('')}
    </nav>
  `;
  document.getElementById('app-header').innerHTML = html;
}

function showLoading(el, text = 'Laden…') {
  el.innerHTML = `<div class="spinner"><div class="spin"></div>${text}</div>`;
}

function showError(el, msg) {
  el.innerHTML = `<div class="error-box">${msg}</div>`;
}

function showEmpty(el, msg = 'Keine Daten') {
  el.innerHTML = `<div class="empty">${msg}</div>`;
}

// Pill für Linienname
function linePill(line) {
  const c = getLineColor(line);
  const name = line?.name || '?';
  return `<span class="line-pill" style="background:${c.bg};color:${c.text}">${name}</span>`;
}

// Verspätungs-Badge
function delayBadge(delay) {
  if (delay === null) return '';
  if (delay <= 0) return `<span class="badge on-time">pünktlich</span>`;
  if (delay <= 5)  return `<span class="badge slight-delay">+${delay} min</span>`;
  return `<span class="badge heavy-delay">+${delay} min</span>`;
}
