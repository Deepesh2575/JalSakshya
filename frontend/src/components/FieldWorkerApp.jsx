import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Camera, 
  MapPin, 
  AlertTriangle, 
  CheckCircle, 
  Save, 
  ArrowLeft,
  UploadCloud,
  Check
} from 'lucide-react';
import { 
  getOfflineInspections, 
  saveInspectionOffline, 
  clearSyncedInspections, 
  cacheAssignedStructures, 
  getCachedAssignedStructures 
} from '../services/offlineStorage';
import { syncBatchInspections } from '../services/api';

export default function FieldWorkerApp({ 
  structures, 
  isOfflineMode, 
  toggleOfflineMode, 
  onRefreshData,
  onInspectionSaved
}) {
  const [assignedList, setAssignedList] = useState([]);
  const [selectedStructure, setSelectedStructure] = useState(null);
  const [pendingQueue, setPendingQueue] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState(null);

  // Form states
  const [actualStatus, setActualStatus] = useState('HOLDING_WATER');
  const [bundCondition, setBundCondition] = useState('INTACT');
  const [siltationLevel, setSiltationLevel] = useState('LOW');
  const [waterDepth, setWaterDepth] = useState('1.5');
  const [notes, setNotes] = useState('');
  const [photoPreview, setPhotoPreview] = useState(null);

  useEffect(() => {
    // If structures passed, cache them
    if (structures && structures.length > 0) {
      cacheAssignedStructures(structures);
      setAssignedList(structures);
    } else {
      const cached = getCachedAssignedStructures();
      setAssignedList(cached);
    }
    setPendingQueue(getOfflineInspections());
  }, [structures]);

  // Handle Online Auto-Sync if not in offline simulation
  useEffect(() => {
    if (!isOfflineMode && pendingQueue.length > 0) {
      triggerBatchSync();
    }
  }, [isOfflineMode]);

  const triggerBatchSync = async () => {
    const queue = getOfflineInspections();
    if (queue.length === 0) return;

    try {
      setIsSyncing(true);
      setSyncStatusMsg("Syncing offline inspections with JalSakshya server...");
      const res = await syncBatchInspections(queue);
      clearSyncedInspections(res.synced_ids || []);
      setPendingQueue(getOfflineInspections());
      setSyncStatusMsg(`Successfully synced ${res.synced_count} inspections!`);
      if (onRefreshData) onRefreshData();
      setTimeout(() => setSyncStatusMsg(null), 4000);
    } catch (e) {
      setSyncStatusMsg(`Sync error: ${e.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSelectStructure = (s) => {
    setSelectedStructure(s);
    setActualStatus(s.priority === 'HIGH' ? 'DRY' : 'HOLDING_WATER');
    setBundCondition('INTACT');
    setSiltationLevel('LOW');
    setWaterDepth(s.priority === 'HIGH' ? '0.0' : '1.5');
    setNotes('');
    setPhotoPreview(null);
  };

  const handlePhotoCapture = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (loadEvt) => {
        setPhotoPreview(loadEvt.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveInspection = () => {
    if (!selectedStructure) return;

    const payload = {
      structure_id: selectedStructure.id,
      inspector_id: 'usr-worker-01',
      inspector_name: 'Ramesh Kushwaha (Field GRS)',
      actual_status: actualStatus,
      water_depth_meters: parseFloat(waterDepth) || 0.0,
      bund_condition: bundCondition,
      siltation_level: siltationLevel,
      photo_url: photoPreview ? '/static/photos/field_sample_verification.jpg' : null,
      notes: notes || `Field ground verification conducted at ${selectedStructure.village || 'panchayat'}. Embankment: ${bundCondition}.`,
      worker_latitude: selectedStructure.latitude + 0.00005, // simulated within 5 meters
      worker_longitude: selectedStructure.longitude + 0.00004
    };

    // Save offline
    saveInspectionOffline(payload);
    setPendingQueue(getOfflineInspections());

    // Update structure local status preview
    selectedStructure.latest_inspection_status = actualStatus;

    if (onInspectionSaved) onInspectionSaved();

    // Reset selection
    setSelectedStructure(null);

    // If online, immediately sync
    if (!isOfflineMode) {
      triggerBatchSync();
    }
  };

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto' }}>
      {/* Mobile Device Frame Header */}
      <div style={{
        background: '#0f172a',
        border: '1px solid rgba(148, 163, 184, 0.25)',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)'
      }}>
        {/* Top App Status Bar */}
        <div style={{
          background: '#090d16',
          padding: '10px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid rgba(148, 163, 184, 0.12)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Smartphone size={16} color="#38bdf8" />
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#f8fafc' }}>
              JalSakshya Field Mobile (Offline-First)
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Toggle offline mode */}
            <button
              onClick={toggleOfflineMode}
              style={{
                background: isOfflineMode ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                border: `1px solid ${isOfflineMode ? '#ef4444' : '#10b981'}`,
                color: isOfflineMode ? '#fca5a5' : '#6ee7b7',
                padding: '3px 8px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              {isOfflineMode ? <WifiOff size={11} /> : <Wifi size={11} />}
              {isOfflineMode ? 'Offline Mode (Remote Village)' : 'Online (4G / Wi-Fi)'}
            </button>
          </div>
        </div>

        {/* Offline Queue Sync Bar */}
        <div style={{
          background: pendingQueue.length > 0 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.1)',
          borderBottom: '1px solid rgba(148, 163, 184, 0.12)',
          padding: '8px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '12px'
        }}>
          <span style={{ color: pendingQueue.length > 0 ? '#fcd34d' : '#6ee7b7', fontWeight: 600 }}>
            {pendingQueue.length > 0 
              ? `📦 ${pendingQueue.length} inspection(s) queued offline` 
              : "✓ All offline records synchronized with server"}
          </span>

          {pendingQueue.length > 0 && (
            <button
              onClick={triggerBatchSync}
              disabled={isSyncing || isOfflineMode}
              className="btn-primary"
              style={{ padding: '4px 10px', fontSize: '11px' }}
            >
              <UploadCloud size={13} />
              {isSyncing ? "Syncing..." : isOfflineMode ? "Go Online to Sync" : "Sync Now"}
            </button>
          )}
        </div>

        {syncStatusMsg && (
          <div style={{ padding: '8px 16px', background: 'rgba(2, 132, 199, 0.2)', color: '#38bdf8', fontSize: '11px', textAlign: 'center' }}>
            {syncStatusMsg}
          </div>
        )}

        {/* Content View: List or Inspection Form */}
        <div style={{ padding: '16px', maxHeight: '680px', overflowY: 'auto' }}>
          {!selectedStructure ? (
            /* Queue List */
            <div>
              <div style={{ marginBottom: '12px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#f8fafc' }}>
                  Assigned Inspection Queue (Ranked)
                </h3>
                <p style={{ fontSize: '11px', color: '#94a3b8' }}>
                  High-priority structures are flagged by Sentinel-2 as likely empty or failed. Verify them first.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {assignedList.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => handleSelectStructure(s)}
                    style={{
                      background: 'rgba(30, 41, 59, 0.6)',
                      border: `1px solid ${s.priority === 'HIGH' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(148, 163, 184, 0.15)'}`,
                      borderRadius: '10px',
                      padding: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '999px',
                        background: s.priority === 'HIGH' ? 'rgba(239, 68, 68, 0.2)' : s.priority === 'LOW' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                        color: s.priority === 'HIGH' ? '#fca5a5' : s.priority === 'LOW' ? '#6ee7b7' : '#fcd34d'
                      }}>
                        {s.priority === 'HIGH' ? '🚨 Inspect First' : s.priority}
                      </span>
                      <span style={{ fontSize: '10px', fontFamily: 'monospace', color: '#94a3b8' }}>{s.id}</span>
                    </div>

                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc', marginBottom: '2px' }}>
                      {s.name}
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '8px' }}>
                      {s.village ? `${s.village}, ` : ''}{s.block} • GPS: {s.latitude?.toFixed(4)}, {s.longitude?.toFixed(4)}
                    </div>

                    <div style={{ 
                      fontSize: '11px', 
                      color: '#cbd5e1', 
                      background: 'rgba(15, 23, 42, 0.5)', 
                      padding: '6px 8px', 
                      borderRadius: '6px',
                      marginBottom: '8px',
                      fontStyle: 'italic'
                    }}>
                      Satellite: {s.assessment_reason ? s.assessment_reason.substring(0, 85) + '...' : 'Awaiting optical pass'}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', color: s.latest_inspection_status ? '#34d399' : '#94a3b8' }}>
                        {s.latest_inspection_status ? `✓ Verified: ${s.latest_inspection_status}` : 'Pending Ground Verification'}
                      </span>
                      <button
                        className="btn-primary"
                        style={{ padding: '4px 10px', fontSize: '11px' }}
                      >
                        Verify Now →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Inspection Verification Form */
            <div>
              <button
                onClick={() => setSelectedStructure(null)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'transparent',
                  border: 'none',
                  color: '#38bdf8',
                  fontSize: '12px',
                  cursor: 'pointer',
                  marginBottom: '12px'
                }}
              >
                <ArrowLeft size={14} /> Back to Queue
              </button>

              <div style={{
                background: 'rgba(15, 23, 42, 0.8)',
                padding: '12px',
                borderRadius: '10px',
                border: '1px solid rgba(148, 163, 184, 0.2)',
                marginBottom: '1rem'
              }}>
                <div style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 600 }}>{selectedStructure.id}</div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#f8fafc' }}>{selectedStructure.name}</div>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                  GPS: {selectedStructure.latitude?.toFixed(4)}, {selectedStructure.longitude?.toFixed(4)} • {selectedStructure.structure_type}
                </div>
              </div>

              {/* Status Selector */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#f8fafc', display: 'block', marginBottom: '6px' }}>
                  Actual Physical Status *
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {[
                    { id: 'HOLDING_WATER', label: '💧 Holding Water (Functional)', color: '#34d399' },
                    { id: 'PARTIALLY_FILLED', label: '⚠️ Partially Filled (Receding)', color: '#fbbf24' },
                    { id: 'DRY', label: '🏜️ Completely Dry Basin', color: '#f87171' },
                    { id: 'DAMAGED', label: '💥 Damaged (Bund Breached / Broken Spillway)', color: '#f87171' },
                    { id: 'NOT_FOUND', label: '❌ Not Found / Encroached', color: '#94a3b8' }
                  ].map((opt) => (
                    <label
                      key={opt.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        background: actualStatus === opt.id ? 'rgba(2, 132, 199, 0.25)' : 'rgba(30, 41, 59, 0.4)',
                        border: `1px solid ${actualStatus === opt.id ? '#0284c7' : 'rgba(148, 163, 184, 0.15)'}`,
                        cursor: 'pointer',
                        fontSize: '12px',
                        color: opt.color
                      }}
                    >
                      <input
                        type="radio"
                        name="actualStatus"
                        value={opt.id}
                        checked={actualStatus === opt.id}
                        onChange={() => setActualStatus(opt.id)}
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Bund condition & depth */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '1rem' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                    Bund Embankment
                  </label>
                  <select
                    value={bundCondition}
                    onChange={(e) => setBundCondition(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px',
                      background: 'rgba(15, 23, 42, 0.8)',
                      border: '1px solid rgba(148, 163, 184, 0.2)',
                      borderRadius: '6px',
                      color: '#f8fafc',
                      fontSize: '12px'
                    }}
                  >
                    <option value="INTACT">Intact & Stable</option>
                    <option value="PARTIAL_EROSION">Partial Erosion / Seepage</option>
                    <option value="BREACHED">Breached / Blown Out</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                    Water Depth (m)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={waterDepth}
                    onChange={(e) => setWaterDepth(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px',
                      background: 'rgba(15, 23, 42, 0.8)',
                      border: '1px solid rgba(148, 163, 184, 0.2)',
                      borderRadius: '6px',
                      color: '#f8fafc',
                      fontSize: '12px'
                    }}
                  />
                </div>
              </div>

              {/* Camera Photo Upload */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                  Field Photo Evidence (Works Offline)
                </label>
                <div
                  onClick={() => document.getElementById('camera-photo-input').click()}
                  style={{
                    border: '1px dashed rgba(148, 163, 184, 0.3)',
                    borderRadius: '8px',
                    padding: '16px',
                    textAlign: 'center',
                    background: 'rgba(15, 23, 42, 0.4)',
                    cursor: 'pointer'
                  }}
                >
                  <input
                    id="camera-photo-input"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoCapture}
                    style={{ display: 'none' }}
                  />
                  {photoPreview ? (
                    <img
                      src={photoPreview}
                      alt="Field capture"
                      style={{ maxHeight: '120px', borderRadius: '6px', margin: '0 auto' }}
                    />
                  ) : (
                    <div>
                      <Camera size={24} color="#38bdf8" style={{ margin: '0 auto 6px auto' }} />
                      <div style={{ fontSize: '12px', color: '#cbd5e1' }}>Tap to take photo or choose image</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                  Worker Field Notes
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Record siltation condition, drinking/irrigation usage, or structural damage..."
                  style={{
                    width: '100%',
                    padding: '8px',
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    borderRadius: '6px',
                    color: '#f8fafc',
                    fontSize: '12px',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Submit Button */}
              <button
                onClick={handleSaveInspection}
                className="btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '13px' }}
              >
                <Save size={16} />
                Save Verification (Offline Safe)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
