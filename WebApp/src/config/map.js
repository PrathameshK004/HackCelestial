const getRuntimeEnv = () => {
  const globalVar = typeof globalThis !== 'undefined' ? globalThis : {};
  const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {};
  return {
    ...globalVar,
    ...env,
  };
};

// Real OpenStreetMap raster tile style (free, no API key required)
const OSM_RASTER_STYLE = {
  version: 8,
  name: 'OpenStreetMap Raster',
  sources: {
    'osm-raster': {
      type: 'raster',
      tiles: [
        'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      maxzoom: 19,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [
    {
      id: 'osm-raster-layer',
      type: 'raster',
      source: 'osm-raster',
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

// Dark variant using CartoDB Dark Matter (free, no API key)
const DARK_RASTER_STYLE = {
  version: 8,
  name: 'CartoDB Dark Matter',
  sources: {
    'dark-raster': {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
      ],
      tileSize: 256,
      maxzoom: 19,
      attribution: '© OpenStreetMap contributors © CARTO',
    },
  },
  layers: [
    {
      id: 'dark-raster-layer',
      type: 'raster',
      source: 'dark-raster',
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

export const getMapProviderDefaults = () => ({
  name: 'OpenStreetMap Live',
  provider: 'osm-raster',
  tileProvider: 'openstreetmap',
  freeTier: true,
  requiresApiKey: false,
  description: 'Real OpenStreetMap tile server with full street-level detail. Free and requires no API key.',
  styleUrl: getRuntimeEnv().VITE_MAP_STYLE_URL || OSM_RASTER_STYLE,
  tilesUrl: getRuntimeEnv().VITE_MAP_TILES_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
});

export const getMapStyleConfig = (variant = 'streets') => {
  const provider = getMapProviderDefaults();
  const envStyle = getRuntimeEnv().VITE_MAP_STYLE_URL;
  const styleUrls = {
    streets: envStyle || OSM_RASTER_STYLE,
    light: envStyle || OSM_RASTER_STYLE,
    dark: getRuntimeEnv().VITE_MAP_STYLE_DARK_URL || DARK_RASTER_STYLE,
    satellite: getRuntimeEnv().VITE_MAP_STYLE_SATELLITE_URL || OSM_RASTER_STYLE,
  };

  return {
    provider: provider.name,
    variant,
    styleUrl: styleUrls[variant] || styleUrls.streets,
    tileProvider: provider.tileProvider,
    requiresApiKey: provider.requiresApiKey,
  };
};

export const getMapTileStyleUrl = (variant = 'streets') => getMapStyleConfig(variant).styleUrl;

export const mapConfig = getMapProviderDefaults();
