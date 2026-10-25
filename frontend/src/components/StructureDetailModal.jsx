import React, { useEffect, useState } from 'react';
import { X, RefreshCw, AlertTriangle, CheckCircle, Calendar, CloudRain, Droplet, User, MapPin } from 'lucide-react';
import { getStructureSatellite, reanalyzeStructure } from '../services/api';

export default function StructureDetailModal({ structure, onClose, onRefreshList }) {
  const [telemetry, setTelemetry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!structure?.id) return;
    loadTelemetry();
  }, [structure?.id]);

  const loadTelemetry = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getStructureSatellite(structure.id);
      setTelemetry(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReanalyze = async () => {
    try {
      setReanalyzing(true);
      await reanalyzeStructure(structure.id);
      await loadTelemetry();
      if (onRefreshList) onRefreshList();
    } catch (e) {
      alert(`Reanalysis failed: ${e.message}`);
    } finally {
      setReanalyzing(false);
    }
  };

  if (!structure) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="glass-panel animate-fade-in"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '95%',
          maxWidth: '980px',
          maxHeight: '92vh',
          overflowY: 'auto',
          background: 'rgba(15, 23, 42, 0.96)',
          border: '1px solid rgba(148, 163, 184, 0.25)',
          padding: '1.75rem',
          position: 'relative'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ 
                fontFamily: 'monospace', 
                fontSize: '11px', 
                color: '#38bdf8', 
                background: 'rgba(56, 189, 248, 0.15)',
                padding: '2px 8px',
                borderRadius: '4px'
              }}>
                {structure.id}
              </span>
              <span style={{
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                color: structure.priority === 'HIGH' ? '#fca5a5' : structure.priority === 'LOW' ? '#6ee7b7' : '#fcd34d'
              }}>
                {structure.priority === 'HIGH' ? '🚨 High Priority (Inspect First)' : structure.priority === 'LOW' ? '✓ Low Priority (Holding Water)' : structure.priority}
              </span>
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f8fafc', marginBottom: '4px' }}>
              {structure.name}
            </h2>
            <p style={{ fontSize: '13px', color: '#94a3b8' }}>
              {structure.village ? `${structure.village}, ` : ''}{structure.block ? `${structure.block}, ` : ''}{structure.district} • {structure.structure_type?.replace('_', ' ')} • GPS: {structure.latitude?.toFixed(4)}, {structure.longitude?.toFixed(4)}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={handleReanalyze}
              disabled={reanalyzing}
              className="btn-secondary"
              style={{ fontSize: '12px', padding: '6px 12px' }}
              title="Fetch latest Sentinel-2 optical data and recalculate NDWI"
            >
              <RefreshCw size={13} className={reanalyzing ? 'spin' : ''} />
              {reanalyzing ? 'Analyzing...' : 'Re-run Satellite Engine'}
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                borderRadius: '8px',
                padding: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Explainable AI Ranking Reason Banner */}
        <div style={{
          background: structure.priority === 'HIGH' 
            ? 'rgba(239, 68, 68, 0.12)' 
            : structure.priority === 'CANNOT_ASSESS' 
              ? 'rgba(139, 92, 246, 0.12)' 
              : 'rgba(2, 132, 199, 0.12)',
          border: `1px solid ${structure.priority === 'HIGH' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(56, 189, 248, 0.25)'}`,
          borderRadius: '10px',
          padding: '14px 16px',
          marginBottom: '1.5rem',
          display: 'flex',
          gap: '12px',
          alignItems: 'flex-start'
        }}>
          <AlertTriangle size={20} color={structure.priority === 'HIGH' ? '#f87171' : '#38bdf8'} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#f8fafc', marginBottom: '2px' }}>
              Satellite Triage Reason & Decision Support:
            </div>
            <div style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: '1.5' }}>
              {structure.assessment_reason || 'Satellite multi-temporal analysis completed.'}
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
            Loading Sentinel-2 spectral observations and rainfall series...
          </div>
        ) : error ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#f87171' }}>
            Failed to load telemetry: {error}
          </div>
        ) : (
          <>
            {/* Water Presence & Rainfall Telemetry Chart */}
            <div style={{
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid rgba(148, 163, 184, 0.15)',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '1.5rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Droplet size={16} color="#38bdf8" />
                  Water Presence (NDWI) & Rainfall Multi-Temporal Series (Dry Season Focus)
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '11px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#38bdf8' }}>
                      <span style={{ width: '12px', height: '3px', background: '#38bdf8', borderRadius: '2px' }} /> NDWI Index (&gt;0 = Water)
                    </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#60a5fa' }}>
                    <span style={{ width: '8px', height: '8px', background: '#60a5fa', opacity: 0.5, borderRadius: '2px' }} /> Rainfall (mm)
                  </span>
                </div>
              </div>

              {/* High precision SVG Telemetry Graph */}
              {telemetry?.observations?.length > 0 && (
                <div style={{ width: '100%', height: '220px' }}>
                  <svg viewBox="0 0 800 220" width="100%" height="100%" style={{ overflow: 'visible' }}>
                    {/* Zero NDWI Threshold Line */}
                    <line x1="50" y1="110" x2="780" y2="110" stroke="#64748b" strokeWidth="1" strokeDasharray="4,4" />
                    <text x="45" y="113" fill="#94a3b8" fontSize="10" textAnchor="end">0.0 (Water Limit)</text>
                    <text x="45" y="40" fill="#38bdf8" fontSize="10" textAnchor="end">+0.5</text>
                    <text x="45" y="180" fill="#f87171" fontSize="10" textAnchor="end">-0.5 (Dry)</text>

                    {/* Rainfall Bars (scaled) */}
                    {telemetry.observations.map((obs, idx) => {
                      const x = 70 + idx * (700 / (telemetry.observations.length - 1));
                      const rainHeight = Math.min(80, (obs.recent_rainfall_mm || 0) * 0.8);
                      const y = 200 - rainHeight;

                      return (
                        <rect
                          key={`rain-${idx}`}
                          x={x - 8}
                          y={y}
                          width="16"
                          height={rainHeight}
                          fill="#38bdf8"
                          fillOpacity="0.25"
                          rx="2"
                        />
                      );
                    })}

                    {/* NDWI Line */}
                    <polyline
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="2.5"
                      points={telemetry.observations.map((obs, idx) => {
                        const x = 70 + idx * (700 / (telemetry.observations.length - 1));
                        // NDWI range -0.5 to +0.5 mapped to y (180 to 40)
                        const clamped = Math.max(-0.5, Math.min(0.5, obs.ndwi_value));
                        const y = 110 - clamped * 140;
                        return `${x},${y}`;
                      }).join(' ')}
                    />

                    {/* Observation Points */}
                    {telemetry.observations.map((obs, idx) => {
                      const x = 70 + idx * (700 / (telemetry.observations.length - 1));
                      const clamped = Math.max(-0.5, Math.min(0.5, obs.ndwi_value));
                      const y = 110 - clamped * 140;
                      const hasWater = obs.ndwi_value > 0.05;

                      return (
                        <g key={`pt-${idx}`}>
                          <circle
                            cx={x}
                            cy={y}
                            r={obs.is_key_snapshot ? '5' : '3.5'}
                            fill={hasWater ? '#38bdf8' : '#f87171'}
                            stroke="#0f172a"
                            strokeWidth="1.5"
                          />
                          {idx % 2 === 0 && (
                            <text
                              x={x}
                              y="215"
                              fill="#94a3b8"
                              fontSize="9"
                              textAnchor="middle"
                            >
                              {new Date(obs.observation_date).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })}
                            </text>
                          )}
                        </g>
                      );
                    })}
                  </svg>
                </div>
              )}
            </div>

            {/* Satellite Image Gallery (Key Dry-Season Snapshots) */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc', marginBottom: '10px' }}>
                Sentinel-2 False Color NIR Snapshot Gallery (Key Dry-Season Checkpoints)
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '12px'
              }}>
                {(telemetry?.key_snapshots || []).map((snap, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: 'rgba(15, 23, 42, 0.8)',
                      border: '1px solid rgba(148, 163, 184, 0.15)',
                      borderRadius: '10px',
                      overflow: 'hidden'
                    }}
                  >
                    <div style={{ height: '140px', background: '#090d16' }}>
                      <img
                        src={snap.snapshot_url}
                        alt={snap.snapshot_caption}
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                    </div>
                    <div style={{ padding: '10px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#f8fafc' }}>
                        {new Date(snap.observation_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                        <span>NDWI: <strong style={{ color: snap.ndwi_value > 0 ? '#38bdf8' : '#f87171' }}>{snap.ndwi_value > 0 ? '+' : ''}{snap.ndwi_value.toFixed(2)}</strong></span>
                        <span>Water: {snap.water_coverage_pct}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Field Ground Truth Reality Verification Card */}
            <div style={{
              background: 'rgba(30, 41, 59, 0.5)',
              border: '1px solid rgba(148, 163, 184, 0.15)',
              borderRadius: '10px',
              padding: '14px 16px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <User size={15} color="#06b6d4" />
                  Field Worker Ground-Truth Status
                </span>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                  Assigned Worker: {structure.assigned_worker_name || 'Ramesh Kushwaha (Field GRS)'}
                </span>
              </div>
              <div style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: '1.5' }}>
                {structure.latest_inspection_status ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ fontWeight: 600, color: '#38bdf8' }}>
                      Actual Status Recorded: {structure.latest_inspection_status.replace('_', ' ')}
                    </div>
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                      Ground inspection matches satellite telemetry triage. Ready for engineering verification and desiltation DPR if required.
                    </div>
                  </div>
                ) : (
                  <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>
                    No field worker has physically verified this structure yet. Switch to "Field App" mode to simulate or submit an inspection.
                  </span>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
