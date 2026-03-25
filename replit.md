# Atlas Weather

A weather application built with React, Vite, and MapLibre GL. Users can click on an interactive map or search for a location to see weather data.

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Mapping**: MapLibre GL (v5)
- **UI**: Tailwind CSS, shadcn/ui (Radix UI), Hugeicons
- **State**: TanStack React Query
- **Routing**: React Router DOM v6
- **Forms**: React Hook Form + Zod

## Project Structure

```
src/
  components/       # UI components (MapView, SearchBar, LocationDrawer, etc.)
  pages/            # Route pages (Index, NotFound)
  lib/              # Utilities (weather API, geocoder)
  hooks/            # Custom React hooks
```

## Running the App

The app runs on port 5000 via `npm run dev`.

## Key Notes

- MapLibre GL v5 requires `attributionControl` to be `false` or an options object (not `true`)
- The app uses open-source tile services (Carto, ESRI) - no API keys needed for the map
- Weather data is fetched from open-meteo.com (no API key required)
- Geocoding uses the Nominatim API (OpenStreetMap)
