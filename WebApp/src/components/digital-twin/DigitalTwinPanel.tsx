import React, { useEffect, useState } from 'react';
import {
  CloudRain,
  Droplets,
  MapPin,
  Play,
  RotateCcw,
  Thermometer,
  Wind,
  Sparkles,
} from 'lucide-react';
import { digitalTwinService, DigitalTwinState } from '../../services/digitalTwin.service';
import { DigitalTwinMap } from './DigitalTwinMap';

interface DigitalTwinPanelProps {
  tripId: string;
}

const levelColor: Record<string, string> = {
  LOW: '#15803d',
  MEDIUM: '#b45309',
  HIGH: '#c2410c',
  SEVERE: '#b91c1c',
};

export const DigitalTwinPanel: React.FC<DigitalTwinPanelProps> = ({ tripId }) => {
  const [state, setState] = useState<DigitalTwinState | null>(null);
  const [simulation, setSimulation] = useState<any>(null);
  const [rainfall, setRainfall] = useState(20);
  const [stormDuration, setStormDuration] = useState(2);
  const [temperature, setTemperature] = useState(28);
  const [windSpeed, setWindSpeed] = useState(15);
  const [isLoading, setIsLoading] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    digitalTwinService
      .getState(tripId)
      .then((value) => {
        if (active) {
          setState(value);
          if (value?.impact?.inputs?.temperature) {
            setTemperature(Math.round(value.impact.inputs.temperature));
          }
        }
      })
      .catch(() => active && setState(null))
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [tripId]);

  const runSimulation = async () => {
    setIsSimulating(true);
    try {
      setSimulation(
        await digitalTwinService.simulate(tripId, {
          rainfall,
          stormDuration,
          temperature,
          windSpeed,
          weatherSeverity: 1,
        })
      );
    } finally {
      setIsSimulating(false);
    }
  };

  const resetSimulation = () => {
    setSimulation(null);
    setRainfall(20);
    setStormDuration(2);
    if (state?.impact?.inputs?.temperature) {
      setTemperature(Math.round(state.impact.inputs.temperature));
    }
  };

  if (isLoading)
    return <section className="clean-section-card" style={{ marginBottom: 16 }}>Loading Digital Twin...</section>;
  if (!state)
    return (
      <section className="clean-section-card" style={{ marginBottom: 16 }}>
        Digital Twin weather is temporarily unavailable.
      </section>
    );

  const current = state.weather?.current || {};
  const impact = state.impact;
  const result = simulation?.after || impact;
  const location = state.weather?.location;
  const socialSignals = state.socialSignals || [];

  return (
    <section
      className="clean-section-card"
      style={{
        marginBottom: 16,
        border: '1px solid #d9e7df',
        background: '#f7fbf8',
        borderRadius: 16,
        padding: 20,
      }}
    >
      {/* 1. Header with Live Location & Digital Twin Pill */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                fontSize: 11,
                letterSpacing: '.12em',
                fontWeight: 800,
                color: '#15803d',
                background: '#dcfce7',
                padding: '3px 8px',
                borderRadius: 6,
              }}
            >
              DIGITAL TWIN
            </span>
            {simulation && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: '#7c3aed',
                  background: '#ede9fe',
                  padding: '3px 8px',
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Sparkles size={11} /> SIMULATED VIRTUAL STATE
              </span>
            )}
          </div>
          <h2 style={{ margin: '6px 0 2px', fontSize: 22, fontWeight: 900, color: '#0f172a' }}>
            Trip Weather Impact & Propagation
          </h2>
          <div style={{ color: '#475569', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
            <MapPin size={13} style={{ color: '#059669' }} /> {location?.name || state.trip.destination}
            <span
              style={{
                marginLeft: 6,
                fontSize: 10,
                background: '#e0f2fe',
                color: '#0369a1',
                padding: '2px 6px',
                borderRadius: 4,
                fontWeight: 700,
              }}
            >
              Live Weather Feed (OpenWeather 2.5)
            </span>
          </div>
        </div>

        <div
          style={{
            color: levelColor[impact.impactLevel],
            background: '#ffffff',
            border: `1.5px solid ${levelColor[impact.impactLevel]}`,
            padding: '6px 14px',
            borderRadius: 12,
            fontWeight: 900,
            fontSize: 13,
            textAlign: 'center',
          }}
        >
          {impact.impactLevel} IMPACT
        </div>
      </div>

      {/* 2. Feature 1: Real-Time Live Weather Inputs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 8, margin: '16px 0' }}>
        <Metric
          icon={<Thermometer size={15} color="#059669" />}
          label="Temperature"
          value={`${Math.round(current.temp ?? 25)}°C`}
          sub={`Feels ${Math.round(current.feels_like ?? current.temp ?? 25)}°C`}
        />
        <Metric
          icon={<CloudRain size={15} color="#0284c7" />}
          label="Rainfall"
          value={`${Math.round(current.rain?.['1h'] ?? impact.inputs?.rainfall ?? 0)} mm`}
          sub="Live intensity"
        />
        <Metric
          icon={<Wind size={15} color="#6366f1" />}
          label="Wind Velocity"
          value={`${Math.round(current.wind_speed ?? 0)} m/s`}
          sub="Speed"
        />
        <Metric
          icon={<Droplets size={15} color="#0d9488" />}
          label="Humidity"
          value={`${Math.round(current.humidity ?? 60)}%`}
          sub="Air moisture"
        />
      </div>

      {/* AI Predicted Trip Impact Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8 }}>
        <Impact label="Trip impact" value={result.tripImpact} color={levelColor[impact.impactLevel]} />
        <Impact label="Attraction demand" value={result.attractionDemand} color="#0284c7" />
        <Impact label="Transport disruption" value={result.transportDisruption} color="#ea580c" />
        <Impact label="Cancellation risk" value={result.cancellationRisk} color="#dc2626" />
      </div>

      {/* 3. Feature 2: Geospatial Map Visualization */}
      <div style={{ marginTop: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <strong style={{ fontSize: 14, color: '#0f172a' }}>2. Geospatial Map & Entity Impact Propagation</strong>
          <span style={{ fontSize: 11, background: '#dbeafe', color: '#1d4ed8', padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>
            Impact Radius: {result.propagationRadiusKm || 8} km
          </span>
        </div>
        <DigitalTwinMap
          latitude={location?.latitude}
          longitude={location?.longitude}
          impactLevel={impact.impactLevel}
          propagationRadiusKm={result.propagationRadiusKm}
          entities={result.entities}
        />
      </div>

      {/* 4. Feature 3: Real-World Social Signal Integration */}
      <div style={{ marginTop: 22, paddingTop: 16, borderTop: '1px solid #d9e7df' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <strong style={{ fontSize: 14, color: '#0f172a' }}>
            3. Real-World Social Signals ({socialSignals.length} Active Feeds)
          </strong>
          <span style={{ fontSize: 11, color: '#64748b' }}>Public traveler chatter & transit bulletins</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 8 }}>
          {socialSignals.map((sig) => {
            const isAlert = sig.severity === 'HIGH' || sig.severity === 'SEVERE';
            const isPositive = sig.sentiment === 'positive';
            const badgeBg = isAlert ? '#fee2e2' : isPositive ? '#dcfce7' : '#f1f5f9';
            const badgeColor = isAlert ? '#b91c1c' : isPositive ? '#15803d' : '#475569';

            // Relative time calculation
            const sigTime = new Date(sig.timestamp);
            const diffMs = Date.now() - sigTime.getTime();
            const diffMins = Math.floor(diffMs / 60000);
            const relativeTime = diffMins < 60 ? `${diffMins}m ago` : diffMins < 1440 ? `${Math.floor(diffMins / 60)}h ago` : `${Math.floor(diffMins / 1440)}d ago`;

            return (
              <div
                key={sig.id}
                style={{
                  background: '#ffffff',
                  padding: 12,
                  borderRadius: 10,
                  border: `1px solid ${isAlert ? '#fecaca' : '#e2eee7'}`,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      background: badgeBg,
                      color: badgeColor,
                      padding: '2px 6px',
                      borderRadius: 4,
                    }}
                  >
                    {sig.severity} • {sig.sentiment.toUpperCase()}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 9, color: '#94a3b8', fontWeight: 600 }}>{relativeTime}</span>
                    <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700 }}>
                      {Math.round(sig.confidence * 100)}% conf
                    </span>
                  </div>
                </div>
                <div style={{ fontWeight: 800, fontSize: 12, color: '#0f172a', marginTop: 4 }}>{sig.event}</div>
                {sig.payload?.text && (
                  <div style={{ fontSize: 11, color: '#475569', fontStyle: 'italic', marginTop: 3 }}>
                    "{sig.payload.text}"
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, fontSize: 10, color: '#64748b' }}>
                  <span>Source: {sig.payload?.channel || 'Public Travel Post'}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>📍 {sig.location}</span>
                    {sig.sourceUrl && (
                      <a
                        href={sig.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          color: '#0284c7',
                          textDecoration: 'none',
                          background: '#e0f2fe',
                          padding: '1px 5px',
                          borderRadius: 3,
                        }}
                      >
                        Source ↗
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Feature 4: Digital Twin What-If Simulation */}
      <div style={{ marginTop: 22, paddingTop: 16, borderTop: '1px solid #d9e7df' }}>
        <strong style={{ fontSize: 14, color: '#0f172a' }}>4. Digital Twin What-If Simulator</strong>
        <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 12px' }}>
          Interactively adjust rainfall, storm duration, temperature, and wind speed to observe how disruption propagates across entities.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 600 }}>
            Rainfall: <strong>{rainfall} mm</strong>
            <input
              type="range"
              min="0"
              max="140"
              value={rainfall}
              onChange={(e) => setRainfall(Number(e.target.value))}
              style={{ width: '100%', marginTop: 4 }}
            />
          </label>
          <label style={{ fontSize: 12, fontWeight: 600 }}>
            Storm Duration: <strong>{stormDuration} h</strong>
            <input
              type="range"
              min="1"
              max="12"
              value={stormDuration}
              onChange={(e) => setStormDuration(Number(e.target.value))}
              style={{ width: '100%', marginTop: 4 }}
            />
          </label>
          <label style={{ fontSize: 12, fontWeight: 600 }}>
            Temperature: <strong>{temperature} °C</strong>
            <input
              type="range"
              min="15"
              max="45"
              value={temperature}
              onChange={(e) => setTemperature(Number(e.target.value))}
              style={{ width: '100%', marginTop: 4 }}
            />
          </label>
          <label style={{ fontSize: 12, fontWeight: 600 }}>
            Wind Speed: <strong>{windSpeed} km/h</strong>
            <input
              type="range"
              min="0"
              max="80"
              value={windSpeed}
              onChange={(e) => setWindSpeed(Number(e.target.value))}
              style={{ width: '100%', marginTop: 4 }}
            />
          </label>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <button
            type="button"
            className="btn-emerald-solid"
            onClick={runSimulation}
            disabled={isSimulating}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Play size={14} /> {isSimulating ? 'Simulating...' : 'Simulate Virtual State'}
          </button>
          {simulation && (
            <button
              type="button"
              className="btn-outline-secondary"
              onClick={resetSimulation}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8 }}
            >
              <RotateCcw size={14} /> Reset to Live Baseline
            </button>
          )}
        </div>

        {/* Side-by-Side Simulation Comparison */}
        {simulation && (
          <div
            style={{
              marginTop: 14,
              padding: 12,
              borderRadius: 10,
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
            }}
          >
            <strong style={{ fontSize: 12, color: '#15803d' }}>⚡ Live Baseline vs Simulated State:</strong>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, marginTop: 8 }}>
              <ComparisonBadge
                label="Trip Impact"
                before={simulation.before?.tripImpact?.prediction ?? 0}
                after={simulation.after?.tripImpact?.prediction ?? 0}
              />
              <ComparisonBadge
                label="Transport Disruption"
                before={simulation.before?.transportDisruption?.prediction ?? 0}
                after={simulation.after?.transportDisruption?.prediction ?? 0}
              />
              <ComparisonBadge
                label="Attraction Demand"
                before={simulation.before?.attractionDemand?.prediction ?? 0}
                after={simulation.after?.attractionDemand?.prediction ?? 0}
              />
              <ComparisonBadge
                label="Cancellation Risk"
                before={simulation.before?.cancellationRisk?.prediction ?? 0}
                after={simulation.after?.cancellationRisk?.prediction ?? 0}
              />
            </div>
          </div>
        )}

        <div style={{ marginTop: 12, color: '#64748b', fontSize: 11 }}>
          Confidence: {Math.round(result.tripImpact.confidence * 100)}% • Range {result.tripImpact.lowerBound}-{result.tripImpact.upperBound}% • Virtual simulation mode does not mutate production trip data or trigger notifications.
        </div>
      </div>

      {/* Propagation Cascade Chain */}
      <div style={{ marginTop: 16, display: 'grid', gap: 6 }}>
        {impact.effects.map((effect) => (
          <div key={`${effect.cause}-${effect.affectedEntity}`} style={{ fontSize: 12, color: '#475569' }}>
            <span style={{ fontSize: 9, fontWeight: 800, background: '#e2e8f0', padding: '2px 6px', borderRadius: 4, marginRight: 6 }}>
              {effect.propagationLevel}
            </span>
            {effect.cause} → <strong>{effect.affectedEntity}</strong> • {effect.impact} ({effect.magnitude} magnitude)
          </div>
        ))}
      </div>
    </section>
  );
};

const Metric: React.FC<{ icon: React.ReactNode; label: string; value: string; sub?: string }> = ({
  icon,
  label,
  value,
  sub,
}) => (
  <div style={{ padding: 10, borderRadius: 10, background: '#fff', border: '1px solid #e2eee7' }}>
    <div style={{ color: '#15803d', display: 'flex', gap: 5, alignItems: 'center', fontSize: 11 }}>
      {icon}
      {label}
    </div>
    <strong style={{ display: 'block', marginTop: 4, fontSize: 14 }}>{value}</strong>
    {sub && <span style={{ fontSize: 10, color: '#94a3b8' }}>{sub}</span>}
  </div>
);

const Impact: React.FC<{ label: string; value: any; color?: string }> = ({ label, value, color }) => (
  <div style={{ padding: 10, background: '#fff', borderRadius: 10, border: '1px solid #e2eee7' }}>
    <div style={{ fontSize: 11, color: '#64748b' }}>{label}</div>
    <strong style={{ fontSize: 17, color: color || '#0f172a' }}>{value?.prediction ?? 0}%</strong>
    <div style={{ fontSize: 10, color: '#94a3b8' }}>
      Range {value?.lowerBound ?? 0}-{value?.upperBound ?? 0}%
    </div>
  </div>
);

const ComparisonBadge: React.FC<{ label: string; before: number; after: number }> = ({ label, before, after }) => {
  const diff = after - before;
  const isUp = diff > 0;
  return (
    <div style={{ background: '#ffffff', padding: 8, borderRadius: 8, border: '1px solid #d9e7df' }}>
      <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 900, marginTop: 2 }}>
        {before}% ➔ <span style={{ color: isUp ? '#dc2626' : '#16a34a' }}>{after}%</span>{' '}
        <span style={{ fontSize: 10, color: isUp ? '#dc2626' : '#16a34a' }}>({isUp ? `+${diff}` : diff}%)</span>
      </div>
    </div>
  );
};
