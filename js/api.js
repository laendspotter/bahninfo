async function apiGet(path) {
  const [pathname, qs] = path.split('?');
  const seg = pathname.replace(/^\//, '');
  const url = `/api/proxy?path=${seg}${qs ? '&' + qs : ''}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
  return res.json();
}

async function searchStation(query) {
  const data = await apiGet(`/locations?query=${encodeURIComponent(query)}&results=5&stops=true&addresses=false&poi=false`);
  return data.filter(s => s.type === 'stop' || s.type === 'station');
}

async function getDepartures(stationId, { duration = 60, results = 60 } = {}) {
  const data = await apiGet(`/stops/${stationId}/departures?duration=${duration}&results=${results}&language=de`);
  return data.departures || data;
}

async function getTrip(tripId) {
  const data = await apiGet(`/trips/${encodeURIComponent(tripId)}?stopovers=true&language=de`);
  return data.trip || data;
}

async function searchTrips(query) {
  try {
    const data = await apiGet(`/trips?query=${encodeURIComponent(query)}&language=de`);
    return data.trips || [];
  } catch {
    return [];
  }
}
