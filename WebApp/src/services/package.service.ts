import { apiRequest } from './apiClient';

export interface PackageReservationRequest {
  guestCount: number;
  startDate: string;
  endDate: string;
  notes?: string;
}

export const packageService = {
  reserve(packageId: string, reservation: PackageReservationRequest) {
    return apiRequest<any>(`/packages/${encodeURIComponent(packageId)}/reservations`, {
      method: 'POST',
      body: JSON.stringify(reservation),
    });
  },
};