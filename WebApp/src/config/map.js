const getRuntimeEnv = () => {
  const globalVar = typeof globalThis !== 'undefined' ? globalThis : {};
  const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {};
  return {
    ...globalVar,
    ...env,
  };
};

export const getMapProviderDefaults = () => ({
  name: 'MapLibre Demo',
  provider: 'maplibre-demo',
  tileProvider: 'maplibre-demo',
  freeTier: true,
  requiresApiKey: false,
  description: 'Free MapLibre starter style for local development and low-usage deployment.',
  styleUrl: getRuntimeEnv().VITE_MAP_STYLE_URL || 'https://demotiles.maplibre.org/style.json',
  tilesUrl: getRuntimeEnv().VITE_MAP_TILES_URL || 'https://demotiles.maplibre.org/style.json',
});

export const getMapStyleConfig = (variant = 'streets') => {
  const provider = getMapProviderDefaults();
  const styleUrls = {
    streets: provider.styleUrl,
    light: provider.styleUrl,
    dark: getRuntimeEnv().VITE_MAP_STYLE_DARK_URL || 'https://demotiles.maplibre.org/style.json',
    satellite: getRuntimeEnv().VITE_MAP_STYLE_SATELLITE_URL || 'https://demotiles.maplibre.org/style.json',
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
