import { NextRequest, NextResponse } from 'next/server';

const BASE = 'https://v6.db.transport.rest';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const path = searchParams.get('path');
  if (!path) return NextResponse.json({ error: 'no path' }, { status: 400 });

  const params = new URLSearchParams();
  searchParams.forEach((v, k) => { if (k !== 'path') params.set(k, v); });

  const url = `${BASE}/${path}${params.toString() ? '?' + params.toString() : ''}`;

  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'bahninfo/1.0' }, next: { revalidate: 0 } });
    const data = await r.json();
    return NextResponse.json(data, { status: r.status });
  } catch(e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
