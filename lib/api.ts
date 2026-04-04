async function get(path: string) {
  const res = await fetch(`/api/proxy${path}`);
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

export async function searchStation(query: string) {
  const data = await get(`/locations?query=${encodeURIComponent(query)}&results=5&stops=true&addresses=false&poi=false`);
  return (data as any[]).filter(s => s.type === 'stop' || s.type === 'station');
}

export async function searchTrips(query: string) {
  try {
    const data = await get(`/trips?query=${encodeURIComponent(query)}&language=de`);
    return (data.trips || []) as any[];
  } catch { return []; }
}

export async function getTripDetails(tripId: string) {
  const data = await get(`/trips/${encodeURIComponent(tripId)}?stopovers=true&language=de`);
  return data.trip || data;
}

export function fmt(iso: string | null | undefined): string {
  if (!iso) return '--:--';
  return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

export function delayMin(planned?: string, real?: string): number | null {
  if (!planned || !real) return null;
  return Math.round((new Date(real).getTime() - new Date(planned).getTime()) / 60000);
}

export async function getDepartures(id: string, results = 60, duration = 90) {
  // stopovers=true entfernt — wird von /departures nicht supported
  const data = await get(`/stops/${id}/departures?results=${results}&duration=${duration}&language=de`);
  const deps = (data.departures || data) as any[];

  // stopovers nachladen: parallel, max 40 züge (performance)
  const toFetch = deps.slice(0, 40).filter((d: any) => d.tripId);
  const tripMap = new Map<string, any[]>();

  await Promise.allSettled(
    toFetch.map(async (dep: any) => {
      try {
        const trip = await getTripDetails(dep.tripId);
        const stopovers = trip?.stopovers || [];
        tripMap.set(dep.tripId, stopovers);
      } catch {}
    })
  );

  // stopovers in deps einbauen
  return deps.map((dep: any) => ({
    ...dep,
    nextStopovers: tripMap.get(dep.tripId) || [],
  }));
}
