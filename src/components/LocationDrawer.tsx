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
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";
import {
  Navigation03Icon, BookOpen01Icon, Image01Icon,
  Globe02Icon, Location01Icon, Alert02Icon,
  Leaf01Icon, ArrowRight01Icon, Cancel01Icon,
  FastWindIcon, DropletIcon, Sun03Icon,
  Share01Icon, Bookmark02Icon, Search01Icon
} from "@hugeicons/core-free-icons";

interface LocationDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  weather: WeatherData | null;
  locationName: string;
  lat: number;
  lon: number;
  onLayerSelect?: (layer: "none" | "quakes" | "nature", data?: any) => void;
}

type TabId = "explore" | "meteo" | "nature" | "quakes";

export default function LocationDrawer({ open, onOpenChange, weather, locationName, lat, lon, onLayerSelect }: LocationDrawerProps) {
  const [activeTab, setActiveTab] = useState<TabId>("explore");
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
    
    // Reset to explore tab when opening a new location
    setActiveTab("explore");

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

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92vh] outline-none">
        {/* Header content and close button */}
        {activeTab !== 'explore' && (
          <div className="absolute top-4 left-4 z-10">
            <button 
              onClick={() => {
                setActiveTab('explore');
                onLayerSelect?.('none');
              }}
              className="flex items-center gap-1 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors bg-background/80 backdrop-blur px-3 py-1.5 rounded-full border border-border shadow-sm"
            >
              <HugeiconsIcon icon={ArrowRight01Icon} size={12} className="rotate-180" />
              Retour
            </button>
          </div>
        )}

        <DrawerHeader className={`pb-0 px-5 relative transition-all duration-300 ${activeTab !== 'explore' ? 'pt-14' : ''}`}>
          <DrawerClose 
            className="absolute right-5 top-4 p-2 rounded-full hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
            onClick={() => onLayerSelect?.('none')}
          >
            <HugeiconsIcon icon={Cancel01Icon} size={16} />
          </DrawerClose>
          <div className="flex items-start justify-between pr-8">
            <div className="min-w-0 flex-1">
              <DrawerTitle className="text-2xl font-serif truncate">{locationName}</DrawerTitle>
              <p className="text-xs text-muted-foreground font-mono mt-1">
                {getWeatherDescription(current.weatherCode)}
                {country && ` — ${country.subregion || country.region || country.name}`}
              </p>
            </div>
          </div>
        </DrawerHeader>

        {/* Temperature hero strip - only visible on explore tab */}
        <div className={`transition-all duration-300 overflow-hidden ${activeTab === 'explore' ? 'opacity-100 max-h-[100px]' : 'opacity-0 max-h-0'}`}>
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
        </div>

        {/* Action Pills */}
        <div className={`transition-all duration-300 overflow-hidden ${activeTab === 'explore' ? 'opacity-100 max-h-[60px]' : 'opacity-0 max-h-0'}`}>
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
        </div>

        {/* Tab content */}
        <div className="overflow-y-auto flex-1 overscroll-contain" style={{ maxHeight: "calc(92vh - 220px)" }}>
          {activeTab === "explore" && (
            <ExploreTab
              wiki={wiki}
              photos={photos}
              country={country}
              pois={pois}
              quakes={quakes}
              species={species}
              lat={lat}
              lon={lon}
              locationName={locationName}
              loading={enrichLoading}
              setActiveTab={setActiveTab}
              weather={weather}
              narrative={narrative}
            />
          )}
          {activeTab === "meteo" && (
            <MeteoTab weather={weather} />
          )}
          {activeTab === "nature" && (
            <NatureTab 
              species={species} 
              loading={enrichLoading} 
              onShowOnMap={() => {
                onLayerSelect?.('nature', species);
              }}
            />
          )}
          {activeTab === "quakes" && (
            <QuakesTab 
              quakes={quakes} 
              loading={enrichLoading} 
              onShowOnMap={() => {
                onLayerSelect?.('quakes', quakes);
              }}
            />
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

// ─── Météo Tab (Internal View) ───────────────────────────────────────
function MeteoTab({ weather }: { weather: WeatherData }) {
  const { current } = weather;
  return (
    <div className="pb-8 animate-fade-in-up">
      {/* Hourly */}
      <div className="px-5 pt-4 pb-2">
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
  wiki, photos, country, pois, quakes, species, lat, lon, locationName, loading, setActiveTab, weather, narrative
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
  weather: WeatherData;
  narrative: any[];
}) {
  return (
    <div className="pb-8">
      {/* Narrative Hub (Moved from Meteo) */}
      <div className="px-5 pt-4 pb-2 border-t border-border">
        <div className="flex items-center justify-between mb-3">
          <SectionTitle className="mb-0">Analyse contextuelle</SectionTitle>
          <button 
            onClick={() => setActiveTab('meteo')}
            className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 bg-secondary px-3 py-1.5 rounded-full border border-border shadow-sm"
          >
            Détails météo
            <HugeiconsIcon icon={ArrowRight01Icon} size={10} />
          </button>
        </div>
        {narrative.map((insight, i) => (
          <NarrativeCard key={insight.category + i} insight={insight} index={i} />
        ))}
      </div>

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
              if (id === 'quakes') setActiveTab('quakes');
              if (id === 'wiki' && wiki?.url) window.open(wiki.url, '_blank');
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

      {/* Earthquakes (Removed from Explorer, now in StoryCarousel) */}
      
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
function NatureTab({ species, loading, onShowOnMap }: { species: GBIFSpecies[]; loading: boolean, onShowOnMap?: () => void }) {
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
        
        {onShowOnMap && species.length > 0 && !loading && (
          <button 
            onClick={onShowOnMap}
            className="mb-4 flex items-center justify-center gap-2 w-full py-2.5 bg-pastel-green-bg text-pastel-green-text rounded-lg border border-pastel-green-text/20 text-xs uppercase tracking-widest hover:bg-pastel-green-text hover:text-white transition-colors"
          >
            <HugeiconsIcon icon={Location01Icon} size={14} />
            Voir les zones d'observation
          </button>
        )}

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

// ─── Quakes Tab (Internal View) ───────────────────────────────────────
function QuakesTab({ quakes, loading, onShowOnMap }: { quakes: Earthquake[]; loading: boolean, onShowOnMap?: () => void }) {
  const maxMag = quakes.length > 0 ? Math.max(...quakes.map(q => q.magnitude)) : 0;
  
  // Prepare data for the timeline chart
  const timelineData = useMemo(() => {
    // Group by day for the last 30 days
    const days: Record<string, { date: string, maxMag: number, count: number }> = {};
    const now = new Date();
    
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const dateStr = d.toISOString().split('T')[0];
      days[dateStr] = { date: dateStr, maxMag: 0, count: 0 };
    }
    
    quakes.forEach(q => {
      const dateStr = new Date(q.time).toISOString().split('T')[0];
      if (days[dateStr]) {
        days[dateStr].count++;
        days[dateStr].maxMag = Math.max(days[dateStr].maxMag, q.magnitude);
      }
    });
    
    return Object.values(days);
  }, [quakes]);

  return (
    <div className="pb-8 animate-fade-in-up">
      <div className="px-5 pt-4 pb-4">
        <div className="mb-6">
          <h2 className="text-2xl font-serif mb-1">Activité Sismique</h2>
          <p className="text-xs text-muted-foreground font-mono">Rayon de 300km, 30 derniers jours</p>
        </div>

        {loading && (
          <div className="flex items-center gap-2 py-4">
            <div className="h-2 w-2 rounded-full bg-foreground animate-pulse" />
            <span className="text-xs text-muted-foreground">Chargement...</span>
          </div>
        )}

        {!loading && quakes.length === 0 && (
          <div className="bg-secondary/50 rounded-xl p-4 border border-border">
            <p className="text-sm text-foreground">Aucune secousse enregistrée dans cette zone récemment. Le sol est calme.</p>
          </div>
        )}

        {!loading && quakes.length > 0 && (
          <>
            <div className="bg-pastel-red-bg/50 rounded-xl p-4 border border-pastel-red-text/10 mb-6">
              <p className="text-sm text-foreground leading-relaxed">
                L'activité est {maxMag >= 5 ? "marquée" : maxMag >= 3 ? "modérée" : "calme"}. 
                <strong className="font-medium text-pastel-red-text mx-1">{quakes.length} secousses</strong> 
                ont été enregistrées ce mois-ci, la plus forte atteignant une magnitude de <strong className="font-mono text-pastel-red-text">M{maxMag.toFixed(1)}</strong>.
              </p>
              {onShowOnMap && (
                <button 
                  onClick={onShowOnMap}
                  className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 bg-pastel-red-bg text-pastel-red-text rounded-lg border border-pastel-red-text/20 text-xs uppercase tracking-widest hover:bg-pastel-red-text hover:text-white transition-colors"
                >
                  <HugeiconsIcon icon={Location01Icon} size={14} />
                  Afficher sur la carte
                </button>
              )}
            </div>

            <div className="mb-8">
              <SectionTitle icon={Alert02Icon}>Chronologie (30 jours)</SectionTitle>
              <div className="h-[100px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={timelineData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <XAxis dataKey="date" hide />
                    <YAxis hide domain={[0, 'dataMax']} />
                    <Bar dataKey="maxMag" radius={[4, 4, 4, 4]}>
                      {timelineData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.maxMag >= 4 ? '#d9a0a0' : entry.maxMag > 0 ? '#e6c875' : '#f0f0f0'} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <SectionTitle icon={Location01Icon}>Détail des secousses</SectionTitle>
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
          </>
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
    <div className="bg-card p-3 border-r border-b border-border">
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
