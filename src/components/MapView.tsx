import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { HugeiconsIcon } from "@hugeicons/react";
import { Layers01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import type { MapProjectionData } from "@/pages/Index";

interface MapViewProps {
  center: [number, number]; // [lon, lat]
  zoom: number;
  onMapClick?: (lat: number, lon: number) => void;
  markerPosition?: [number, number] | null;
  projectionData?: MapProjectionData;
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

export default function MapView({ center, zoom, onMapClick, markerPosition, projectionData }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const [currentStyle, setCurrentStyle] = useState<StyleKey>("plan");
  const [activeProjection, setActiveProjection] = useState<MapProjectionData>(null);

  // Sync projection data
  useEffect(() => {
    setActiveProjection(projectionData || null);
    if (projectionData && projectionData.type === 'quakes') {
      setCurrentStyle("sombre"); // Force dark mode for quakes
    }
  }, [projectionData]);

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

    if (markerPosition && !activeProjection) {
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
  }, [markerPosition, activeProjection]);

  // Handle Map Projections (Quakes, Nature)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Helper to safely remove layers and sources
    const cleanupMap = () => {
      if (map.getLayer("quakes-layer")) map.removeLayer("quakes-layer");
      if (map.getLayer("quakes-labels")) map.removeLayer("quakes-labels");
      if (map.getSource("quakes")) map.removeSource("quakes");

      if (map.getLayer("nature-layer")) map.removeLayer("nature-layer");
      if (map.getLayer("nature-labels")) map.removeLayer("nature-labels");
      if (map.getSource("nature")) map.removeSource("nature");
    };

    const setupProjections = () => {
      cleanupMap();

      if (!activeProjection) return;

      if (activeProjection.type === 'quakes') {
        const geojsonData: GeoJSON.FeatureCollection = {
          type: "FeatureCollection",
          features: activeProjection.data.map((q: any) => ({
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [q.lon, q.lat]
            },
            properties: {
              mag: q.magnitude,
              place: q.place
            }
          }))
        };

        map.addSource("quakes", {
          type: "geojson",
          data: geojsonData
        });

        // Add circles for quakes
        map.addLayer({
          id: "quakes-layer",
          type: "circle",
          source: "quakes",
          paint: {
            "circle-radius": [
              "interpolate",
              ["linear"],
              ["get", "mag"],
              2, 6,
              5, 20
            ],
            "circle-color": [
              "step",
              ["get", "mag"],
              "#e6c875", // Yellow for small
              4, "#c49a6c", // Orange for medium
              5, "#d9a0a0"  // Red for large
            ],
            "circle-opacity": 0.8,
            "circle-stroke-width": 1,
            "circle-stroke-color": "#ffffff"
          }
        });

        // Add labels for magnitude
        map.addLayer({
          id: "quakes-labels",
          type: "symbol",
          source: "quakes",
          layout: {
            "text-field": ["to-string", ["get", "mag"]],
            "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
            "text-size": 10
          },
          paint: {
            "text-color": "#ffffff"
          }
        });
      } else if (activeProjection.type === 'nature') {
        const geojsonData: GeoJSON.FeatureCollection = {
          type: "FeatureCollection",
          features: activeProjection.data.map((s, i) => ({
            type: "Feature",
            geometry: {
              type: "Point",
              // Since GBIF gives us a count in a region, let's distribute them slightly around the center
              // so they form a cluster-like visual representation
              coordinates: [
                center[0] + (Math.random() - 0.5) * 0.05, 
                center[1] + (Math.random() - 0.5) * 0.05
              ]
            },
            properties: {
              name: s.vernacularName || s.scientificName,
              count: s.count,
              kingdom: s.kingdom
            }
          }))
        };

        map.addSource("nature", {
          type: "geojson",
          data: geojsonData
        });

        map.addLayer({
          id: "nature-layer",
          type: "circle",
          source: "nature",
          paint: {
            "circle-radius": [
              "interpolate",
              ["linear"],
              ["get", "count"],
              1, 8,
              100, 24
            ],
            "circle-color": "#93b399",
            "circle-opacity": 0.6,
            "circle-stroke-width": 2,
            "circle-stroke-color": "#ffffff"
          }
        });

        map.addLayer({
          id: "nature-labels",
          type: "symbol",
          source: "nature",
          layout: {
            "text-field": ["get", "name"],
            "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
            "text-size": 10,
            "text-offset": [0, 1.5],
            "text-anchor": "top"
          },
          paint: {
            "text-color": "#2c3e30",
            "text-halo-color": "#ffffff",
            "text-halo-width": 1
          }
        });
      }
    };

    if (map.isStyleLoaded()) {
      setupProjections();
    } else {
      map.once('styledata', setupProjections);
    }

    return cleanupMap;
  }, [activeProjection, currentStyle]);

  return (
    <>
      <div ref={containerRef} className="absolute inset-0" />
      
      {/* Active Projection Indicator */}
      {activeProjection && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-4 py-2 bg-background/90 backdrop-blur-md rounded-full shadow-md border border-border animate-fade-in-up">
          <span className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${activeProjection.type === 'quakes' ? 'bg-pastel-red-text' : 'bg-pastel-green-text'}`}></span>
            <span className={`relative inline-flex rounded-full h-2 w-2 ${activeProjection.type === 'quakes' ? 'bg-pastel-red-text' : 'bg-pastel-green-text'}`}></span>
          </span>
          <span className="text-xs font-medium uppercase tracking-wider text-foreground">
            {activeProjection.type === 'quakes' ? 'Activité sismique' : 'Biodiversité'}
          </span>
          <button 
            onClick={() => setActiveProjection(null)}
            className="ml-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={14} />
          </button>
        </div>
      )}

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
