// Enrichment APIs — all free, no API key required

// ─── Wikipedia / Wikimedia ───────────────────────────────────────────
export interface WikiSummary {
  title: string;
  extract: string;
  thumbnail?: string;
  url: string;
  description?: string;
}

export async function fetchWikipediaSummary(lat: number, lon: number, locationName: string): Promise<WikiSummary | null> {
  try {
    // Try geo search first
    const geoRes = await fetch(
      `https://fr.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=${lat}|${lon}&gsradius=10000&gslimit=3&format=json&origin=*`
    );
    const geoData = await geoRes.json();
    const pages = geoData?.query?.geosearch || [];
    
    // Fall back to text search if no geo results
    let pageTitle = pages.length > 0 ? pages[0].title : null;
    if (!pageTitle) {
      const searchRes = await fetch(
        `https://fr.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(locationName)}&limit=1&format=json&origin=*`
      );
      const searchData = await searchRes.json();
      if (searchData[1]?.length > 0) pageTitle = searchData[1][0];
    }

    if (!pageTitle) return null;

    const summaryRes = await fetch(
      `https://fr.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(pageTitle)}`
    );
    if (!summaryRes.ok) return null;
    const summary = await summaryRes.json();

    return {
      title: summary.title,
      extract: summary.extract || "",
      thumbnail: summary.thumbnail?.source,
      url: summary.content_urls?.desktop?.page || "",
      description: summary.description,
    };
  } catch {
    return null;
  }
}

// ─── Wikimedia Commons photos ────────────────────────────────────────
export interface WikimediaPhoto {
  title: string;
  url: string;
  thumbUrl: string;
}

export async function fetchWikimediaPhotos(lat: number, lon: number, limit = 6): Promise<WikimediaPhoto[]> {
  try {
    const res = await fetch(
      `https://commons.wikimedia.org/w/api.php?action=query&list=geosearch&gscoord=${lat}|${lon}&gsradius=5000&gslimit=${limit}&gsnamespace=6&format=json&origin=*`
    );
    const data = await res.json();
    const files = data?.query?.geosearch || [];

    const photos: WikimediaPhoto[] = [];
    const filterRegex = /(marathon|course|sign|logo|map|flag|flagge|carte|panneau|blason|icon)/i;
    for (const file of files) {
      if (filterRegex.test(file.title)) continue;
      try {
        const infoRes = await fetch(
          `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(file.title)}&prop=imageinfo&iiprop=url|thumbmime&iiurlwidth=400&format=json&origin=*`
        );
        const infoData = await infoRes.json();
        const pages = infoData?.query?.pages;
        const pageData = pages ? Object.values(pages)[0] as any : null;
        const ii = pageData?.imageinfo?.[0];
        if (ii) {
          photos.push({
            title: file.title.replace("File:", "").replace(/\.\w+$/, ""),
            url: ii.url,
            thumbUrl: ii.thumburl || ii.url,
          });
        }
      } catch {}
    }
    return photos;
  } catch {
    return [];
  }
}

// ─── RestCountries ───────────────────────────────────────────────────
export interface CountryInfo {
  name: string;
  nativeName: string;
  flag: string;
  capital: string;
  population: number;
  area: number;
  region: string;
  subregion: string;
  languages: string[];
  currencies: { code: string; name: string; symbol: string }[];
  timezones: string[];
  callingCode: string;
  tld: string;
  borders: string[];
}

export async function fetchCountryInfo(lat: number, lon: number): Promise<CountryInfo | null> {
  try {
    // Use reverse geocoding to get country code
    const geoRes = await fetch(
      `https://photon.komoot.io/reverse?lat=${lat}&lon=${lon}&lang=fr&limit=1`
    );
    const geoData = await geoRes.json();
    const countryCode = geoData?.features?.[0]?.properties?.countrycode;
    if (!countryCode) return null;

    const res = await fetch(
      `https://restcountries.com/v3.1/alpha/${countryCode}?fields=name,flags,capital,population,area,region,subregion,languages,currencies,timezones,idd,tld,borders`
    );
    if (!res.ok) return null;
    const c = await res.json();

    const langNames = new Intl.DisplayNames(['fr'], { type: 'language' });
    const langs = c.languages 
      ? Object.keys(c.languages).map(code => {
          try {
            // ISO 639-3 to ISO 639-1 if needed, but Intl.DisplayNames handles many 3-letter codes
            return langNames.of(code) || c.languages[code];
          } catch {
            return c.languages[code];
          }
        })
      : [];
    const currs = c.currencies
      ? Object.entries(c.currencies).map(([code, v]: [string, any]) => ({
          code,
          name: v.name || "",
          symbol: v.symbol || "",
        }))
      : [];

    return {
      name: c.name?.common || "",
      nativeName: c.name?.nativeName ? Object.values(c.name.nativeName as Record<string, any>)[0]?.common || "" : "",
      flag: c.flags?.svg || c.flags?.png || "",
      capital: c.capital?.[0] || "",
      population: c.population || 0,
      area: c.area || 0,
      region: c.region || "",
      subregion: c.subregion || "",
      languages: langs,
      currencies: currs,
      timezones: c.timezones || [],
      callingCode: c.idd?.root ? `${c.idd.root}${c.idd.suffixes?.[0] || ""}` : "",
      tld: c.tld?.[0] || "",
      borders: c.borders || [],
    };
  } catch {
    return null;
  }
}

// ─── Overpass (OSM) — nearby POIs ────────────────────────────────────
export interface NearbyPOI {
  name: string;
  type: string;
  category: string;
  distance: number;
  lat: number;
  lon: number;
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const overpassCategories: Record<string, { query: string; label: string }> = {
  transport: { query: `node["public_transport"="station"]`, label: "Transport" },
  hospital: { query: `node["amenity"="hospital"]`, label: "Hôpital" },
  pharmacy: { query: `node["amenity"="pharmacy"]`, label: "Pharmacie" },
  restaurant: { query: `node["amenity"="restaurant"]`, label: "Restaurant" },
  hotel: { query: `node["tourism"="hotel"]`, label: "Hôtel" },
  museum: { query: `node["tourism"="museum"]`, label: "Musée" },
  park: { query: `node["leisure"="park"]`, label: "Parc" },
  worship: { query: `node["amenity"="place_of_worship"]`, label: "Lieu de culte" },
};

export async function fetchNearbyPOIs(lat: number, lon: number, radiusM = 2000): Promise<NearbyPOI[]> {
  try {
    const queries = Object.entries(overpassCategories)
      .map(([, v]) => `${v.query}(around:${radiusM},${lat},${lon});`)
      .join("");

    const query = `[out:json][timeout:10];(${queries});out body 50;`;
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: `data=${encodeURIComponent(query)}`,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    const data = await res.json();

    const pois: NearbyPOI[] = (data.elements || [])
      .filter((e: any) => e.tags?.name)
      .map((e: any) => {
        const tags = e.tags;
        let category = "Lieu";
        if (tags.public_transport) category = "Transport";
        else if (tags.amenity === "hospital") category = "Hôpital";
        else if (tags.amenity === "pharmacy") category = "Pharmacie";
        else if (tags.amenity === "restaurant") category = "Restaurant";
        else if (tags.tourism === "hotel") category = "Hôtel";
        else if (tags.tourism === "museum") category = "Musée";
        else if (tags.leisure === "park") category = "Parc";
        else if (tags.amenity === "place_of_worship") category = "Lieu de culte";

        return {
          name: tags.name,
          type: tags.amenity || tags.tourism || tags.leisure || tags.public_transport || "",
          category,
          distance: Math.round(haversine(lat, lon, e.lat, e.lon)),
          lat: e.lat,
          lon: e.lon,
        };
      })
      .sort((a: NearbyPOI, b: NearbyPOI) => a.distance - b.distance)
      .slice(0, 20);

    return pois;
  } catch {
    return [];
  }
}

// ─── USGS Earthquake ─────────────────────────────────────────────────
export interface Earthquake {
  title: string;
  magnitude: number;
  place: string;
  time: number;
  distance: number;
  url: string;
}

export async function fetchEarthquakes(lat: number, lon: number, radiusKm = 300, days = 30): Promise<Earthquake[]> {
  try {
    const end = new Date().toISOString().split("T")[0];
    const start = new Date(Date.now() - days * 86400000).toISOString().split("T")[0];
    const res = await fetch(
      `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=${start}&endtime=${end}&latitude=${lat}&longitude=${lon}&maxradiuskm=${radiusKm}&minmagnitude=2&orderby=time&limit=10`
    );
    const data = await res.json();

    return (data.features || []).map((f: any) => ({
      title: f.properties.title,
      magnitude: f.properties.mag,
      place: f.properties.place,
      time: f.properties.time,
      distance: Math.round(haversine(lat, lon, f.geometry.coordinates[1], f.geometry.coordinates[0]) / 1000),
      url: f.properties.url,
    }));
  } catch {
    return [];
  }
}

// ─── GBIF (biodiversity) ────────────────────────────────────────────
export interface GBIFSpecies {
  scientificName: string;
  vernacularName: string;
  kingdom: string;
  count: number;
}

const translateTaxonomy = (kingdom: string, className: string) => {
  if (className === "Aves") return "Oiseaux";
  if (className === "Mammalia") return "Mammifères";
  if (className === "Insecta") return "Insectes";
  if (className === "Magnoliopsida") return "Plantes à fleurs";
  if (className === "Amphibia") return "Amphibiens";
  if (className === "Reptilia") return "Reptiles";
  if (className === "Gastropoda" || className === "Bivalvia") return "Mollusques";
  if (kingdom === "Plantae") return "Plantes";
  if (kingdom === "Fungi") return "Champignons";
  if (kingdom === "Animalia") return "Animaux";
  return kingdom || "Inconnu";
};

export async function fetchGBIFSpecies(lat: number, lon: number): Promise<GBIFSpecies[]> {
  try {
    const res = await fetch(
      `https://api.gbif.org/v1/occurrence/search?decimalLatitude=${(lat - 0.1).toFixed(2)},${(lat + 0.1).toFixed(2)}&decimalLongitude=${(lon - 0.1).toFixed(2)},${(lon + 0.1).toFixed(2)}&limit=50&hasCoordinate=true&hasGeospatialIssue=false`
    );
    const data = await res.json();

    const speciesMap = new Map<string, GBIFSpecies>();
    for (const r of data.results || []) {
      if (!r.species) continue;
      const key = r.species;
      if (speciesMap.has(key)) {
        speciesMap.get(key)!.count++;
      } else {
        speciesMap.set(key, {
          scientificName: r.species,
          vernacularName: r.vernacularName || "",
          kingdom: translateTaxonomy(r.kingdom, r.class),
          count: 1,
        });
      }
    }

    return Array.from(speciesMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);
  } catch {
    return [];
  }
}

// ─── Elevation profile narrative ─────────────────────────────────────
export function generateDeepLink(lat: number, lon: number, label?: string): string {
  const encodedLabel = label ? encodeURIComponent(label) : "";
  // geo: URI scheme — opens native maps on mobile
  return `geo:${lat},${lon}?q=${lat},${lon}(${encodedLabel})`;
}

export function generateGoogleMapsLink(lat: number, lon: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;
}

export function generateAppleMapsLink(lat: number, lon: number, label?: string): string {
  return `https://maps.apple.com/?daddr=${lat},${lon}&dirflg=d${label ? `&q=${encodeURIComponent(label)}` : ""}`;
}
