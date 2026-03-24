import { useState, useEffect, useMemo } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import type { WeatherData } from "@/lib/weather";
import { getWeatherDescription, getWindDirection } from "@/lib/weather";
import { generateNarrative } from "@/lib/narrative";
import {
  fetchWikipediaSummary, fetchWikimediaPhotos, fetchCountryInfo,
  fetchNearbyPOIs, fetchEarthquakes, fetchGBIFSpecies,
  generateGoogleMapsLink, generateAppleMapsLink,
  type WikiSummary, type WikimediaPhoto, type CountryInfo,
  type NearbyPOI, type Earthquake, type GBIFSpecies,
} from "@/lib/enrichment";
import NarrativeCard from "./NarrativeCard";
import HourlyForecast from "./HourlyForecast";
import DailyForecast from "./DailyForecast";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Navigation03Icon, BookOpen01Icon, Image01Icon,
  Globe02Icon, Location01Icon, Alert02Icon,
  Leaf01Icon, ArrowRight01Icon, SunCloud01Icon,
  WindIcon, Droplet01Icon, ThermometerIcon,
} from "@hugeicons/core-free-icons";

interface LocationDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  weather: WeatherData | null;
  locationName: string;
  lat: number;
  lon: number;
}

type TabId = "meteo" | "explore" | "nature";

export default function LocationDrawer({ open, onOpenChange, weather, locationName, lat, lon }: LocationDrawerProps) {
  const [activeTab, setActiveTab] = useState<TabId>("meteo");
  const [wiki, setWiki] = useState<WikiSummary | null>(null);
  const [photos, setPhotos] = useState<WikimediaPhoto[]>([]);
  const [country, setCountry] = useState<CountryInfo | null>(null);
  const [pois, setPois] = useState<NearbyPOI[]>([]);
  const [quakes, setQuakes] = useState<Earthquake[]>([]);
  const [species, setSpecies] = useState<GBIFSpecies[]>([]);
  const [enrichLoading, setEnrichLoading] = useState(false);

  const narrative = useMemo(
    () => (weather ? generateNarrative(weather, locationName) : []),
    [weather, locationName]
  );

  // Fetch enrichment data when drawer opens or location changes
  useEffect(() => {
    if (!open || !lat) return;
    setEnrichLoading(true);
    setWiki(null);
    setPhotos([]);
    setCountry(null);
    setPois([]);
    setQuakes([]);
    setSpecies([]);

    Promise.allSettled([
      fetchWikipediaSummary(lat, lon, locationName).then(setWiki),
      fetchWikimediaPhotos(lat, lon, 6).then(setPhotos),
      fetchCountryInfo(lat, lon).then(setCountry),
      fetchNearbyPOIs(lat, lon, 2000).then(setPois),
      fetchEarthquakes(lat, lon, 300, 30).then(setQuakes),
      fetchGBIFSpecies(lat, lon).then(setSpecies),
    ]).finally(() => setEnrichLoading(false));
  }, [open, lat, lon, locationName]);

  if (!weather) return null;

  const { current } = weather;

  const tabs: { id: TabId; label: string }[] = [
    { id: "meteo", label: "Météo" },
    { id: "explore", label: "Explorer" },
    { id: "nature", label: "Nature" },
  ];

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92vh] outline-none">
        <DrawerHeader className="pb-0 px-5">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <DrawerTitle className="text-2xl font-serif truncate">{locationName}</DrawerTitle>
              <p className="text-xs text-muted-foreground font-mono mt-1">
                {getWeatherDescription(current.weatherCode)} — {lat.toFixed(4)}, {lon.toFixed(4)}
              </p>
            </div>
            <div className="flex gap-1.5 ml-3 shrink-0 mt-1">
              <a
                href={generateGoogleMapsLink(lat, lon)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-md border border-border bg-secondary px-2.5 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
              >
                <HugeiconsIcon icon={Navigation03Icon} size={12} />
                Itinéraire
              </a>
            </div>
          </div>
        </DrawerHeader>

        {/* Temperature hero strip */}
        <div className="px-5 pt-3 pb-3">
          <div className="flex items-end gap-2">
            <span className="text-5xl font-serif tracking-tight leading-none">{Math.round(current.temperature)}</span>
            <span className="text-xl text-muted-foreground font-serif mb-0.5">°C</span>
          </div>
          <div className="flex flex-wrap gap-3 mt-2 text-[11px] text-muted-foreground font-mono">
            <span className="flex items-center gap-1">
              <HugeiconsIcon icon={ThermometerIcon} size={11} />
              Ressenti {current.apparentTemperature.toFixed(1)}°C
            </span>
            <span className="flex items-center gap-1">
              <HugeiconsIcon icon={Droplet01Icon} size={11} />
              {current.humidity}%
            </span>
            <span className="flex items-center gap-1">
              <HugeiconsIcon icon={WindIcon} size={11} />
              {current.windSpeed.toFixed(0)} km/h {getWindDirection(current.windDirection)}
            </span>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-border px-5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative px-4 py-2.5 text-xs uppercase tracking-widest transition-colors ${
                activeTab === tab.id
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-foreground rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="overflow-y-auto flex-1 overscroll-contain" style={{ maxHeight: "calc(92vh - 220px)" }}>
          {activeTab === "meteo" && (
            <MeteoTab weather={weather} narrative={narrative} />
          )}
          {activeTab === "explore" && (
            <ExploreTab
              wiki={wiki}
              photos={photos}
              country={country}
              pois={pois}
              quakes={quakes}
              lat={lat}
              lon={lon}
              locationName={locationName}
              loading={enrichLoading}
            />
          )}
          {activeTab === "nature" && (
            <NatureTab species={species} loading={enrichLoading} />
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

// ─── Météo Tab ───────────────────────────────────────────────────────
function MeteoTab({ weather, narrative }: { weather: WeatherData; narrative: any[] }) {
  const { current } = weather;
  return (
    <div className="pb-8">
      {/* Narrative Hub */}
      <div className="px-5 pt-4 pb-2">
        <SectionTitle>Analyse contextuelle</SectionTitle>
        {narrative.map((insight, i) => (
          <NarrativeCard key={insight.category + i} insight={insight} index={i} />
        ))}
      </div>

      {/* Hourly */}
      <div className="px-5 pt-4 pb-2 border-t border-border">
        <SectionTitle>Prochaines heures</SectionTitle>
        <HourlyForecast hourly={weather.hourly} />
      </div>

      {/* Daily */}
      <div className="px-5 pt-4 pb-4 border-t border-border">
        <SectionTitle>7 prochains jours</SectionTitle>
        <DailyForecast daily={weather.daily} />
      </div>

      {/* Metrics bento */}
      <div className="px-5 pb-4 border-t border-border pt-4">
        <SectionTitle>Données détaillées</SectionTitle>
        <div className="grid grid-cols-2 gap-px bg-border rounded-lg overflow-hidden">
          <MetricCell label="Pression" value={`${current.pressure.toFixed(0)} hPa`} />
          <MetricCell label="Visibilité" value={`${(current.visibility / 1000).toFixed(1)} km`} />
          <MetricCell label="Point de rosée" value={`${current.dewPoint.toFixed(1)}°C`} />
          <MetricCell label="Couverture nuageuse" value={`${current.cloudCover}%`} />
          <MetricCell label="UV Index" value={current.uvIndex.toFixed(1)} />
          <MetricCell label="Altitude" value={`${weather.elevation.toFixed(0)}m`} />
          {weather.airQuality && (
            <>
              <MetricCell label="AQI" value={weather.airQuality.aqi.toString()} />
              <MetricCell label="PM2.5" value={`${weather.airQuality.pm25.toFixed(1)} µg/m³`} />
              <MetricCell label="PM10" value={`${weather.airQuality.pm10.toFixed(1)} µg/m³`} />
              <MetricCell label="NO2" value={`${weather.airQuality.no2.toFixed(1)} µg/m³`} />
              <MetricCell label="Ozone" value={`${weather.airQuality.o3.toFixed(1)} µg/m³`} />
              <MetricCell label="SO2" value={`${weather.airQuality.so2.toFixed(1)} µg/m³`} />
            </>
          )}
        </div>
      </div>

      {/* Ephemeris */}
      <div className="px-5 pb-6 border-t border-border pt-4">
        <SectionTitle>Éphémérides</SectionTitle>
        <div className="flex gap-4 text-sm font-mono text-muted-foreground">
          <div>
            <span className="text-[10px] uppercase tracking-widest block mb-1">Lever</span>
            <span className="text-foreground">{formatTime(weather.daily.sunrise[0])}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-widest block mb-1">Coucher</span>
            <span className="text-foreground">{formatTime(weather.daily.sunset[0])}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Explorer Tab ────────────────────────────────────────────────────
function ExploreTab({
  wiki, photos, country, pois, quakes, lat, lon, locationName, loading,
}: {
  wiki: WikiSummary | null;
  photos: WikimediaPhoto[];
  country: CountryInfo | null;
  pois: NearbyPOI[];
  quakes: Earthquake[];
  lat: number;
  lon: number;
  locationName: string;
  loading: boolean;
}) {
  return (
    <div className="pb-8">
      {loading && (
        <div className="px-5 py-6 flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-foreground animate-pulse" />
          <span className="text-xs text-muted-foreground">Enrichissement en cours...</span>
        </div>
      )}

      {/* Wikipedia */}
      {wiki && (
        <div className="px-5 pt-4 pb-4 border-b border-border animate-fade-in-up">
          <SectionTitle icon={BookOpen01Icon}>Encyclopédie</SectionTitle>
          {wiki.thumbnail && (
            <img
              src={wiki.thumbnail}
              alt={wiki.title}
              className="w-full h-40 object-cover rounded-lg mb-3"
              loading="lazy"
            />
          )}
          <h3 className="text-base font-serif mb-1">{wiki.title}</h3>
          {wiki.description && (
            <p className="text-[11px] text-muted-foreground font-mono mb-2">{wiki.description}</p>
          )}
          <p className="text-sm text-foreground leading-relaxed">{wiki.extract}</p>
          {wiki.url && (
            <a
              href={wiki.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Lire sur Wikipedia
              <HugeiconsIcon icon={ArrowRight01Icon} size={12} />
            </a>
          )}
        </div>
      )}

      {/* Wikimedia Photos */}
      {photos.length > 0 && (
        <div className="px-5 pt-4 pb-4 border-b border-border animate-fade-in-up" style={{ animationDelay: "80ms" }}>
          <SectionTitle icon={Image01Icon}>Photos du lieu</SectionTitle>
          <div className="grid grid-cols-3 gap-1.5 rounded-lg overflow-hidden">
            {photos.map((p, i) => (
              <a key={i} href={p.url} target="_blank" rel="noopener noreferrer" className="block">
                <img
                  src={p.thumbUrl}
                  alt={p.title}
                  className="w-full h-24 object-cover hover:opacity-80 transition-opacity"
                  loading="lazy"
                />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Country */}
      {country && (
        <div className="px-5 pt-4 pb-4 border-b border-border animate-fade-in-up" style={{ animationDelay: "160ms" }}>
          <SectionTitle icon={Globe02Icon}>Identité culturelle</SectionTitle>
          <div className="flex items-start gap-3 mb-3">
            {country.flag && (
              <img src={country.flag} alt={country.name} className="w-10 h-7 rounded object-cover border border-border" />
            )}
            <div>
              <p className="text-sm font-medium text-foreground">{country.name}</p>
              {country.nativeName && country.nativeName !== country.name && (
                <p className="text-xs text-muted-foreground">{country.nativeName}</p>
              )}
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <InfoRow label="Parlez" value={country.languages.join(", ")} />
            <InfoRow
              label="Devises"
              value={country.currencies.map((c) => `${c.name} (${c.symbol})`).join(", ")}
            />
            <InfoRow label="Capitale" value={country.capital} />
            <InfoRow label="Population" value={formatPopulation(country.population)} />
            <InfoRow label="Superficie" value={`${country.area.toLocaleString("fr-FR")} km²`} />
            <InfoRow label="Région" value={`${country.subregion || country.region}`} />
            <InfoRow label="Fuseau" value={country.timezones[0] || ""} />
            <InfoRow label="Indicatif" value={country.callingCode} />
          </div>
        </div>
      )}

      {/* Nearby POIs */}
      {pois.length > 0 && (
        <div className="px-5 pt-4 pb-4 border-b border-border animate-fade-in-up" style={{ animationDelay: "240ms" }}>
          <SectionTitle icon={Location01Icon}>Proximité</SectionTitle>
          <div className="space-y-0">
            {pois.map((poi, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex items-start gap-2 min-w-0 flex-1">
                  <span className="shrink-0 inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-[9px] uppercase tracking-wider text-muted-foreground mt-0.5">
                    {poi.category}
                  </span>
                  <span className="text-sm text-foreground truncate">{poi.name}</span>
                </div>
                <span className="text-xs font-mono text-muted-foreground ml-2 shrink-0">
                  {poi.distance < 1000 ? `${poi.distance}m` : `${(poi.distance / 1000).toFixed(1)}km`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Earthquakes */}
      {quakes.length > 0 && (
        <div className="px-5 pt-4 pb-4 border-b border-border animate-fade-in-up" style={{ animationDelay: "320ms" }}>
          <SectionTitle icon={Alert02Icon}>Activité sismique (300 km)</SectionTitle>
          <div className="space-y-0">
            {quakes.map((q, i) => (
              <a
                key={i}
                href={q.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between py-2 border-b border-border last:border-0 hover:bg-secondary transition-colors -mx-2 px-2 rounded"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground truncate">{q.place}</p>
                  <p className="text-[10px] text-muted-foreground font-mono">
                    {new Date(q.time).toLocaleDateString("fr-FR")} — {q.distance} km
                  </p>
                </div>
                <span className={`shrink-0 ml-2 font-mono text-sm font-medium ${
                  q.magnitude >= 5 ? "text-pastel-red-text" : q.magnitude >= 3 ? "text-pastel-yellow-text" : "text-muted-foreground"
                }`}>
                  M{q.magnitude.toFixed(1)}
                </span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Navigation delegation */}
      <div className="px-5 pt-4 pb-4 animate-fade-in-up" style={{ animationDelay: "400ms" }}>
        <SectionTitle icon={Navigation03Icon}>Navigation</SectionTitle>
        <p className="text-xs text-muted-foreground mb-3">
          Ouvrez votre application de navigation préférée pour un itinéraire fiable.
        </p>
        <div className="flex gap-2">
          <a
            href={generateGoogleMapsLink(lat, lon)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 rounded-md border border-border bg-card px-3 py-2.5 text-xs text-foreground hover:bg-secondary transition-colors"
          >
            Google Maps
          </a>
          <a
            href={generateAppleMapsLink(lat, lon, locationName)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 rounded-md border border-border bg-card px-3 py-2.5 text-xs text-foreground hover:bg-secondary transition-colors"
          >
            Apple Maps
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── Nature Tab ──────────────────────────────────────────────────────
function NatureTab({ species, loading }: { species: GBIFSpecies[]; loading: boolean }) {
  return (
    <div className="pb-8">
      <div className="px-5 pt-4 pb-4">
        <SectionTitle icon={Leaf01Icon}>Biodiversité locale (GBIF)</SectionTitle>
        {loading && (
          <div className="flex items-center gap-2 py-4">
            <div className="h-2 w-2 rounded-full bg-foreground animate-pulse" />
            <span className="text-xs text-muted-foreground">Chargement...</span>
          </div>
        )}
        {!loading && species.length === 0 && (
          <p className="text-sm text-muted-foreground py-4">Aucune observation enregistrée dans cette zone.</p>
        )}
        {species.length > 0 && (
          <div className="space-y-0">
            {species.map((s, i) => (
              <div
                key={s.scientificName}
                className="flex items-center justify-between py-2.5 border-b border-border last:border-0 animate-fade-in-up"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground italic">{s.scientificName}</p>
                  {s.vernacularName && (
                    <p className="text-[11px] text-muted-foreground">{s.vernacularName}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-2 shrink-0">
                  <span className="text-[9px] uppercase tracking-wider text-muted-foreground bg-secondary rounded-full px-2 py-0.5">
                    {s.kingdom}
                  </span>
                  <span className="text-xs font-mono text-muted-foreground">{s.count}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Shared primitives ───────────────────────────────────────────────
function SectionTitle({ children, icon }: { children: React.ReactNode; icon?: any }) {
  return (
    <h2 className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3">
      {icon && <HugeiconsIcon icon={icon} size={13} />}
      {children}
    </h2>
  );
}

function MetricCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card p-3">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="text-sm font-mono mt-1 text-foreground">{value}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground shrink-0 w-20">{label}</span>
      <span className="text-sm text-foreground">{value}</span>
    </div>
  );
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function formatPopulation(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)} Mrd`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)} K`;
  return n.toString();
}
