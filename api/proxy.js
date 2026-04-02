const https = require('https');

module.exports = async function handler(req, res) {
  const { path, ...rest } = req.query;
  if (!path) return res.status(400).json({ error: 'no path' });
  const params = new URLSearchParams(rest).toString();
  const url = `https://v6.db.transport.rest/${path}${params ? '?' + params : ''}`;

  res.setHeader('Access-Control-Allow-Origin', '*');

  https.get(url, { headers: { 'User-Agent': 'bahninfo/1.0' } }, (r) => {
    let data = '';
    r.on('data', chunk => data += chunk);
    r.on('end', () => {
      try {
        res.status(r.statusCode).json(JSON.parse(data));
      } catch(e) {
        res.status(500).json({ error: 'parse error' });
      }
    });
  }).on('error', e => res.status(500).json({ error: e.message }));
}
