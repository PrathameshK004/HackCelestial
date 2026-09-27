import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { getMapStyleConfig } from '../../config/map';
import { DigitalTwinEntity } from '../../services/digitalTwin.service';

interface DigitalTwinMapProps {
  latitude?: number;
  longitude?: number;
  impactLevel: string;
  propagationRadiusKm?: number;
  entities?: DigitalTwinEntity[];
}

// Generate a GeoJSON circle polygon from a center point and radius in km
function createCircleGeoJSON(center: [number, number], radiusKm: number, points = 64) {
  const coords: [number, number][] = [];
  const distanceX = radiusKm / (111.32 * Math.cos((center[1] * Math.PI) / 180));
  const distanceY = radiusKm / 110.574;
  for (let i = 0; i < points; i++) {
    const theta = (i / points) * (2 * Math.PI);
    const x = distanceX * Math.cos(theta);
    const y = distanceY * Math.sin(theta);
    coords.push([center[0] + x, center[1] + y]);
  }
  coords.push(coords[0]); // close the ring
  return {
    type: 'Feature' as const,
    geometry: { type: 'Polygon' as const, coordinates: [coords] },
    properties: {},
  };
}

export const DigitalTwinMap: React.FC<DigitalTwinMapProps> = ({
  latitude,
  longitude,
  impactLevel,
  propagationRadiusKm = 10,
  entities = [],
}) => {
  const container = useRef<HTMLDivElement | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<DigitalTwinEntity | null>(null);

  useEffect(() => {
    if (!container.current || latitude === undefined || longitude === undefined) return;

    const styleConfig = getMapStyleConfig('streets');

    const map = new maplibregl.Map({
      container: container.current,
      style: styleConfig.styleUrl,
      center: [longitude, latitude],
      zoom: 11,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');

    const levelColor =
      impactLevel === 'SEVERE'
        ? '#b91c1c'
        : impactLevel === 'HIGH'
        ? '#c2410c'
        : impactLevel === 'MEDIUM'
        ? '#b45309'
        : '#15803d';

    map.on('load', () => {
      // 1. Impact Propagation Radius Circle
      const circleFeature = createCircleGeoJSON([longitude, latitude], propagationRadiusKm);
      map.addSource('impact-radius', {
        type: 'geojson',
        data: circleFeature as any,
      });
      map.addLayer({
        id: 'impact-radius-fill',
        type: 'fill',
        source: 'impact-radius',
        paint: {
          'fill-color': levelColor,
          'fill-opacity': 0.12,
        },
      });
      map.addLayer({
        id: 'impact-radius-stroke',
        type: 'line',
        source: 'impact-radius',
        paint: {
          'line-color': levelColor,
          'line-width': 2,
          'line-dasharray': [4, 3],
          'line-opacity': 0.6,
        },
      });

      // 2. Center Marker (Live Location / Destination)
      const centerEl = document.createElement('div');
      centerEl.style.cssText = `
        width: 28px; height: 28px; border-radius: 50%;
        background: ${levelColor}; border: 3px solid white;
        box-shadow: 0 0 12px ${levelColor}80, 0 2px 8px rgba(0,0,0,0.3);
        display: flex; align-items: center; justify-content: center;
        animation: pulse-beacon 2s ease-in-out infinite;
      `;
      centerEl.innerHTML = '<div style="width:8px;height:8px;border-radius:50%;background:white;"></div>';

      new maplibregl.Marker({ element: centerEl })
        .setLngLat([longitude, latitude])
        .setPopup(
          new maplibregl.Popup({ offset: 18, closeButton: false }).setHTML(
            `<div style="font-family:system-ui;padding:2px 0;">
              <strong style="font-size:13px;color:#0f172a;">📍 Live Trip Center</strong><br/>
              <span style="font-size:11px;color:#475569;">Impact Level: <strong style="color:${levelColor}">${impactLevel}</strong></span><br/>
              <span style="font-size:10px;color:#94a3b8;">Propagation Radius: ${propagationRadiusKm} km</span>
            </div>`
          )
        )
        .addTo(map);

      // 3. Entity Markers (Real-world POIs: Airports, Rail, Landmarks, Dining)
      entities.forEach((entity) => {
        if (!entity.latitude || !entity.longitude) return;

        const pinColor =
          entity.type === 'transport'
            ? '#ea580c'
            : entity.type === 'attraction'
            ? '#0284c7'
            : '#10b981';

        const emoji =
          entity.type === 'transport' ? '🚆' : entity.type === 'attraction' ? '🏛️' : '🍽️';

        const el = document.createElement('div');
        el.style.cssText = `
          background: ${pinColor}; width: 26px; height: 26px; border-radius: 50%;
          border: 2.5px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          display: flex; align-items: center; justify-content: center;
          font-size: 13px; cursor: pointer; transition: transform 0.15s;
        `;
        el.innerHTML = emoji;
        el.addEventListener('mouseenter', () => { el.style.transform = 'scale(1.3)'; });
        el.addEventListener('mouseleave', () => { el.style.transform = 'scale(1)'; });

        const disruptionColor = entity.disruptionScore > 60 ? '#dc2626' : entity.disruptionScore > 30 ? '#ea580c' : '#16a34a';

        new maplibregl.Marker({ element: el })
          .setLngLat([entity.longitude, entity.latitude])
          .setPopup(
            new maplibregl.Popup({ offset: 18, maxWidth: '280px' }).setHTML(
              `<div style="font-family:system-ui;padding:2px 0;">
                <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
                  <span style="font-size:14px;">${emoji}</span>
                  <strong style="font-size:12px;color:#0f172a;">${entity.name}</strong>
                </div>
                <div style="display:flex;gap:6px;margin:4px 0;">
                  <span style="font-size:9px;font-weight:800;background:#e2e8f0;padding:2px 5px;border-radius:3px;color:#475569;">${entity.propagationLevel}</span>
                  <span style="font-size:9px;font-weight:800;background:${entity.type === 'transport' ? '#fff7ed' : entity.type === 'attraction' ? '#e0f2fe' : '#ecfdf5'};padding:2px 5px;border-radius:3px;color:${pinColor};">${entity.type.toUpperCase()}</span>
                </div>
                <div style="font-size:11px;color:#475569;margin:3px 0;">
                  <strong>Disruption:</strong> <span style="color:${disruptionColor};font-weight:800;">${entity.disruptionScore}%</span>
                </div>
                <div style="font-size:11px;font-weight:600;color:#0f172a;">${entity.status}</div>
                ${entity.description ? `<div style="font-size:10px;color:#64748b;margin-top:4px;line-height:1.3;">${entity.description}</div>` : ''}
              </div>`
            )
          )
          .addTo(map);
      });

      // Fit bounds to include all entities
      if (entities.length > 0) {
        const bounds = new maplibregl.LngLatBounds();
        bounds.extend([longitude, latitude]);
        entities.forEach((e) => {
          if (e.latitude && e.longitude) bounds.extend([e.longitude, e.latitude]);
        });
        map.fitBounds(bounds, { padding: 40, maxZoom: 13 });
      }
    });

    return () => map.remove();
  }, [latitude, longitude, impactLevel, propagationRadiusKm, entities]);

  // Add pulse animation CSS
  useEffect(() => {
    const styleId = 'dt-map-pulse-style';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        @keyframes pulse-beacon {
          0%, 100% { box-shadow: 0 0 4px rgba(0,0,0,0.2); }
          50% { box-shadow: 0 0 16px rgba(22,163,74,0.5), 0 0 24px rgba(22,163,74,0.2); }
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  return (
    <div style={{ position: 'relative', marginTop: 14 }}>
      <div
        ref={container}
        style={{ height: 320, borderRadius: 14, overflow: 'hidden', border: '1px solid #d9e7df' }}
        aria-label="Digital Twin geospatial impact map with real OpenStreetMap data"
      />
      {/* Live Map Legend */}
      <div
        style={{
          position: 'absolute',
          bottom: 10,
          left: 10,
          background: 'rgba(255,255,255,0.94)',
          backdropFilter: 'blur(8px)',
          padding: '6px 10px',
          borderRadius: 8,
          fontSize: 11,
          fontWeight: 700,
          color: '#1e293b',
          display: 'flex',
          gap: 10,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ea580c', display: 'inline-block' }} />
          Transport
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#0284c7', display: 'inline-block' }} />
          Attraction
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
          Dining
        </span>
      </div>
      {/* Map data source badge */}
      <div
        style={{
          position: 'absolute',
          top: 10,
          left: 10,
          background: 'rgba(15,23,42,0.82)',
          backdropFilter: 'blur(6px)',
          padding: '4px 8px',
          borderRadius: 6,
          fontSize: 10,
          fontWeight: 700,
          color: '#e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        🗺️ OpenStreetMap Live • Real Geospatial Data
      </div>
    </div>
  );
};
