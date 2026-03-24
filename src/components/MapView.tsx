import { useEffect, useRef, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

interface MapViewProps {
  center: [number, number]; // [lon, lat]
  zoom: number;
  onMapClick?: (lat: number, lon: number) => void;
  markerPosition?: [number, number] | null;
}

export default function MapView({ center, zoom, onMapClick, markerPosition }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
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
    <div ref={containerRef} className="absolute inset-0" />
  );
}
