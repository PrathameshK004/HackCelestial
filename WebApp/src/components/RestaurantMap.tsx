import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { getMapStyleConfig } from '../config/map';

interface RestaurantMapProps {
  restaurants: Array<{
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    priceRange?: string;
    rating?: number;
  }>;
  selectedRestaurantId?: string;
  onSelectRestaurant?: (restaurant: any) => void;
}

export const RestaurantMap: React.FC<RestaurantMapProps> = ({
  restaurants,
  selectedRestaurantId,
  onSelectRestaurant,
}) => {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    const { styleUrl } = getMapStyleConfig('streets');
    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: styleUrl,
      center: [73.827, 15.495],
      zoom: 11,
      attributionControl: false,
    });

    mapRef.current = map;

    map.on('load', () => {
      restaurants.forEach((restaurant) => {
        const marker = new maplibregl.Marker({ color: selectedRestaurantId === restaurant.id ? '#059669' : '#f59e0b' })
          .setLngLat([restaurant.longitude, restaurant.latitude])
          .setPopup(
            new maplibregl.Popup({ offset: 18 }).setHTML(`
              <div style="font-family: sans-serif; min-width: 180px;">
                <strong>${restaurant.name}</strong><br />
                ${restaurant.priceRange || '₹₹'} • ${restaurant.rating || '4.5'}★
              </div>
            `)
          );

        marker.getElement().addEventListener('click', () => {
          if (onSelectRestaurant) {
            onSelectRestaurant(restaurant);
          }
        });

        marker.addTo(map);
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [restaurants, selectedRestaurantId, onSelectRestaurant]);

  return (
    <div
      ref={mapContainer}
      style={{
        width: '100%',
        height: 360,
        borderRadius: 20,
        overflow: 'hidden',
        boxShadow: '0 12px 32px rgba(15, 23, 42, 0.08)',
      }}
    />
  );
};
