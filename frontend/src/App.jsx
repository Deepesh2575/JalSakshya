import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import StatsOverview from './components/StatsOverview';
import StructureMap from './components/StructureMap';
import StructureList from './components/StructureList';
import AccuracyComparison from './components/AccuracyComparison';
import FieldWorkerApp from './components/FieldWorkerApp';
import StructureDetailModal from './components/StructureDetailModal';
import UploadModal from './components/UploadModal';
import { getStructures } from './services/api';
import { 
  isOfflineSimulationActive, 
  setOfflineSimulation, 
  getOfflineInspections 
} from './services/offlineStorage';

export default function App() {
  const [structures, setStructures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('map');
  const [selectedStructure, setSelectedStructure] = useState(null);
  const [selectedPriority, setSelectedPriority] = useState(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(isOfflineSimulationActive());
  const [offlinePendingCount, setOfflinePendingCount] = useState(getOfflineInspections().length);
  const [userRole, setUserRole] = useState('OFFICER');

  useEffect(() => {
    loadStructures();
  }, [selectedPriority]);

  const loadStructures = async () => {
    try {
      setLoading(true);
      const filters = {};
      if (selectedPriority) filters.priority = selectedPriority;
      const data = await getStructures(filters);
      setStructures(data);
    } catch (e) {
      console.error("Failed to load structures:", e);
    } finally {
      setLoading(false);
    }
    setOfflinePendingCount(getOfflineInspections().length);
  };

  const handleToggleOfflineMode = () => {
    const nextVal = !isOfflineMode;
    setIsOfflineMode(nextVal);
    setOfflineSimulation(nextVal);
  };

  const handleInspectionSaved = () => {
    setOfflinePendingCount(getOfflineInspections().length);
    loadStructures();
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenUpload={() => setIsUploadOpen(true)}
        isOfflineMode={isOfflineMode}
        toggleOfflineMode={handleToggleOfflineMode}
        offlinePendingCount={offlinePendingCount}
        userRole={userRole}
        setUserRole={setUserRole}
      />

      {/* Main Container */}
      <main style={{
        maxWidth: '1440px',
        width: '100%',
        margin: '0 auto',
        padding: '1.5rem',
        flex: 1
      }}>
        {/* Top Summary Stats Bar (Shown on map & list tabs) */}
        {activeTab !== 'mobile' && (
          <StatsOverview
            structures={structures}
            selectedPriority={selectedPriority}
            onSelectPriorityFilter={(p) => setSelectedPriority(p)}
          />
        )}

        {/* Tab Views */}
        {activeTab === 'map' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem' }}>
            <StructureMap
              structures={structures}
              onSelectStructure={(s) => setSelectedStructure(s)}
              selectedStructureId={selectedStructure?.id}
            />

            {/* Quick Ranked Preview below map */}
            <div style={{ marginTop: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#f8fafc' }}>
                  Ranked Priority Triage Queue
                </h3>
                <button
                  onClick={() => setActiveTab('list')}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#38bdf8',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  View Full Table & Filters →
                </button>
              </div>
              <StructureList
                structures={structures.slice(0, 5)}
                onSelectStructure={(s) => setSelectedStructure(s)}
                priorityFilter={selectedPriority}
                setPriorityFilter={setSelectedPriority}
              />
            </div>
          </div>
        )}

        {activeTab === 'list' && (
          <StructureList
            structures={structures}
            onSelectStructure={(s) => setSelectedStructure(s)}
            priorityFilter={selectedPriority}
            setPriorityFilter={setSelectedPriority}
          />
        )}

        {activeTab === 'accuracy' && (
          <AccuracyComparison />
        )}

        {activeTab === 'mobile' && (
          <FieldWorkerApp
            structures={structures}
            isOfflineMode={isOfflineMode}
            toggleOfflineMode={handleToggleOfflineMode}
            onRefreshData={loadStructures}
            onInspectionSaved={handleInspectionSaved}
          />
        )}
      </main>

      {/* Structure Detail Telemetry Modal */}
      {selectedStructure && (
        <StructureDetailModal
          structure={selectedStructure}
          onClose={() => setSelectedStructure(null)}
          onRefreshList={loadStructures}
        />
      )}

      {/* Upload Structures Modal */}
      {isUploadOpen && (
        <UploadModal
          onClose={() => setIsUploadOpen(false)}
          onUploadSuccess={() => {
            loadStructures();
            setActiveTab('list');
          }}
        />
      )}

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid rgba(148, 163, 184, 0.12)',
        background: 'rgba(9, 13, 22, 0.95)',
        padding: '1.25rem 1.5rem',
        marginTop: 'auto',
        fontSize: '12px',
        color: '#64748b'
      }}>
        <div style={{
          maxWidth: '1440px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div>
            <strong>JalSakshya</strong> (जल साक्ष्य) — Sentinel-2 Satellite Water Monitoring & Offline Field Verification
          </div>
          <div>
            Structures &lt; 0.15 ha marked as "Cannot assess" per 10m optical spatial resolution limits.
          </div>
        </div>
      </footer>
    </div>
  );
}
