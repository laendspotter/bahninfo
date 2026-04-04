import { NextRequest, NextResponse } from 'next/server';
import createClient from 'db-vendo-client';
import { profile as dbProfile } from 'db-vendo-client/p/db';

const client = createClient(dbProfile, 'bahninfo/1.0');

const cache = new Map<string, { data: any; ts: number }>();
const TTL = 30_000;

function fromCache(key: string) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.ts < TTL) return hit.data;
  return null;
}
function toCache(key: string, data: any) {
  cache.set(key, { data, ts: Date.now() });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const path = searchParams.get('path') || req.nextUrl.pathname.replace('/api/proxy/', '');

  const cacheKey = req.url;
  const cached = fromCache(cacheKey);
  if (cached) return NextResponse.json(cached);

  try {
    let data: any;

    // locations
    if (path.startsWith('locations')) {
      const query = searchParams.get('query') || '';
      const results = parseInt(searchParams.get('results') || '5');
      data = await client.locations(query, { results });
    }

    // stops/:id/departures
    else if (path.match(/^stops\/[^/]+\/departures/)) {
      const id = path.split('/')[1];
      const results = parseInt(searchParams.get('results') || '60');
      const duration = parseInt(searchParams.get('duration') || '90');
      const language = (searchParams.get('language') || 'de') as 'de' | 'en' | 'fr' | 'es' | 'da' | 'pl' | 'it' | 'nl';
      data = await client.departures(id, { results, duration, language });
    }

    // trips/:tripId
    else if (path.startsWith('trips/') && !path.startsWith('trips?')) {
      const tripId = decodeURIComponent(path.replace('trips/', ''));
      const stopovers = searchParams.get('stopovers') !== 'false';
      const language = (searchParams.get('language') || 'de') as 'de' | 'en' | 'fr' | 'es' | 'da' | 'pl' | 'it' | 'nl';
      const trip = await client.trip(tripId, { stopovers, language });
      data = { trip };
    }

    // trips?query=... (kein tripsByName in vendo, fallback über departures)
    else if (path.startsWith('trips')) {
      const query = searchParams.get('query') || '';
      const deps = await client.departures('8000096', { results: 200, duration: 180, language: 'de' });
      const found = (deps.departures || deps as any[]).filter((d: any) =>
        d.line?.name?.replace(/\s/g, '').toLowerCase().includes(query.replace(/\s/g, '').toLowerCase()) ||
        d.line?.fahrtNr === query.match(/\d+/)?.[0]
      );
      data = { trips: found.map((d: any) => ({ id: d.tripId, line: d.line })) };
    }

    // remarks — störungen direkt von v6 da vendo-client das nicht supported
    else if (path.startsWith('remarks')) {
      const type = searchParams.get('type') || 'warning';
      const language = searchParams.get('language') || 'de';
      const r = await fetch(`https://v6.db.transport.rest/remarks?type=${type}&language=${language}`, {
        headers: { 'User-Agent': 'bahninfo/1.0' },
        cache: 'no-store',
      });
      if (!r.ok) throw new Error(`remarks ${r.status}`);
      data = await r.json();
    }

    else {
      return NextResponse.json({ error: 'unknown endpoint' }, { status: 404 });
    }

    toCache(cacheKey, data);
    return NextResponse.json(data);

  } catch (e: any) {
    console.error('vendo error:', e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
