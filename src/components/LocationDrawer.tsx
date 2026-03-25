import { useState, useEffect, useMemo } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from "@/components/ui/drawer";
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
import StoryCarousel from "./StoryCarousel";
import { HugeiconsIcon } from "@hugeicons/react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from "recharts";
import {
  Navigation03Icon, BookOpen01Icon, Image01Icon,
  Globe02Icon, Location01Icon, Alert02Icon,
  Leaf01Icon, ArrowRight01Icon, Cancel01Icon,
  FastWindIcon, DropletIcon, Sun03Icon,
  Share01Icon, Bookmark02Icon, Search01Icon, MapViewIcon
} from "@hugeicons/core-free-icons";
import type { MapProjectionData } from "@/pages/Index";

interface LocationDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  weather: WeatherData | null;
  locationName: string;
  lat: number;
  lon: number;
  onProjectData: (data: MapProjectionData) => void;
}

type ViewId = "main" | "nature" | "quakes";

export default function LocationDrawer({ open, onOpenChange, weather, locationName, lat, lon, onProjectData }: LocationDrawerProps) {
  const [activeView, setActiveView] = useState<ViewId>("main");
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

  // Generate a very short 1-2 sentence TLDR for the new hero section
  const tldr = useMemo(() => {
    if (!weather) return "";
    const weatherDesc = getWeatherDescription(weather.current.weatherCode).toLowerCase();
    const temp = Math.round(weather.current.temperature);
    let text = `Météo ${weatherDesc} avec ${temp}°C actuellement.`;
    
    if (weather.airQuality && weather.airQuality.aqi > 100) {
      text += " Attention à la qualité de l'air médiocre.";
    } else if (quakes.length > 0 && quakes.some(q => q.magnitude > 4)) {
      text += " Activité sismique notable dans la région.";
    } else if (species.length > 0) {
      text += ` Zone riche en biodiversité avec de nombreuses observations récentes.`;
    }
    return text;
  }, [weather, quakes, species]);

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

  // Reset view when location changes
  useEffect(() => {
    setActiveView("main");
  }, [lat, lon]);

  if (!weather) return null;

  const { current } = weather;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92vh] outline-none">
        <DrawerHeader className="pb-0 px-5 relative">
          <DrawerClose className="absolute right-5 top-1 p-2 rounded-full hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
            <HugeiconsIcon icon={Cancel01Icon} size={16} />
          </DrawerClose>
          <div className="flex items-start justify-between pr-8">
            <div className="min-w-0 flex-1">
              <DrawerTitle className="text-2xl font-serif truncate">{locationName}</DrawerTitle>
              <p className="text-xs text-muted-foreground font-mono mt-1">
                {country ? `${country.subregion || country.region || country.name}` : `${lat.toFixed(4)}, ${lon.toFixed(4)}`}
              </p>
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
              <HugeiconsIcon icon={Sun03Icon} size={11} />
              Ressenti {current.apparentTemperature.toFixed(1)}°C
            </span>
            <span className="flex items-center gap-1">
              <HugeiconsIcon icon={DropletIcon} size={11} />
              {current.humidity}%
            </span>
            <span className="flex items-center gap-1">
              <HugeiconsIcon icon={FastWindIcon} size={11} />
              {current.windSpeed.toFixed(0)} km/h {getWindDirection(current.windDirection)}
            </span>
          </div>
        </div>

        {/* Action Pills */}
        <div className="px-5 pb-4">
          <div className="flex gap-2 overflow-x-auto hide-scrollbar snap-x">
            <a
              href={generateGoogleMapsLink(lat, lon)}
              target="_blank"
              rel="noopener noreferrer"
              className="snap-start shrink-0 flex items-center gap-1.5 rounded-full border border-border bg-transparent px-3 py-1.5 text-[10px] uppercase tracking-widest text-foreground hover:bg-secondary transition-colors"
            >
              <HugeiconsIcon icon={Navigation03Icon} size={12} />
              Itinéraire
            </a>
            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: locationName,
                    text: `Découvrez ${locationName} sur Atlas Nav.`,
                    url: window.location.href,
                  }).catch(() => {});
                }
              }}
              className="snap-start shrink-0 flex items-center gap-1.5 rounded-full border border-border bg-transparent px-3 py-1.5 text-[10px] uppercase tracking-widest text-foreground hover:bg-secondary transition-colors"
            >
              <HugeiconsIcon icon={Share01Icon} size={12} />
              Partager
            </button>
            <button className="snap-start shrink-0 flex items-center gap-1.5 rounded-full border border-border bg-transparent px-3 py-1.5 text-[10px] uppercase tracking-widest text-foreground hover:bg-secondary transition-colors">
              <HugeiconsIcon icon={Bookmark02Icon} size={12} />
              Enregistrer
            </button>
            {wiki?.url && (
              <a
                href={wiki.url}
                target="_blank"
                rel="noopener noreferrer"
                className="snap-start shrink-0 flex items-center gap-1.5 rounded-full border border-border bg-transparent px-3 py-1.5 text-[10px] uppercase tracking-widest text-foreground hover:bg-secondary transition-colors"
              >
                <HugeiconsIcon icon={BookOpen01Icon} size={12} />
                Wikipedia
              </a>
            )}
          </div>
        </div>

        {/* Main scrollable content area */}
        <div className="overflow-y-auto flex-1 overscroll-contain pb-8" style={{ maxHeight: "calc(92vh - 200px)" }}>
          {activeView === "main" && (
            <div className="animate-fade-in-up">
              {/* TLDR Narrative block */}
              <div className="px-5 mb-6">
                <div className="bg-secondary/50 rounded-xl p-4 border border-border">
                  <p className="text-sm leading-relaxed text-foreground/90 font-medium">
                    {tldr}
                  </p>
                </div>
              </div>

              {/* Story Carousel (Replaces Tabs) */}
              <div className="mb-2">
                <StoryCarousel 
                  quakes={quakes} 
                  species={species} 
                  wiki={wiki} 
                  onSelectStory={(id) => {
                    if (id === 'nature') setActiveView('nature');
                    else if (id === 'quakes') setActiveView('quakes');
                    else if (id === 'wiki' && wiki?.url) window.open(wiki.url, '_blank');
                  }} 
                />
              </div>

              {/* Weather Narrative Cards */}
              <div className="px-5 pt-4 pb-2">
                <SectionTitle>Analyse contextuelle</SectionTitle>
                {narrative.map((insight, i) => (
                  <NarrativeCard key={insight.category + i} insight={insight} index={i} />
                ))}
              </div>

              {/* Weather Forecasts */}
              <div className="px-5 pt-4 pb-2 border-t border-border">
                <SectionTitle>Prochaines heures</SectionTitle>
                <HourlyForecast hourly={weather.hourly} />
              </div>
              <div className="px-5 pt-4 pb-4 border-t border-border">
                <SectionTitle>7 prochains jours</SectionTitle>
                <DailyForecast daily={weather.daily} />
              </div>

              {/* Metrics Bento */}
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

              {/* Wikipedia block directly in main flow if available */}
              {wiki && (
                <div className="px-5 pt-4 pb-4 border-t border-border">
                  <SectionTitle icon={BookOpen01Icon}>Encyclopédie</SectionTitle>
                  <h3 className="text-base font-serif mb-1">
                    {wiki.title}
                    {wiki.title.toLowerCase() !== locationName.toLowerCase() && !wiki.title.toLowerCase().includes(locationName.toLowerCase()) && (
                      <span className="ml-2 text-[10px] font-mono font-normal text-muted-foreground bg-secondary px-1.5 py-0.5 rounded uppercase tracking-wider align-middle">
                        À proximité
                      </span>
                    )}
                  </h3>
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
            </div>
          )}

          {activeView === "nature" && (
            <div className="animate-fade-in-up">
              <div className="px-5 py-3 border-b border-border flex items-center justify-between sticky top-0 bg-background z-10">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setActiveView("main")}
                    className="p-1.5 -ml-1.5 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <HugeiconsIcon icon={ArrowRight01Icon} size={18} className="rotate-180" />
                  </button>
                  <h2 className="text-lg font-serif">Biodiversité locale</h2>
                </div>
                <button
                  onClick={() => {
                    onProjectData({ type: 'nature', data: species });
                    onOpenChange(false);
                  }}
                  className="flex items-center gap-1.5 text-xs font-medium text-pastel-green-text bg-pastel-green-bg px-3 py-1.5 rounded-full hover:opacity-80 transition-opacity"
                >
                  <HugeiconsIcon icon={MapViewIcon} size={14} />
                  Voir sur la carte
                </button>
              </div>
              <NatureTab species={species} loading={enrichLoading} />
            </div>
          )}

          {activeView === "quakes" && (
            <div className="animate-fade-in-up">
              <div className="px-5 py-3 border-b border-border flex items-center justify-between sticky top-0 bg-background z-10">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setActiveView("main")}
                    className="p-1.5 -ml-1.5 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <HugeiconsIcon icon={ArrowRight01Icon} size={18} className="rotate-180" />
                  </button>
                  <h2 className="text-lg font-serif">Activité sismique</h2>
                </div>
                <button
                  onClick={() => {
                    onProjectData({ type: 'quakes', data: quakes });
                    onOpenChange(false);
                  }}
                  className="flex items-center gap-1.5 text-xs font-medium text-pastel-red-text bg-pastel-red-bg px-3 py-1.5 rounded-full hover:opacity-80 transition-opacity"
                >
                  <HugeiconsIcon icon={MapViewIcon} size={14} />
                  Voir sur la carte
                </button>
              </div>
              <QuakesTab quakes={quakes} />
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

// ─── Quakes Detail View ──────────────────────────────────────────────
function QuakesTab({ quakes }: { quakes: Earthquake[] }) {
  // Process for timeline chart
  const chartData = useMemo(() => {
    return quakes.map(q => ({
      time: new Date(q.time).toLocaleDateString("fr-FR", { day: 'numeric', month: 'short' }),
      magnitude: q.magnitude,
      place: q.place.split(' of ').pop() || q.place // shorten place names
    })).reverse(); // chronological
  }, [quakes]);

  return (
    <div className="pb-8">
      <div className="px-5 pt-4 pb-4">
        <p className="text-sm leading-relaxed text-foreground/90 mb-6">
          <span className="font-semibold text-pastel-red-text">{quakes.length} séismes</span> ont été enregistrés dans un rayon de 300km au cours des 30 derniers jours.
        </p>

        {quakes.length > 0 && (
          <div className="mb-8 h-[160px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis 
                  dataKey="time" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))", fontFamily: "monospace" }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))", fontFamily: "monospace" }} 
                  domain={[0, Math.ceil(Math.max(...quakes.map(q => q.magnitude)))]}
                />
                <Bar dataKey="magnitude" radius={[4, 4, 0, 0]} maxBarSize={30}>
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.magnitude >= 5 ? "hsl(var(--pastel-red-text))" : entry.magnitude >= 3 ? "hsl(var(--pastel-yellow-text))" : "hsl(var(--muted-foreground))"} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <SectionTitle icon={Alert02Icon}>Historique détaillé</SectionTitle>
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
    </div>
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
  wiki, photos, country, pois, quakes, species, lat, lon, locationName, loading, setActiveTab
}: {
  wiki: WikiSummary | null;
  photos: WikimediaPhoto[];
  country: CountryInfo | null;
  pois: NearbyPOI[];
  quakes: Earthquake[];
  species: GBIFSpecies[];
  lat: number;
  lon: number;
  locationName: string;
  loading: boolean;
  setActiveTab: (tab: TabId) => void;
}) {
  return (
    <div className="pb-8">
      {loading && (
        <div className="px-5 py-6 flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-foreground animate-pulse" />
          <span className="text-xs text-muted-foreground">Enrichissement en cours...</span>
        </div>
      )}

      {!loading && (
        <div className="pt-4">
          <StoryCarousel 
            quakes={quakes} 
            species={species} 
            wiki={wiki} 
            onSelectStory={(id) => {
              if (id === 'nature') setActiveTab('nature');
              if (id === 'wiki' && wiki?.url) window.open(wiki.url, '_blank');
              // quakes could open a new view, for now it scrolls to quakes or does nothing
            }} 
          />
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
          <h3 className="text-base font-serif mb-1">
            {wiki.title}
            {wiki.title.toLowerCase() !== locationName.toLowerCase() && !wiki.title.toLowerCase().includes(locationName.toLowerCase()) && (
              <span className="ml-2 text-[10px] font-mono font-normal text-muted-foreground bg-secondary px-1.5 py-0.5 rounded uppercase tracking-wider align-middle">
                À proximité
              </span>
            )}
          </h3>
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
            <InfoRow label="Langue" value={country.languages.join(", ")} />
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
  // Aggregate by kingdom for the chart
  const distribution = useMemo(() => {
    const counts: Record<string, number> = {};
    species.forEach(s => {
      counts[s.kingdom] = (counts[s.kingdom] || 0) + s.count;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [species]);

  const COLORS = ['#93b399', '#c49a6c', '#e6c875', '#aeb4b7', '#d9a0a0']; // Pastel semantic colors

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
        
        {!loading && species.length > 0 && (
          <div className="mb-6 mt-4 h-[120px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distribution} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))", fontFamily: "monospace" }} 
                  width={80}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={12}>
                  {distribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
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
    <h2 className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-widest text-muted-foreground mb-3">
      {icon && <HugeiconsIcon icon={icon} size={12} />}
      {children}
    </h2>
  );
}

function formatTime(isoOrTimestamp: string | number): string {
  try {
    if (typeof isoOrTimestamp === "number") {
      return new Date(isoOrTimestamp * 1000).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    }
    return new Date(isoOrTimestamp).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function MetricCell({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-card p-3">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
      <p className="font-mono text-sm">{value}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between py-1.5 border-b border-border last:border-0">
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">{label}</span>
      <span className="text-right flex-1 ml-4 text-sm font-medium">{value}</span>
    </div>
  );
}

function formatPopulation(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + " M";
  if (num >= 1000) return (num / 1000).toFixed(1) + " k";
  return num.toString();
}




