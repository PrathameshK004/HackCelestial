export type MapVariant = 'streets' | 'light' | 'dark' | 'satellite';

export interface MapProviderConfig {
  name: string;
  provider: 'maplibre-demo' | 'maptiler';
  tileProvider: 'maplibre-demo' | 'maptiler';
  freeTier: boolean;
  requiresApiKey: boolean;
  styleUrl: string;
  description: string;
}

const getRuntimeEnv = () => {
  const runtimeEnv = (globalThis as Record<string, unknown> & { expo?: Record<string, unknown> }).expo ?? {};
  return {
    ...(runtimeEnv as Record<string, unknown>),
    ...(typeof process !== 'undefined' ? process.env : {}),
  };
};

export const getMapProviderDefaults = (): MapProviderConfig => {
  const env = getRuntimeEnv();

  // Real OpenStreetMap raster tile style (free, no API key required)
  const osmRasterStyle = JSON.stringify({
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
      { id: 'osm-raster-layer', type: 'raster', source: 'osm-raster', minzoom: 0, maxzoom: 19 },
    ],
  });

  return {
    name: 'OpenStreetMap Live',
    provider: 'maplibre-demo',
    tileProvider: 'maplibre-demo',
    freeTier: true,
    requiresApiKey: false,
    description: 'Real OpenStreetMap tile server with full street-level detail. Free and requires no API key.',
    styleUrl:
      (typeof env.EXPO_PUBLIC_MAP_STYLE_URL === 'string' && env.EXPO_PUBLIC_MAP_STYLE_URL) ||
      osmRasterStyle,
  };
};

export const getMapStyleConfig = (variant: MapVariant = 'streets'): MapProviderConfig & { variant: MapVariant } => {
  const defaults = getMapProviderDefaults();
  const variantMap: Record<MapVariant, string> = {
    streets: defaults.styleUrl,
    light: defaults.styleUrl,
    dark: (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_MAP_STYLE_DARK_URL) || defaults.styleUrl,
    satellite: (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_MAP_STYLE_SATELLITE_URL) || defaults.styleUrl,
  };

  return {
    ...defaults,
    variant,
    styleUrl: variantMap[variant] || defaults.styleUrl,
  };
};

export const getMapTileStyleUrl = (variant: MapVariant = 'streets') => getMapStyleConfig(variant).styleUrl;

export const getMapTileUrlTemplate = () => {
  const env = getRuntimeEnv();
  return (typeof env.EXPO_PUBLIC_MAP_TILE_URL === 'string' && env.EXPO_PUBLIC_MAP_TILE_URL) ||
    'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
};

export const mapConfig = getMapProviderDefaults();
