# Map Stack

## Recommended architecture

GroupTrip uses MapLibre for cross-platform map rendering with OpenStreetMap-based geographic data and a configurable tile/style provider. Restaurant locations are supplied by the Dine backend and rendered as interactive markers. The architecture supports search-by-area, current location, map/list switching, caching, offline states, and external navigation while keeping the map provider replaceable and avoiding vendor lock-in.

### Stack

- MapLibre React Native for Android/iOS
- MapLibre GL JS for web
- OpenStreetMap for geographic data
- Configurable tile provider (MapTiler or similar)
- Native device location for current-user position
- Dine backend supplies restaurant latitude/longitude and normalized restaurant metadata
- External navigation opens Google Maps / Apple Maps / installed navigation apps

### Production guidance

- Do not hard-code `tile.openstreetmap.org` in production because the public OSM tile service is rate-limited and meant for general use, not commercial application backends.
- Keep the style tile URL behind environment configuration so the project can move to a paid tile plan without changing app architecture.
- Keep the backend normalized restaurant data and geospatial query layer separate from the map renderer to allow provider swaps later.

### Default starter configuration

The repository keeps a MapLibre-style configuration in the app config files and environment examples. The default free starter uses a public MapLibre demo style so the project works without exposing keys. Production deployments should point `VITE_MAP_STYLE_URL` / `EXPO_PUBLIC_MAP_STYLE_URL` to a managed provider such as MapTiler.

### Data flow

```text
Restaurant locations
  ↓
Dine backend
  ↓
latitude + longitude + normalized metadata
  ↓
MapLibre markers / clustering layer
  ↓
Map/list toggle + nearby search + navigation actions
```
