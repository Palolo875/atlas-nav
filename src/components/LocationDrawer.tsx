import { useState, useEffect, useMemo } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from "@/components/ui/drawer";
import type { WeatherData } from "@/lib/weather";
import { getWeatherDescription, getWindDirection } from "@/lib/weather";
import { generateNarrative } from "@/lib/narrative";
import {
  fetchWikipediaSummary, fetchWikimediaPhotos, fetchCountryInfo,
  fetchNearbyPOIs, fetchEarthquakes, fetchGBIFSpecies, fetchEONETEvents, fetchINaturalistSpecies,
  generateGoogleMapsLink, generateAppleMapsLink,
  type WikiSummary, type WikimediaPhoto, type CountryInfo,
  type NearbyPOI, type Earthquake, type GBIFSpecies, type NaturalEvent,
} from "@/lib/enrichment";
import NarrativeCard from "./NarrativeCard";
import HourlyForecast from "./HourlyForecast";
import TemperatureArea from "./TemperatureArea";
import DailyForecast from "./DailyForecast";
import StoryCarousel from "./StoryCarousel";
import GaugeArc from "./GaugeArc";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Navigation03Icon, BookOpen01Icon, Image01Icon,
  Globe02Icon, Location01Icon, Alert02Icon,
  Leaf01Icon, ArrowRight01Icon, Cancel01Icon,
  FastWindIcon, DropletIcon, Sun03Icon,
  Share01Icon, Bookmark02Icon, Search01Icon, Call01Icon
} from "@hugeicons/core-free-icons";
import { detectSituations, calculateModuleWeights, type SituationTrait } from "@/lib/priorities";

interface LocationDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  weather: WeatherData | null;
  locationName: string;
  lat: number;
  lon: number;
  onLayerSelect?: (layer: "none" | "quakes" | "nature", data?: any) => void;
  onTraitsChange?: (traits: Set<SituationTrait>) => void;
  onPhotosLoaded?: (photos: WikimediaPhoto[]) => void;
  zoomLevel?: number;
}

type TabId = "explore" | "meteo" | "autour";

export default function LocationDrawer({ open, onOpenChange, weather, locationName, lat, lon, onLayerSelect, onTraitsChange, onPhotosLoaded, zoomLevel }: LocationDrawerProps) {
  const [activeTab, setActiveTab] = useState<TabId>("explore");
  const [wiki, setWiki] = useState<WikiSummary | null>(null);
  const [photos, setPhotos] = useState<WikimediaPhoto[]>([]);
  const [country, setCountry] = useState<CountryInfo | null>(null);
  const [pois, setPois] = useState<NearbyPOI[]>([]);
  const [quakes, setQuakes] = useState<Earthquake[]>([]);
  const [species, setSpecies] = useState<GBIFSpecies[]>([]);
  const [naturalEvents, setNaturalEvents] = useState<NaturalEvent[]>([]);
  const [enrichLoading, setEnrichLoading] = useState(false);
  const [traits, setTraits] = useState<Set<SituationTrait>>(new Set(["discovery"]));

  const narrative = useMemo(
    () => (weather ? generateNarrative(weather, locationName, traits) : []),
    [weather, locationName, traits]
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
    setNaturalEvents([]);
    
    // Reset to explore tab when opening a new location
    setActiveTab("explore");

    Promise.allSettled([
      fetchWikipediaSummary(lat, lon, locationName).then(setWiki),
      fetchWikimediaPhotos(lat, lon, 6).then(setPhotos),
      fetchCountryInfo(lat, lon).then(setCountry),
      fetchNearbyPOIs(lat, lon, 2000).then(setPois),
      fetchEarthquakes(lat, lon, 300, 30).then(setQuakes),
      fetchGBIFSpecies(lat, lon).then(s => setSpecies(prev => [...prev, ...s])),
      fetchINaturalistSpecies(lat, lon).then(s => setSpecies(prev => [...prev, ...s])),
      fetchEONETEvents(lat, lon, 500).then(setNaturalEvents),
    ]).then((results) => {
      // Once all (or most) data is in, detect situations
      const wp = results[0].status === 'fulfilled' ? results[0].value : null;
      const cp = results[3].status === 'fulfilled' ? results[3].value : [];
      const eq = results[4].status === 'fulfilled' ? results[4].value : [];
      const pt = results[1].status === 'fulfilled' ? results[1].value : [];
      
      if (pt.length > 0) onPhotosLoaded?.(pt);

      const newTraits = detectSituations({
        locationName,
        weather,
        pois: cp,
        quakes: eq,
        wiki: wp,
        zoomLevel,
        poiCount: cp.length,
      });
      setTraits(newTraits);
      onTraitsChange?.(newTraits);
    }).finally(() => setEnrichLoading(false));
  }, [open, lat, lon, locationName, weather, zoomLevel]);

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
              className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-widest text-foreground bg-background/90 backdrop-blur-md px-3 py-2 rounded-xl border border-border shadow-sm hover:bg-secondary transition-all"
            >
              <HugeiconsIcon icon={ArrowRight01Icon} size={14} className="rotate-180" />
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
        <div className={`transition-all duration-300 overflow-hidden ${activeTab === 'explore' ? 'opacity-100 max-h-[80px]' : 'opacity-0 max-h-0'}`}>
          <div className="px-5 pb-4 mt-1">
            <div className="flex gap-2.5 overflow-x-auto hide-scrollbar snap-x pb-2">
              {traits.has("VITAL") && (
                <a
                  href="tel:112"
                  className="snap-start shrink-0 h-10 flex items-center gap-2 rounded-full border border-pastel-red-text/50 bg-pastel-red-bg px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-pastel-red-text animate-pulse shadow-sm hover:scale-105 active:scale-95 transition-transform"
                >
                  <HugeiconsIcon icon={Call01Icon} size={14} />
                  Appeler (112)
                </a>
              )}
              <a
                href={generateGoogleMapsLink(lat, lon)}
                target="_blank"
                rel="noopener noreferrer"
                className={`snap-start shrink-0 h-10 flex items-center gap-2 rounded-full px-4 py-2 text-[11px] font-medium uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-sm ${
                  traits.has("VITAL") 
                    ? 'bg-foreground text-background shadow-glow-subtle' 
                    : 'bg-secondary/70 text-foreground border border-border/50 hover:bg-secondary'
                }`}
              >
                <HugeiconsIcon icon={Navigation03Icon} size={14} />
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
                className="snap-start shrink-0 h-10 flex items-center gap-2 rounded-full border border-border/50 bg-secondary/70 px-4 py-2 text-[11px] font-medium uppercase tracking-widest text-foreground hover:bg-secondary hover:scale-105 active:scale-95 transition-all shadow-sm"
              >
                <HugeiconsIcon icon={Share01Icon} size={14} />
                Partager
              </button>
              <button className="snap-start shrink-0 h-10 flex items-center gap-2 rounded-full border border-border/50 bg-secondary/70 px-4 py-2 text-[11px] font-medium uppercase tracking-widest text-foreground hover:bg-secondary hover:scale-105 active:scale-95 transition-all shadow-sm">
                <HugeiconsIcon icon={Bookmark02Icon} size={14} />
                Enregistrer
              </button>
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
              naturalEvents={naturalEvents}
              lat={lat}
              lon={lon}
              locationName={locationName}
              loading={enrichLoading}
              setActiveTab={setActiveTab}
              weather={weather}
              narrative={narrative}
              traits={traits}
              onLayerSelect={onLayerSelect}
            />
          )}
          {activeTab === "meteo" && (
            <MeteoTab weather={weather} />
          )}
          {activeTab === "autour" && (
            <AutourTab
              pois={pois}
              loading={enrichLoading}
              lat={lat}
              lon={lon}
              traits={traits}
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
      {/* Hourly / Temperature Area */}
      <div className="px-5 pt-4 pb-2">
        <SectionTitle>Évolution (24h)</SectionTitle>
        <TemperatureArea hourly={weather.hourly} />
      </div>

      {/* Daily */}
      <div className="px-5 pt-4 pb-4 border-t border-border">
        <SectionTitle>7 prochains jours</SectionTitle>
        <DailyForecast daily={weather.daily} />
      </div>

      {/* Gauges for UV and AQI */}
      <div className="px-5 pt-4 pb-4 border-t border-border">
        <SectionTitle>Qualité de l'environnement</SectionTitle>
        <div className="flex justify-around items-end mt-6 mb-4">
          <GaugeArc 
            value={current.uvIndex} 
            min={0} 
            max={11} 
            label="Index UV" 
            size={130}
            colorStops={[
              { offset: "0%", color: "#93b399" }, // Low
              { offset: "50%", color: "#e6c875" }, // Moderate/High
              { offset: "100%", color: "#d9a0a0" } // Very High/Extreme
            ]}
          />
          
          {weather.airQuality && (
            <GaugeArc 
              value={weather.airQuality.aqi} 
              min={0} 
              max={100} 
              label="AQI" 
              size={130}
              colorStops={[
                { offset: "0%", color: "#93b399" }, // Good
                { offset: "50%", color: "#e6c875" }, // Moderate
                { offset: "100%", color: "#d9a0a0" } // Unhealthy
              ]}
            />
          )}
        </div>
      </div>

      {/* Metrics bento */}
      <div className="px-5 pb-4 pt-4 border-t border-border">
        <SectionTitle>Données détaillées</SectionTitle>
        <div className="grid grid-cols-2 gap-2 mt-4">
          <MetricCell label="Pression" value={`${current.pressure.toFixed(0)} hPa`} />
          <MetricCell label="Visibilité" value={`${(current.visibility / 1000).toFixed(1)} km`} />
          <MetricCell label="Point de rosée" value={`${current.dewPoint.toFixed(1)}°C`} />
          <MetricCell label="Couverture nuageuse" value={`${current.cloudCover}%`} />
          <MetricCell label="Altitude" value={`${weather.elevation.toFixed(0)}m`} />
          {weather.airQuality && (
            <>
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
  wiki, photos, country, pois, quakes, species, naturalEvents, lat, lon, locationName, loading, setActiveTab, weather, narrative, traits, onLayerSelect
}: {
  wiki: WikiSummary | null;
  photos: WikimediaPhoto[];
  country: CountryInfo | null;
  pois: NearbyPOI[];
  quakes: Earthquake[];
  species: GBIFSpecies[];
  naturalEvents: NaturalEvent[];
  lat: number;
  lon: number;
  locationName: string;
  loading: boolean;
  setActiveTab: (tab: TabId) => void;
  weather: WeatherData;
  narrative: any[];
  traits: Set<SituationTrait>;
  onLayerSelect?: (layer: "none" | "quakes" | "nature", data?: any) => void;
}) {
  const priorities = useMemo(() => calculateModuleWeights(traits), [traits]);

  return (
    <div className="space-y-2">
      {/* ─── Situation Signals (Mood/Intelligence) ─── */}
      {!loading && (
        <div className="px-5 pt-4 flex flex-wrap gap-2 animate-fade-in">
          {traits.has("VITAL") && (
            <div className="bg-pastel-red-bg border border-pastel-red-text/20 text-pastel-red-text px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-pastel-red-text animate-pulse" />
              Assistance & Services
            </div>
          )}
          {traits.has("WILD") && (
            <div className="bg-pastel-green-bg border border-pastel-green-text/20 text-pastel-green-text px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
              <HugeiconsIcon icon={Leaf01Icon} size={12} />
              Zone Sauvage & Naturelle
            </div>
          )}
          {quakes.length > 0 && Math.max(...quakes.map(q => q.magnitude)) >= 3 && (
            <div className="bg-amber-100 dark:bg-amber-900/30 border border-amber-500/20 text-amber-700 dark:text-amber-400 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
              <HugeiconsIcon icon={Alert02Icon} size={12} />
               Vigilance Sismique
            </div>
          )}
          {weather.temp > 30 && (
            <div className="bg-orange-100 dark:bg-orange-900/30 border border-orange-500/20 text-orange-700 dark:text-orange-400 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
              <HugeiconsIcon icon={AiIcon} size={12} />
              Chaleur Intense
            </div>
          )}
          {!wiki && pois.length === 0 && (
            <div className="bg-secondary/50 border border-border/50 text-muted-foreground px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
              <HugeiconsIcon icon={Globe02Icon} size={12} />
              Zone Hors-Piste
            </div>
          )}
        </div>
      )}

      {priorities.map((moduleId) => renderModule(moduleId))}
    </div>
  );

  function renderModule(moduleId: string) {
    switch (moduleId) {
      case "narrative":
        return (
          <div key="narrative" className="px-5 pt-4 pb-2 border-t border-border">
            <div className="flex items-center justify-between mb-3">
              <SectionTitle className="mb-0">Analyse contextuelle</SectionTitle>
              <button 
                onClick={() => setActiveTab('meteo')}
                className="text-[10px] uppercase tracking-widest text-foreground hover:text-background transition-colors flex items-center gap-1 bg-secondary hover:bg-foreground px-3 py-1.5 rounded-full border border-border shadow-sm"
              >
                Détails météo
                <HugeiconsIcon icon={ArrowRight01Icon} size={10} />
              </button>
            </div>
            {narrative.map((insight, i) => (
              <NarrativeCard key={insight.category + i} insight={insight} index={i} />
            ))}
          </div>
        );
      
      case "story":
        return !loading && (
          <div key="story" className="pt-4">
            <StoryCarousel 
              quakes={quakes} 
              species={species} 
              wiki={wiki} 
              naturalEvents={naturalEvents}
              onSelectStory={(id) => {
                if (id === 'nature' && onLayerSelect) onLayerSelect('nature', species);
                if (id === 'quakes' && onLayerSelect) onLayerSelect('quakes', quakes);
              }} 
            />
          </div>
        );

      case "isolated_brief": {
          <div key="isolated_brief" className="px-5 pt-4 pb-8 border-b border-border animate-fade-in-up">
            <div className="relative bg-secondary/20 rounded-[32px] p-8 border border-border/50 text-center overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-foreground/5 to-transparent opacity-50" />
              <div className="relative z-10 flex flex-col items-center">
                <div className="w-16 h-16 bg-background rounded-full flex items-center justify-center shadow-xl border border-border mb-6">
                  <HugeiconsIcon icon={Globe02Icon} size={32} className="text-muted-foreground" />
                </div>
                <h3 className="font-serif text-2xl text-foreground mb-4">L'essentiel du lieu</h3>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-[240px] mx-auto mb-6">
                  Ce point est déconnecté des infrastructures humaines. Ici, la nature impose son propre rythme.
                </p>
                <div className="flex gap-4">
                  <div className="text-center">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Silence</p>
                    <p className="text-sm font-medium">95-100%</p>
                  </div>
                  <div className="w-px h-8 bg-border" />
                  <div className="text-center">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Pollution</p>
                    <p className="text-sm font-medium">0.0%</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      }

      case "photos":
        return photos.length > 0 && (
          <div key="photos" className="px-5 pt-4 pb-4 border-b border-border animate-fade-in-up">
            <SectionTitle icon={Image01Icon}>Photos du lieu</SectionTitle>
            <div className="grid grid-cols-3 gap-2 rounded-xl overflow-hidden">
              {photos.map((p, i) => (
                <a key={i} href={p.url} target="_blank" rel="noopener noreferrer" className="block relative group">
                  <img
                    src={p.thumbUrl}
                    alt={p.title}
                    className="w-full h-24 object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                </a>
              ))}
            </div>
          </div>
        );

      case "wiki_brief":
        return wiki && (
          <div key="wiki_brief" className="px-5 pt-4 pb-4 border-b border-border animate-fade-in-up">
            <SectionTitle icon={BookOpen01Icon}>À propos</SectionTitle>
            <div className="flex gap-3">
              {wiki.thumbnail && (
                <img src={wiki.thumbnail} alt={wiki.title} className="w-20 h-20 rounded-xl object-cover border border-border shrink-0" loading="lazy" />
              )}
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-medium text-foreground mb-1 truncate">{wiki.title}</h3>
                {wiki.description && (
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">{wiki.description}</p>
                )}
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{wiki.extract}</p>
              </div>
            </div>
            
            {/* Wikidata Facts if they exist */}
            {wiki.facts && Object.keys(wiki.facts).length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-2">
                {wiki.facts.population && (
                  <MetricCell label="Population" value={formatPopulation(wiki.facts.population)} />
                )}
                {wiki.facts.area && (
                  <MetricCell label="Superficie" value={`${wiki.facts.area.toLocaleString("fr-FR")} km²`} />
                )}
                {wiki.facts.elevation && (
                  <MetricCell label="Altitude (Wiki)" value={`${wiki.facts.elevation} m`} />
                )}
              </div>
            )}

            {wiki.url && (
              <a
                href={wiki.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-foreground hover:text-primary transition-colors"
              >
                Lire la suite
                <HugeiconsIcon icon={ArrowRight01Icon} size={10} />
              </a>
            )}
          </div>
        );

      case "events_brief":
        return naturalEvents.length > 0 && (
          <div key="events_brief" className="px-5 pt-4 pb-4 border-b border-border animate-fade-in-up">
            <SectionTitle icon={Alert02Icon}>Événements Naturels (NASA)</SectionTitle>
            <div className="space-y-2">
              {naturalEvents.map((evt, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-pastel-red-text/20 bg-pastel-red-bg/30">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground mb-0.5">{evt.title}</p>
                    <p className="text-xs text-pastel-red-text">{evt.category}</p>
                  </div>
                  <span className="text-xs font-mono text-pastel-red-text ml-3 font-medium shrink-0">
                    {evt.distanceKm} km
                  </span>
                </div>
              ))}
            </div>
          </div>
        );

      case "country":
        return country && (
          <div key="country" className="px-5 pt-4 pb-4 border-b border-border animate-fade-in-up">
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
              {country.emergency && (
                <div className="mt-3 pt-3 border-t border-border/50">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
                    <HugeiconsIcon icon={Call01Icon} size={10} />
                    Numéros d'urgence
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-pastel-red-bg/20 rounded-lg px-2 py-1 flex justify-between items-center">
                      <span className="text-[10px] text-pastel-red-text">Général</span>
                      <span className="text-sm font-mono font-bold text-pastel-red-text">{country.emergency.all}</span>
                    </div>
                    {country.emergency.police && (
                      <div className="bg-secondary/50 rounded-lg px-2 py-1 flex justify-between items-center">
                        <span className="text-[10px] text-muted-foreground">Police</span>
                        <span className="text-sm font-mono text-foreground">{country.emergency.police}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case "pois":
        return pois.length > 0 && (
          <div key="pois" className="px-5 pt-4 pb-4 border-b border-border animate-fade-in-up">
            <div className="flex items-center justify-between mb-3">
              <SectionTitle icon={Location01Icon} className="mb-0">
                Proximité {traits.has("VITAL") ? " & Assistance" : ""}
              </SectionTitle>
              <button
                onClick={() => setActiveTab("autour")}
                className="text-[10px] uppercase tracking-widest text-foreground hover:text-background transition-colors flex items-center gap-1 bg-secondary hover:bg-foreground px-3 py-1.5 rounded-full border border-border shadow-sm"
              >
                Tout voir
                <HugeiconsIcon icon={ArrowRight01Icon} size={10} />
              </button>
            </div>
            <div className="space-y-0">
              {pois.slice(0, 5).map((poi, i) => (
                <div key={i} className={`flex items-center justify-between py-2 border-b border-border last:border-0 ${poi.category === 'Hôpital' || poi.category === 'Pharmacie' ? 'bg-pastel-red-bg/20 -mx-2 px-2 rounded-lg' : ''}`}>
                  <div className="flex items-start gap-2 min-w-0 flex-1">
                    <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[9px] uppercase tracking-wider mt-0.5 ${
                      poi.category === 'Hôpital' || poi.category === 'Pharmacie' 
                        ? 'bg-pastel-red-bg text-pastel-red-text font-bold' 
                        : 'bg-secondary text-muted-foreground'
                    }`}>
                      {poi.category}
                    </span>
                    <span className={`text-sm truncate ${poi.category === 'Hôpital' ? 'font-medium text-foreground' : 'text-foreground'}`}>{poi.name}</span>
                  </div>
                  <span className="text-xs font-mono text-muted-foreground ml-2 shrink-0">
                    {poi.distance < 1000 ? `${poi.distance}m` : `${(poi.distance / 1000).toFixed(1)}km`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );

      case "nature_brief":
        return species.length > 0 && (
          <div key="nature_brief" className="px-5 pt-4 pb-4 border-b border-border animate-fade-in-up">
            <SectionTitle icon={Leaf01Icon}>Biodiversité</SectionTitle>
            <div className="bg-pastel-green-bg/30 rounded-xl p-3 border border-pastel-green-text/10">
              <p className="text-sm text-foreground leading-relaxed">
                <strong className="font-mono text-pastel-green-text">{species.length} espèces</strong> répertoriées dans cette zone.
                {species[0] && ` Espèce principale : ${species[0].vernacularName || species[0].scientificName} (${species[0].count} observations).`}
              </p>
              <button
                onClick={() => onLayerSelect?.('nature', species)}
                className="mt-3 flex items-center gap-2 text-[10px] uppercase tracking-widest text-pastel-green-text hover:text-foreground transition-colors"
              >
                <HugeiconsIcon icon={Location01Icon} size={12} />
                Voir sur la carte
              </button>
            </div>
          </div>
        );

      case "quakes_brief": {
        if (quakes.length === 0) return null;
        const maxMag = Math.max(...quakes.map(q => q.magnitude));
        return (
          <div key="quakes_brief" className="px-5 pt-4 pb-4 border-b border-border animate-fade-in-up">
            <SectionTitle icon={Alert02Icon}>Activité sismique</SectionTitle>
            <div className="bg-pastel-red-bg/30 rounded-xl p-3 border border-pastel-red-text/10">
              <p className="text-sm text-foreground leading-relaxed">
                <strong className="font-mono text-pastel-red-text">{quakes.length} secousses</strong> enregistrées (30 jours, 300 km).
                Magnitude max : <strong className="font-mono text-pastel-red-text">M{maxMag.toFixed(1)}</strong>.
              </p>
              <button
                onClick={() => onLayerSelect?.('quakes', quakes)}
                className="mt-3 flex items-center gap-2 text-[10px] uppercase tracking-widest text-pastel-red-text hover:text-foreground transition-colors"
              >
                <HugeiconsIcon icon={Location01Icon} size={12} />
                Voir sur la carte
              </button>
            </div>
          </div>
        );
      }

      case "navigation":
        return (
          <div key="navigation" className="px-5 pt-4 pb-4 animate-fade-in-up">
            <SectionTitle icon={Navigation03Icon}>Navigation</SectionTitle>
            <p className="text-[11px] text-muted-foreground mb-3 font-mono">
              Ouvrez votre application de navigation préférée pour un itinéraire fiable.
            </p>
            <div className="flex gap-2">
              <a
                href={generateGoogleMapsLink(lat, lon)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-border bg-background shadow-sm px-3 py-2.5 text-xs font-medium uppercase tracking-widest text-foreground hover:bg-secondary transition-all"
              >
                Google Maps
              </a>
              <a
                href={generateAppleMapsLink(lat, lon, locationName)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-border bg-background shadow-sm px-3 py-2.5 text-xs font-medium uppercase tracking-widest text-foreground hover:bg-secondary transition-all"
              >
                Apple Maps
              </a>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="pb-8">
      {loading ? (
        <ExploreSkeleton />
      ) : (
        priorities.map((p) => renderModule(p.id))
      )}
    </div>
  );
}

// ─── Autour Tab (POI Browser) ────────────────────────────────────────
const POI_CATEGORIES = [
  { key: "all", label: "Tout" },
  { key: "Restaurant", label: "Restaurants" },
  { key: "Hôtel", label: "Hôtels" },
  { key: "Commerce", label: "Commerces" },
  { key: "Musée", label: "Culture" },
  { key: "Transport", label: "Transports" },
  { key: "Hôpital", label: "Santé" },
  { key: "Pharmacie", label: "Santé" },
  { key: "other", label: "Autres" },
];

function AutourTab({ pois, loading, lat, lon, traits }: {
  pois: NearbyPOI[];
  loading: boolean;
  lat: number;
  lon: number;
  traits: Set<SituationTrait>;
}) {
  const [activeFilter, setActiveFilter] = useState("all");

  // Deduplicate category labels for chips
  const availableCategories = useMemo(() => {
    const cats = new Set(pois.map(p => p.category));
    const chips = [{ key: "all", label: "Tout" }];
    const seen = new Set<string>();
    
    POI_CATEGORIES.forEach(c => {
      if (c.key === "all" || c.key === "other") return;
      if (cats.has(c.key) && !seen.has(c.label)) {
        chips.push(c);
        seen.add(c.label);
      }
    });
    
    // Check for uncategorized
    const knownCats = new Set(POI_CATEGORIES.map(c => c.key));
    const hasOther = pois.some(p => !knownCats.has(p.category));
    if (hasOther) chips.push({ key: "other", label: "Autres" });
    
    return chips;
  }, [pois]);

  const filteredPois = useMemo(() => {
    if (activeFilter === "all") return pois;
    if (activeFilter === "other") {
      const knownCats = new Set(POI_CATEGORIES.map(c => c.key));
      return pois.filter(p => !knownCats.has(p.category));
    }
    // Handle merged categories (e.g. Hôpital + Pharmacie → "Santé")
    const matchingKeys = POI_CATEGORIES
      .filter(c => c.label === POI_CATEGORIES.find(pc => pc.key === activeFilter)?.label)
      .map(c => c.key);
    return pois.filter(p => matchingKeys.includes(p.category));
  }, [pois, activeFilter]);

  return (
    <div className="pb-8 animate-fade-in-up">
      <div className="px-5 pt-4 pb-4">
        <div className="mb-4">
          <h2 className="text-2xl font-serif mb-1">Autour de vous</h2>
          <p className="text-xs text-muted-foreground font-mono">
            {pois.length} lieux dans un rayon de 2 km
          </p>
        </div>

        {/* Filter Chips */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-3 snap-x">
          {availableCategories.map(cat => (
            <button
              key={cat.key}
              onClick={() => setActiveFilter(cat.key)}
              className={`snap-start shrink-0 rounded-full px-3 py-1.5 text-[10px] uppercase tracking-widest border transition-all ${
                activeFilter === cat.key
                  ? "bg-foreground text-background border-foreground font-bold shadow-sm"
                  : "bg-transparent text-foreground border-border hover:bg-secondary"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {loading ? (
          <AutourSkeleton />
        ) : pois.length === 0 ? (
          <div className="bg-secondary/50 rounded-xl p-4 border border-border mt-2">
            <p className="text-sm text-foreground">Aucun lieu d'intérêt trouvé dans cette zone.</p>
            <p className="text-xs text-muted-foreground mt-1">Essayez un endroit plus peuplé, ou zoomez sur une agglomération.</p>
          </div>
        ) : filteredPois.length === 0 ? (
          <div className="bg-secondary/50 rounded-xl p-4 border border-border mt-2">
            <p className="text-sm text-foreground">Aucun résultat pour ce filtre.</p>
          </div>
        ) : (
          <div className="space-y-0 mt-2">
            {filteredPois.map((poi, i) => {
            const isEmergency = poi.category === 'Hôpital' || poi.category === 'Pharmacie' || poi.category === 'Police';
            return (
              <a
                key={i}
                href={generateGoogleMapsLink(poi.lat || lat, poi.lon || lon)}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center justify-between py-3 border-b border-border last:border-0 hover:bg-secondary/50 transition-colors -mx-2 px-2 rounded-lg ${
                  isEmergency && traits.has("VITAL") ? 'bg-pastel-red-bg/20' : ''
                }`}
                style={{ animationDelay: `${i * 20}ms` }}
              >
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[9px] uppercase tracking-wider mt-0.5 ${
                    isEmergency
                      ? 'bg-pastel-red-bg text-pastel-red-text font-bold'
                      : 'bg-secondary text-muted-foreground'
                  }`}>
                    {poi.category}
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className="text-sm text-foreground truncate block">{poi.name}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className="text-xs font-mono text-muted-foreground">
                    {poi.distance < 1000 ? `${poi.distance}m` : `${(poi.distance / 1000).toFixed(1)}km`}
                  </span>
                  <HugeiconsIcon icon={ArrowRight01Icon} size={12} className="text-muted-foreground" />
                </div>
              </a>
            );
          })}
        </div>
        )}
      </div>
    </div>
  );
}

// ─── Loading Skeletons ───────────────────────────────────────────────
function ExploreSkeleton() {
  return (
    <div className="px-5 py-6 space-y-8 animate-pulse">
      {/* Narrative Skeleton */}
      <div className="space-y-3">
        <div className="h-4 w-1/3 bg-secondary rounded" />
        <div className="h-20 w-full bg-secondary rounded-xl" />
        <div className="h-20 w-full bg-secondary rounded-xl" />
      </div>
      {/* Story Skeleton */}
      <div className="h-48 w-full bg-secondary rounded-xl" />
      {/* Photos Skeleton */}
      <div className="space-y-3">
        <div className="h-4 w-1/4 bg-secondary rounded" />
        <div className="grid grid-cols-3 gap-2">
          <div className="h-24 bg-secondary rounded-xl" />
          <div className="h-24 bg-secondary rounded-xl" />
          <div className="h-24 bg-secondary rounded-xl" />
        </div>
      </div>
    </div>
  );
}

function AutourSkeleton() {
  return (
    <div className="space-y-4 py-4 animate-pulse">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex justify-between items-center py-2">
          <div className="flex gap-3 items-center">
            <div className="h-5 w-16 bg-secondary rounded-full" />
            <div className="h-4 w-32 bg-secondary rounded" />
          </div>
          <div className="h-3 w-8 bg-secondary rounded" />
        </div>
      ))}
    </div>
  );
}

// ─── Shared primitives ───────────────────────────────────────────────
function SectionTitle({ children, icon, className }: { children: React.ReactNode; icon?: any; className?: string }) {
  return (
    <h2 className={`flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3 ${className || ''}`}>
      {icon && <HugeiconsIcon icon={icon} size={13} />}
      {children}
    </h2>
  );
}

function MetricCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-background rounded-xl p-3 border border-border shadow-sm">
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
