export default async function handler(req, res) {
  const { path, ...rest } = req.query;
  if (!path) return res.status(400).json({ error: 'no path' });
  const params = new URLSearchParams(rest).toString();
  const url = `https://v6.db.transport.rest/${path}${params ? '?' + params : ''}`;
  const r = await fetch(url, { headers: { 'User-Agent': 'bahninfo/1.0' } });
  const data = await r.json();
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(r.status).json(data);
}
