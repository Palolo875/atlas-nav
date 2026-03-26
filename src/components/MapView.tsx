import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { HugeiconsIcon } from "@hugeicons/react";
import { Layers01Icon } from "@hugeicons/core-free-icons";

import type { Earthquake, GBIFSpecies } from "@/lib/enrichment";

interface MapViewProps {
  center: [number, number]; // [lon, lat]
  zoom: number;
  onMapClick?: (lat: number, lon: number) => void;
  markerPosition?: [number, number] | null;
  activeLayer?: "none" | "quakes" | "nature";
  quakesData?: Earthquake[];
  natureData?: GBIFSpecies[];
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

export default function MapView({ center, zoom, onMapClick, markerPosition, activeLayer = "none", quakesData = [], natureData = [] }: MapViewProps) {
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

  // Set dark style automatically when viewing layers
  useEffect(() => {
    if (activeLayer !== "none" && currentStyle !== "sombre") {
      setCurrentStyle("sombre");
    }
  }, [activeLayer]);

  // Handle style change
  useEffect(() => {
    if (!mapRef.current) return;
    
    // When changing style, MapLibre removes all custom layers and sources
    // We need to wait for the style to load before we can re-add them
    mapRef.current.once('styledata', () => {
      // Re-add layers if needed
      updateDynamicLayers();
    });
    
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
      
      // Hide marker when showing layers to focus on data
      if (activeLayer !== "none") {
        el.style.opacity = "0.2";
      }

      markerRef.current = new maplibregl.Marker({ element: el })
        .setLngLat(markerPosition)
        .addTo(mapRef.current);
    }
  }, [markerPosition, activeLayer]);

  // Dynamic Layers Management
  const updateDynamicLayers = () => {
    const map = mapRef.current;
    if (!map) return;

    // --- Cleanup existing custom layers ---
    if (map.getLayer("quakes-layer-glow")) map.removeLayer("quakes-layer-glow");
    if (map.getLayer("quakes-layer")) map.removeLayer("quakes-layer");
    if (map.getSource("quakes-source")) map.removeSource("quakes-source");
    if (map.getLayer("nature-clusters")) map.removeLayer("nature-clusters");
    if (map.getLayer("nature-cluster-count")) map.removeLayer("nature-cluster-count");
    if (map.getLayer("nature-unclustered-point")) map.removeLayer("nature-unclustered-point");
    if (map.getSource("nature-source")) map.removeSource("nature-source");

    // --- Add Quakes Layer ---
    if (activeLayer === "quakes" && quakesData.length > 0) {
      // Create GeoJSON from quakes data
      const features = quakesData.map((q) => {
        return {
          type: "Feature",
          properties: {
            mag: q.magnitude,
            place: q.place
          },
          geometry: {
            type: "Point",
            coordinates: [q.lon, q.lat] // [lng, lat]
          }
        };
      });

      const geojson = {
        type: "FeatureCollection",
        features
      };

      map.addSource("quakes-source", {
        type: "geojson",
        data: geojson as any
      });

      map.addLayer({
        id: "quakes-layer-glow",
        type: "circle",
        source: "quakes-source",
        paint: {
          "circle-radius": [
            "interpolate", ["linear"], ["get", "mag"],
            2, 16,
            5, 48,
            8, 80
          ],
          "circle-color": "hsl(1, 56%, 40%)", // pastel-red-text
          "circle-opacity": 0.15,
          "circle-blur": 0.5
        }
      });

      map.addLayer({
        id: "quakes-layer",
        type: "circle",
        source: "quakes-source",
        paint: {
          "circle-radius": [
            "interpolate", ["linear"], ["get", "mag"],
            2, 6,
            5, 16,
            8, 28
          ],
          "circle-color": "hsl(1, 56%, 40%)", // pastel-red-text
          "circle-opacity": 0.8,
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "hsl(0, 82%, 96%)" // pastel-red-bg
        }
      });
    }

    // --- Add Nature Layer ---
    if (activeLayer === "nature" && natureData.length > 0) {
      // Create GeoJSON from nature data occurrences
      const features = natureData.flatMap((s) => 
        (s.occurrences || []).map((occ: { lat: number; lon: number }) => ({
          type: "Feature",
          properties: {
            name: s.scientificName,
            kingdom: s.kingdom
          },
          geometry: {
            type: "Point",
            coordinates: [occ.lon, occ.lat]
          }
        }))
      );

      const geojson = {
        type: "FeatureCollection",
        features
      };

      map.addSource("nature-source", {
        type: "geojson",
        data: geojson as any,
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50
      });

      map.addLayer({
        id: "nature-clusters",
        type: "circle",
        source: "nature-source",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "hsl(124, 32%, 31%)", // pastel-green-text
          "circle-radius": [
            "step",
            ["get", "point_count"],
            15, 5,
            20, 15,
            25
          ],
          "circle-stroke-width": 2,
          "circle-stroke-color": "hsl(114, 22%, 94%)"
        }
      });

      map.addLayer({
        id: "nature-cluster-count",
        type: "symbol",
        source: "nature-source",
        filter: ["has", "point_count"],
        layout: {
          "text-field": "{point_count_abbreviated}",
          "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
          "text-size": 12
        },
        paint: {
          "text-color": "#ffffff"
        }
      });

      map.addLayer({
        id: "nature-unclustered-point",
        type: "circle",
        source: "nature-source",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-radius": 6,
          "circle-color": "hsl(124, 32%, 31%)",
          "circle-stroke-width": 2,
          "circle-stroke-color": "hsl(114, 22%, 94%)"
        }
      });
    }
  };

  useEffect(() => {
    updateDynamicLayers();
  }, [activeLayer, quakesData, natureData]);

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
