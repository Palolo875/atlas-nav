import { useState, useCallback } from "react";
import MapView from "@/components/MapView";
import SearchBar from "@/components/SearchBar";
import LocationDrawer from "@/components/LocationDrawer";
import { fetchWeather, type WeatherData } from "@/lib/weather";
import { reverseGeocode, type GeoResult } from "@/lib/geocoder";
import { HugeiconsIcon } from "@hugeicons/react";
import { CompassIcon } from "@hugeicons/core-free-icons";

export default function Index() {
  const [center, setCenter] = useState<[number, number]>([2.3522, 48.8566]);
  const [zoom] = useState(6);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [locationName, setLocationName] = useState("");
  const [markerPos, setMarkerPos] = useState<[number, number] | null>(null);
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lon: number }>({ lat: 48.8566, lon: 2.3522 });

  const loadWeather = useCallback(async (lat: number, lon: number, name?: string) => {
    setLoading(true);
    try {
      const [data, resolvedName] = await Promise.all([
        fetchWeather(lat, lon),
        name ? Promise.resolve(name) : reverseGeocode(lat, lon),
      ]);
      setWeather(data);
      setLocationName(resolvedName);
      setCenter([lon, lat]);
      setMarkerPos([lon, lat]);
      setSelectedCoords({ lat, lon });
      setDrawerOpen(true);
    } catch (e) {
      console.error("Weather fetch failed:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearchSelect = (result: GeoResult) => {
    loadWeather(result.lat, result.lon, result.name);
  };

  const handleMapClick = (lat: number, lon: number) => {
    loadWeather(lat, lon);
  };

  const handleGeolocate = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => loadWeather(pos.coords.latitude, pos.coords.longitude),
      () => {}
    );
  };

  return (
    <div className="h-screen w-screen overflow-hidden relative">
      <MapView center={center} zoom={zoom} onMapClick={handleMapClick} markerPosition={markerPos} />

      {/* Search overlay */}
      <div className="absolute top-4 left-4 right-4 z-10 flex items-start gap-2 md:right-auto md:w-[400px]">
        <SearchBar onSelect={handleSearchSelect} />
        <button
          onClick={handleGeolocate}
          className="shrink-0 flex items-center justify-center w-[44px] h-[44px] rounded-xl border border-border/50 bg-background/90 backdrop-blur-md shadow-sm hover:bg-secondary hover:shadow-md transition-all"
          title="Ma position"
        >
          <HugeiconsIcon icon={CompassIcon} size={18} className="text-foreground" />
        </button>
      </div>

      {/* Loading indicator */}
      {loading && (
        <div className="absolute top-16 left-4 z-10 flex items-center gap-2 rounded-lg border border-overlay-border bg-overlay px-3 py-2 shadow-subtle">
          <div className="h-2 w-2 rounded-full bg-foreground animate-pulse" />
          <span className="text-xs text-muted-foreground">Chargement...</span>
        </div>
      )}

      {/* Bottom sheet drawer */}
      <LocationDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        weather={weather}
        locationName={locationName}
        lat={selectedCoords.lat}
        lon={selectedCoords.lon}
      />

      {/* Branding */}
      {!drawerOpen && (
        <div className="absolute bottom-6 left-4 z-10 animate-fade-in-up">
          <div className="rounded-lg border border-overlay-border bg-overlay px-4 py-3 shadow-subtle">
            <h2 className="font-serif text-lg">Atlas Weather</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Cliquez sur la carte ou recherchez un lieu</p>
          </div>
        </div>
      )}
    </div>
  );
}
