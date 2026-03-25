import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { HugeiconsIcon } from "@hugeicons/react";
import { Layers01Icon } from "@hugeicons/core-free-icons";

interface MapViewProps {
  center: [number, number]; // [lon, lat]
  zoom: number;
  onMapClick?: (lat: number, lon: number) => void;
  markerPosition?: [number, number] | null;
}

const MAP_STYLES = {
  plan: {
    name: "Plan",
    url: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
    thumbnail: "https://cartodb-basemaps-a.global.ssl.fastly.net/light_all/13/4166/2819.png"
  },
  satellite: {
    name: "Satellite",
    url: {
      version: 8,
      sources: {
        "esri-satellite": {
          type: "raster",
          tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
          tileSize: 256
        }
      },
      layers: [
        {
          id: "satellite",
          type: "raster",
          source: "esri-satellite",
          minzoom: 0,
          maxzoom: 22
        }
      ]
    },
    thumbnail: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/13/2819/4166"
  },
  sombre: {
    name: "Sombre",
    url: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
    thumbnail: "https://cartodb-basemaps-a.global.ssl.fastly.net/dark_all/13/4166/2819.png"
  }
};

type StyleKey = keyof typeof MAP_STYLES;

export default function MapView({ center, zoom, onMapClick, markerPosition }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const [currentStyle, setCurrentStyle] = useState<StyleKey>("plan");

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLES[currentStyle].url as any,
      center,
      zoom,
      attributionControl: {},
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), "bottom-right");
    map.addControl(new maplibregl.ScaleControl({ maxWidth: 120 }), "bottom-left");

    map.on("click", (e) => {
      onMapClick?.(e.lngLat.lat, e.lngLat.lng);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Handle style change
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setStyle(MAP_STYLES[currentStyle].url as any);
  }, [currentStyle]);

  // Fly to center when it changes
  const prevCenter = useRef(center);
  useEffect(() => {
    if (!mapRef.current) return;
    if (prevCenter.current[0] !== center[0] || prevCenter.current[1] !== center[1]) {
      mapRef.current.flyTo({ center, zoom, duration: 1200 });
      prevCenter.current = center;
    }
  }, [center, zoom]);

  // Marker
  useEffect(() => {
    if (!mapRef.current) return;

    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }

    if (markerPosition) {
      const el = document.createElement("div");
      el.style.width = "14px";
      el.style.height = "14px";
      el.style.borderRadius = "50%";
      el.style.background = "#111";
      el.style.border = "3px solid #fff";
      el.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)";

      markerRef.current = new maplibregl.Marker({ element: el })
        .setLngLat(markerPosition)
        .addTo(mapRef.current);
    }
  }, [markerPosition]);

  return (
    <>
      <div ref={containerRef} className="absolute inset-0" />
      
      {/* Layer Selector */}
      <div className="absolute top-4 right-4 z-10">
        <Popover>
          <PopoverTrigger asChild>
            <button className="h-10 w-10 bg-background/90 backdrop-blur-md border border-border shadow-sm rounded-full flex items-center justify-center text-foreground hover:bg-secondary transition-colors">
              <HugeiconsIcon icon={Layers01Icon} size={20} />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-auto p-3 rounded-2xl bg-background/95 backdrop-blur-xl border-border/50 shadow-xl">
            <div className="flex gap-3">
              {(Object.keys(MAP_STYLES) as StyleKey[]).map((key) => {
                const style = MAP_STYLES[key];
                const isActive = currentStyle === key;
                return (
                  <button
                    key={key}
                    onClick={() => setCurrentStyle(key)}
                    className="flex flex-col items-center gap-2 group outline-none"
                  >
                    <div className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all duration-300 ${isActive ? 'border-primary shadow-md scale-105' : 'border-transparent shadow-sm hover:scale-105 hover:shadow-md'}`}>
                      <img src={style.thumbnail} alt={style.name} className="w-full h-full object-cover" />
                    </div>
                    <span className={`text-[11px] uppercase tracking-wider font-medium transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`}>
                      {style.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </>
  );
}
