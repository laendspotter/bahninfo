import { NextRequest, NextResponse } from 'next/server';

const BASE = 'https://v5.db.transport.rest';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const path = searchParams.get('path');
  if (!path) return NextResponse.json({ error: 'no path' }, { status: 400 });

  const params = new URLSearchParams();
  searchParams.forEach((v, k) => { if (k !== 'path') params.set(k, v); });

  const url = `${BASE}/${path}${params.toString() ? '?' + params.toString() : ''}`;

  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'bahninfo/1.0' }, cache: 'no-store' });
    const text = await r.text();
    console.log('proxy', r.status, url, text.substring(0, 300));
    try {
      return NextResponse.json(JSON.parse(text), { status: r.status });
    } catch {
      return NextResponse.json({ error: 'parse error', body: text.substring(0, 300) }, { status: 500 });
    }
  } catch(e: any) {
    console.error('fetch error:', e.message, url);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
