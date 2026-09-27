import { apiRequest } from './apiClient';

export interface DigitalTwinPrediction {
  prediction: number;
  lowerBound: number;
  upperBound: number;
  confidence: number;
}

export interface DigitalTwinEntity {
  id: string;
  name: string;
  type: 'transport' | 'attraction' | 'restaurant' | 'hotel';
  latitude: number;
  longitude: number;
  disruptionScore: number;
  status: string;
  propagationLevel: 'DIRECT' | 'SECONDARY' | 'HIGHER_ORDER';
  icon?: string;
  description?: string;
}

export interface DigitalTwinSocialSignal {
  id: string;
  location: string;
  event: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'SEVERE';
  timestamp: string;
  confidence: number;
  sourceUrl?: string;
  payload?: {
    text?: string;
    author?: string;
    channel?: string;
  };
}

export interface DigitalTwinImpact {
  impactLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'SEVERE';
  inputs?: {
    rainfall?: number;
    temperature?: number;
    windSpeed?: number;
    stormDuration?: number;
    humidity?: number;
    condition?: string;
  };
  tripImpact: DigitalTwinPrediction;
  attractionDemand: DigitalTwinPrediction;
  transportDisruption: DigitalTwinPrediction;
  cancellationRisk: DigitalTwinPrediction;
  hotelDemand?: DigitalTwinPrediction;
  restaurantDemand?: DigitalTwinPrediction;
  propagationRadiusKm?: number;
  entities?: DigitalTwinEntity[];
  effects: Array<{ cause: string; affectedEntity: string; impact?: string; magnitude?: number; propagationLevel: string }>;
}

export interface DigitalTwinState {
  weather: {
    provider?: string;
    location?: { name?: string; latitude?: number; longitude?: number };
    current?: any;
    hourly?: Array<{ dt: number; temp: number; humidity: number; weather: any[]; rain?: any }>;
    daily?: Array<{ dt: number; temp: { min: number; max: number }; weather: any[]; rain?: number }>;
  };
  impact: DigitalTwinImpact;
  socialSignals?: DigitalTwinSocialSignal[];
  virtual: boolean;
  productionDataMutated: boolean;
}

export const digitalTwinService = {
  async getState(tripId: string, latitude?: number, longitude?: number): Promise<DigitalTwinState> {
    const params = new URLSearchParams({ tripId: tripId });
    if (typeof latitude === 'number' && Number.isFinite(latitude)) params.set('latitude', String(latitude));
    if (typeof longitude === 'number' && Number.isFinite(longitude)) params.set('longitude', String(longitude));

    const response = await apiRequest<{ data: DigitalTwinState }>(`/digital-twin/state?${params.toString()}`);
    return response.data;
  },
  async simulate(tripId: string, inputs: Record<string, number>, latitude?: number, longitude?: number) {
    const payload: Record<string, number | string> = { tripId, ...inputs };
    if (typeof latitude === 'number' && Number.isFinite(latitude)) payload.latitude = latitude;
    if (typeof longitude === 'number' && Number.isFinite(longitude)) payload.longitude = longitude;

    const response = await apiRequest<{ data: any }>('/digital-twin/simulate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return response.data;
  },
  async searchNearbyPlaces(latitude: number, longitude: number, query?: string, category?: string, destination?: string): Promise<DigitalTwinEntity[]> {
    const params = new URLSearchParams();
    if (typeof latitude === 'number' && Number.isFinite(latitude)) params.set('latitude', String(latitude));
    if (typeof longitude === 'number' && Number.isFinite(longitude)) params.set('longitude', String(longitude));
    if (query) params.set('query', query);
    if (category) params.set('category', category);
    if (destination) params.set('destination', destination);

    const response = await apiRequest<{ data: DigitalTwinEntity[] }>(`/digital-twin/places/search?${params.toString()}`);
    return response.data || [];
  },
};

