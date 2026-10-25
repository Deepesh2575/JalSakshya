import React from 'react';
import { 
  Waves, 
  MapPin, 
  ListOrdered, 
  CheckCircle2, 
  Smartphone, 
  Upload, 
  Wifi, 
  WifiOff, 
  ShieldCheck,
  Satellite
} from 'lucide-react';

export default function Navbar({ 
  activeTab, 
  setActiveTab, 
  onOpenUpload, 
  isOfflineMode, 
  toggleOfflineMode,
  offlinePendingCount,
  userRole,
  setUserRole
}) {
  return (
    <header style={{
      background: 'rgba(9, 13, 22, 0.85)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid rgba(148, 163, 184, 0.12)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      padding: '0.75rem 1.5rem'
    }}>
      <div style={{
        maxWidth: '1440px',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #0284c7 0%, #06b6d4 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(6, 182, 212, 0.35)'
          }}>
            <Waves size={24} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ 
                fontSize: '1.25rem', 
                fontWeight: 800, 
                letterSpacing: '-0.02em', 
                color: '#f8fafc',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                JalSakshya
                <span style={{ 
                  fontSize: '0.75rem', 
                  fontWeight: 600, 
                  background: 'rgba(56, 189, 248, 0.15)', 
                  color: '#38bdf8', 
                  padding: '2px 8px', 
                  borderRadius: '9999px',
                  border: '1px solid rgba(56, 189, 248, 0.3)'
                }}>
                  जल साक्ष्य
                </span>
              </h1>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Satellite size={12} color="#06b6d4" />
              Sentinel-2 Dry-Season Triage & Offline Ground-Truth
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          background: 'rgba(15, 23, 42, 0.6)',
          padding: '4px',
          borderRadius: '10px',
          border: '1px solid rgba(148, 163, 184, 0.15)'
        }}>
          <button
            onClick={() => setActiveTab('map')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '7px',
              fontSize: '0.825rem',
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              background: activeTab === 'map' ? 'rgba(2, 132, 199, 0.25)' : 'transparent',
              color: activeTab === 'map' ? '#38bdf8' : '#94a3b8',
              boxShadow: activeTab === 'map' ? '0 0 12px rgba(56, 189, 248, 0.2)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            <MapPin size={15} />
            Map View
          </button>

          <button
            onClick={() => setActiveTab('list')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '7px',
              fontSize: '0.825rem',
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              background: activeTab === 'list' ? 'rgba(2, 132, 199, 0.25)' : 'transparent',
              color: activeTab === 'list' ? '#38bdf8' : '#94a3b8',
              transition: 'all 0.2s'
            }}
          >
            <ListOrdered size={15} />
            Ranked Queue
          </button>

          <button
            onClick={() => setActiveTab('accuracy')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '7px',
              fontSize: '0.825rem',
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              background: activeTab === 'accuracy' ? 'rgba(2, 132, 199, 0.25)' : 'transparent',
              color: activeTab === 'accuracy' ? '#38bdf8' : '#94a3b8',
              transition: 'all 0.2s'
            }}
          >
            <CheckCircle2 size={15} />
            Prediction vs Reality
          </button>

          <button
            onClick={() => setActiveTab('mobile')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '7px',
              fontSize: '0.825rem',
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              background: activeTab === 'mobile' ? 'rgba(13, 148, 136, 0.25)' : 'transparent',
              color: activeTab === 'mobile' ? '#2dd4bf' : '#94a3b8',
              transition: 'all 0.2s'
            }}
          >
            <Smartphone size={15} />
            Field App {offlinePendingCount > 0 && (
              <span style={{
                background: '#ef4444',
                color: '#fff',
                fontSize: '10px',
                padding: '1px 6px',
                borderRadius: '999px',
                fontWeight: 700
              }}>
                {offlinePendingCount}
              </span>
            )}
          </button>
        </nav>

        {/* Right Tools: Offline simulator switch + Upload Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Offline Simulation Toggle */}
          <button
            onClick={toggleOfflineMode}
            title={isOfflineMode ? "Simulating No Internet (Offline Mode)" : "Connected to Online Network"}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: isOfflineMode ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
              border: `1px solid ${isOfflineMode ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.3)'}`,
              color: isOfflineMode ? '#f87171' : '#34d399',
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            {isOfflineMode ? <WifiOff size={14} /> : <Wifi size={14} />}
            {isOfflineMode ? "Simulate Offline" : "Online Live"}
          </button>

          {/* Upload Button */}
          <button
            onClick={onOpenUpload}
            className="btn-primary"
            style={{ padding: '7px 14px', fontSize: '0.825rem' }}
          >
            <Upload size={15} />
            Upload Structures (Excel/CSV)
          </button>
        </div>
      </div>
    </header>
  );
}
