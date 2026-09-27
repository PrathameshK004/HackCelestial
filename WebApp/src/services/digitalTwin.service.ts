import { apiRequest } from './apiClient';

export interface Prediction {
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
  inputs?: { rainfall?: number; temperature?: number; windSpeed?: number; stormDuration?: number };
  tripImpact: Prediction;
  attractionDemand: Prediction;
  transportDisruption: Prediction;
  hotelDemand: Prediction;
  restaurantDemand?: Prediction;
  cancellationRisk: Prediction;
  propagationRadiusKm?: number;
  entities?: DigitalTwinEntity[];
  effects: Array<{ cause: string; affectedEntity: string; impact: string; magnitude: number; propagationLevel: string }>;
}

export interface DigitalTwinState {
  trip: { id: string; name: string; destination: string };
  weather: { location?: { latitude: number; longitude: number; name?: string }; current?: any; hourly?: any[]; daily?: any[]; provider?: string };
  impact: DigitalTwinImpact;
  socialSignals?: DigitalTwinSocialSignal[];
  virtual: boolean;
  productionDataMutated: boolean;
}

export const digitalTwinService = {
  async getState(tripId: string): Promise<DigitalTwinState> {
    const response = await apiRequest<{ data: DigitalTwinState }>(`/digital-twin/state?tripId=${encodeURIComponent(tripId)}`);
    return response.data;
  },

  async simulate(tripId: string, inputs: Record<string, number>): Promise<any> {
    const response = await apiRequest<{ data: any }>('/digital-twin/simulate', {
      method: 'POST',
      body: JSON.stringify({ tripId, ...inputs })
    });
    return response.data;
  }
};

