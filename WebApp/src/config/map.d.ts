export interface MapProviderDefaults {
  name: string;
  provider: string;
  tileProvider: string;
  freeTier: boolean;
  requiresApiKey: boolean;
  description: string;
  styleUrl: string;
  tilesUrl: string;
}

export function getMapProviderDefaults(): MapProviderDefaults;
export function getMapStyleConfig(variant?: string): {
  provider: string;
  variant: string;
  styleUrl: string;
  tileProvider: string;
  requiresApiKey: boolean;
};
export function getMapTileStyleUrl(variant?: string): string;
export const mapConfig: MapProviderDefaults;
