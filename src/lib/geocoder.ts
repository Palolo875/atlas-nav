// Photon geocoder (Komoot)

export interface GeoResult {
  name: string;
  country: string;
  state?: string;
  city?: string;
  lat: number;
  lon: number;
  type: string;
}

export async function searchPlaces(query: string): Promise<GeoResult[]> {
  if (!query || query.length < 2) return [];
  
  const res = await fetch(
    `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5&lang=fr`
  );
  const data = await res.json();

  return (data.features || []).map((f: any) => ({
    name: f.properties.name || f.properties.city || "Lieu inconnu",
    country: f.properties.country || "",
    state: f.properties.state,
    city: f.properties.city,
    lat: f.geometry.coordinates[1],
    lon: f.geometry.coordinates[0],
    type: f.properties.osm_value || f.properties.type || "",
  }));
}

export async function reverseGeocode(lat: number, lon: number): Promise<string> {
  try {
    const res = await fetch(
      `https://photon.komoot.io/reverse?lat=${lat}&lon=${lon}&lang=fr&limit=1`
    );
    const data = await res.json();
    if (data.features?.length > 0) {
      const p = data.features[0].properties;
      return p.city || p.name || p.county || "Lieu inconnu";
    }
  } catch {}
  return "Lieu inconnu";
}
