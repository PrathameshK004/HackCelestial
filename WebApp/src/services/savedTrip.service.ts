import { apiRequest } from './apiClient';

export interface SavedTrip {
  id: string;
  name: string;
  type: string;
  category: string;
  destination: string;
  dateRange?: string;
  guests?: number;
  rating: number;
  pricePerNight: number;
  matchScore: number;
  totalNights?: number;
  style?: string;
  distance?: string;
  image: string;
  altImages?: string[];
  metrics?: { walk: number; food: number; activity: number };
  whyMatched?: { icon: string; title: string; description: string }[];
  highlights?: string;
  createdAt?: string;
}

export const savedTripService = {
  async list(): Promise<SavedTrip[]> {
    const response = await apiRequest<{ data: SavedTrip[] }>('/saved-trips', { method: 'GET' });
    return response.data || [];
  },

  async save(stay: SavedTrip): Promise<SavedTrip> {
    const response = await apiRequest<{ data: SavedTrip }>('/saved-trips', {
      method: 'POST',
      body: JSON.stringify(stay)
    });
    return response.data;
  },

  async remove(stayId: string): Promise<void> {
    await apiRequest(`/saved-trips/${encodeURIComponent(stayId)}`, { method: 'DELETE' });
  }
};
