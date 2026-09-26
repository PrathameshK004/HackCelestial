import { apiRequest } from './apiClient';

export interface PackageReservationPayload {
  tripId?: string | null;
  guestCount: number;
  startDate: string;
  endDate: string;
  notes?: string;
}

export const packageService = {
  reserve(packageId: string, payload: PackageReservationPayload) {
    return apiRequest<any>(`/packages/${encodeURIComponent(packageId)}/reservations`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
