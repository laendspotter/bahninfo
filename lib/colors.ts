export const HIDDEN_PRODUCTS = new Set(['subway','bus','taxi','tram','ferry']);

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
  if (operator.includes('flixtrain') || name.includes('FLX') || name.startsWith('FLX'))
    return { bg: '#00d473', text: '#fff' };

  if (product === 'suburban') {
    const map = CITY_MAP[city] || {};
    const m = name.match(/S\d+/);
    if (m && map[m[0]]) return map[m[0]];
    return { bg: '#008D4F', text: '#fff' };
  }

  // Fernverkehr: weißes badge, schwarze schrift
  if (product === 'ice' || product === 'ic' || product === 'ec' || product === 'nj' || product === 'ece' || product === 'rj' || product === 'rjx')
    return { bg: '#ffffff', text: '#1a1a1a' };

  // Nahverkehr: grau
  if (product === 're' || product === 'rb' || product === 'regional')
    return { bg: '#6b6b6b', text: '#fff' };

  return { bg: '#444', text: '#fff' };
}
