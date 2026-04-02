// Linienfarben nach offiziellem VVS/DB Schema
const LINE_COLORS = {
  // S-Bahn Stuttgart (VVS) - aus Liniennetzplan
  'S1':  { bg: '#00854A', text: '#ffffff' },
  'S2':  { bg: '#E3000F', text: '#ffffff' },
  'S3':  { bg: '#F39200', text: '#ffffff' },
  'S4':  { bg: '#9B5B2A', text: '#ffffff' },
  'S5':  { bg: '#00A3D7', text: '#ffffff' },
  'S6':  { bg: '#003D8F', text: '#ffffff' },
  'S11': { bg: '#00854A', text: '#ffffff' },
  'S60': { bg: '#6E6B18', text: '#ffffff' },
  'S62': { bg: '#7B4F2E', text: '#ffffff' },
};

const PRODUCT_COLORS = {
  'nationalExpress': { bg: '#ffffff', text: '#1a1a1a' },
  'national':        { bg: '#eeeeee', text: '#1a1a1a' },
  'regionalExp':     { bg: '#888888', text: '#ffffff' },
  'regional':        { bg: '#666666', text: '#ffffff' },
  'suburban':        { bg: '#00854A', text: '#ffffff' },
  'subway':          { bg: '#0066CC', text: '#ffffff' },
  'tram':            { bg: '#CC0000', text: '#ffffff' },
  'bus':             { bg: '#9B59B6', text: '#ffffff' },
  'ferry':           { bg: '#1A8CFF', text: '#ffffff' },
};

function getLineColor(line) {
  if (!line) return { bg: '#555', text: '#fff' };
  if (line.color?.bg && line.color?.fg) return { bg: line.color.bg, text: line.color.fg };
  const name = (line.name || '').replace(/\s/g, '');
  if (LINE_COLORS[name]) return LINE_COLORS[name];
  return PRODUCT_COLORS[line.product] || { bg: '#555', text: '#fff' };
}

function calcDelay(planned, real) {
  if (!planned || !real) return null;
  return Math.round((new Date(real) - new Date(planned)) / 60000);
}

function fmtTime(iso) {
  if (!iso) return '--:--';
  return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

function detectLevels(departures) {
  const tracks = departures
    .map(d => parseInt(d.plannedPlatform || d.platform || '0'))
    .filter(n => !isNaN(n) && n > 0);
  const hasHigh = tracks.some(n => n >= 1 && n <= 50);
  const hasLow  = tracks.some(n => n >= 100);
  return { hasHigh, hasLow, hasBoth: hasHigh && hasLow };
}
