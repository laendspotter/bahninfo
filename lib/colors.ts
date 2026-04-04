export const HIDDEN_PRODUCTS = new Set(['subway','bus','taxi','tram','ferry']);

// DB Bahnschrift via CSS (system font fallback stack)
export const DB_FONT = '"DB Type", "Helvetica Neue", Arial, sans-serif';

const VVS: Record<string,{bg:string,text:string}> = {
  S1:{bg:'#00854A',text:'#fff'}, S2:{bg:'#E3000F',text:'#fff'},
  S3:{bg:'#F39200',text:'#fff'}, S4:{bg:'#9E5B2A',text:'#fff'},
  S5:{bg:'#00A3D7',text:'#fff'}, S6:{bg:'#003D8F',text:'#fff'},
  S11:{bg:'#00854A',text:'#fff'}, S60:{bg:'#8B7D2A',text:'#fff'},
  S62:{bg:'#6B3D1E',text:'#fff'},
};
const MVV: Record<string,{bg:string,text:string}> = {
  S1:{bg:'#79C6E7',text:'#000'}, S2:{bg:'#76B82A',text:'#fff'},
  S3:{bg:'#951B81',text:'#fff'}, S4:{bg:'#E30613',text:'#fff'},
  S5:{bg:'#003D8F',text:'#fff'}, S6:{bg:'#00A651',text:'#fff'},
  S7:{bg:'#943126',text:'#fff'}, S8:{bg:'#000',text:'#fff'},
};
const VBB: Record<string,{bg:string,text:string}> = {
  S1:{bg:'#DE5E97',text:'#fff'}, S2:{bg:'#007734',text:'#fff'},
  S3:{bg:'#0066AA',text:'#fff'}, S5:{bg:'#E46B00',text:'#fff'},
  S7:{bg:'#6E5E28',text:'#fff'}, S9:{bg:'#992746',text:'#fff'},
  S41:{bg:'#A23F2D',text:'#fff'}, S42:{bg:'#CD6B00',text:'#fff'},
};
const HVV: Record<string,{bg:string,text:string}> = {
  S1:{bg:'#00A651',text:'#fff'}, S2:{bg:'#E30613',text:'#fff'},
  S3:{bg:'#E30613',text:'#fff'},
};
const RMV: Record<string,{bg:string,text:string}> = {
  S1:{bg:'#00A651',text:'#fff'}, S2:{bg:'#00A651',text:'#fff'},
  S3:{bg:'#00A651',text:'#fff'}, S4:{bg:'#00A651',text:'#fff'},
  S5:{bg:'#00A651',text:'#fff'}, S6:{bg:'#00A651',text:'#fff'},
};

const CITY_MAP: Record<string, Record<string,{bg:string,text:string}>> = {
  stuttgart: VVS, munich: MVV, berlin: VBB, hamburg: HVV, frankfurt: RMV,
};

// Palette für RE/RB auto-farben — satte, gut lesbare farben
const RE_PALETTE = [
  '#1565C0','#2E7D32','#6A1B9A','#E65100','#00838F',
  '#AD1457','#4527A0','#558B2F','#00695C','#283593',
  '#4E342E','#37474F','#C62828','#0277BD','#F9A825',
  '#6D4C41','#1B5E20','#880E4F','#BF360C','#01579B',
];

// hash string → nummer
function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

// extrahiert die linien-basis: "RE 1", "RB 19022" → "RE1", "RB19022"
function lineKey(name: string): string {
  return name.toUpperCase().replace(/\s/g, '');
}

// cache damit gleiche linie immer gleiche farbe kriegt
const reColorCache = new Map<string, {bg:string,text:string}>();

function getREColor(lineName: string): {bg:string,text:string} {
  const key = lineKey(lineName);
  if (reColorCache.has(key)) return reColorCache.get(key)!;
  const idx = hashStr(key) % RE_PALETTE.length;
  const bg = RE_PALETTE[idx];
  // helligkeit checken für text-farbe
  const r = parseInt(bg.slice(1,3),16);
  const g = parseInt(bg.slice(3,5),16);
  const b = parseInt(bg.slice(5,7),16);
  const lum = (0.299*r + 0.587*g + 0.114*b) / 255;
  const text = lum > 0.5 ? '#1a1a1a' : '#ffffff';
  const color = {bg, text};
  reColorCache.set(key, color);
  return color;
}

export function detectCity(id: string, name: string): string {
  const n = name.toLowerCase();
  if (n.includes('stuttgart')) return 'stuttgart';
  if (n.includes('münchen') || n.includes('munich')) return 'munich';
  if (n.includes('berlin')) return 'berlin';
  if (n.includes('hamburg')) return 'hamburg';
  if (n.includes('frankfurt')) return 'frankfurt';
  return 'default';
}

export function getLineColor(line: any, city: string): {bg:string,text:string} {
  if (line?.color?.bg) return { bg: line.color.bg, text: line.color.fg || '#fff' };

  const product = (line?.product || '').toLowerCase();
  const name = (line?.name || '').toUpperCase().replace(/\s/g,'');
  const operator = (line?.operator?.name || '').toLowerCase();

  // FlixTrain
  if (operator.includes('flixtrain') || name.startsWith('FLX'))
    return { bg: '#00d473', text: '#fff' };

  if (product === 'suburban') {
    const map = CITY_MAP[city] || {};
    const m = name.match(/S\d+/);
    if (m && map[m[0]]) return map[m[0]];
    return { bg: '#008D4F', text: '#fff' };
  }

  // Fernverkehr
  if (['ice','ic','ec','nj','ece','rj','rjx'].includes(product))
    return { bg: '#ffffff', text: '#1a1a1a' };

  // RE/RB → auto-farbe pro linie
  if (product === 're' || product === 'rb' || product === 'regional') {
    return getREColor(line?.name || name);
  }

  return { bg: '#444', text: '#fff' };
}
