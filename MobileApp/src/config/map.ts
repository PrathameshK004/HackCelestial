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

  return {
    name: 'MapLibre Demo',
    provider: 'maplibre-demo',
    tileProvider: 'maplibre-demo',
    freeTier: true,
    requiresApiKey: false,
    description: 'Free MapLibre starter style for local development and low-usage production tuning.',
    styleUrl:
      (typeof env.EXPO_PUBLIC_MAP_STYLE_URL === 'string' && env.EXPO_PUBLIC_MAP_STYLE_URL) ||
      'https://demotiles.maplibre.org/style.json',
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
