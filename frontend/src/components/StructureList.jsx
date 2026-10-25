import React, { useState } from 'react';
import { Search, Filter, AlertTriangle, ArrowUpDown, Eye, ExternalLink, HelpCircle } from 'lucide-react';

export default function StructureList({ 
  structures, 
  onSelectStructure, 
  priorityFilter, 
  setPriorityFilter 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [sortField, setSortField] = useState('priority');

  const filtered = structures.filter(s => {
    if (priorityFilter && s.priority !== priorityFilter) return false;
    if (typeFilter && s.structure_type !== typeFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchName = s.name.toLowerCase().includes(q);
      const matchId = s.id.toLowerCase().includes(q);
      const matchVillage = (s.village || '').toLowerCase().includes(q);
      const matchBlock = (s.block || '').toLowerCase().includes(q);
      if (!matchName && !matchId && !matchVillage && !matchBlock) return false;
    }
    return true;
  });

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'HIGH':
        return <span className="badge-priority high">🚨 High (Inspect First)</span>;
      case 'MEDIUM':
        return <span className="badge-priority medium">⚠️ Medium (Declining)</span>;
      case 'LOW':
        return <span className="badge-priority low">✓ Low (Healthy)</span>;
      default:
        return <span className="badge-priority cannot">⚠️ Cannot Assess (&lt;0.15 ha)</span>;
    }
  };

  const getGroundTruthBadge = (status) => {
    if (!status) {
      return (
        <span style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>
          Pending Ground Inspection
        </span>
      );
    }
    const colors = {
      HOLDING_WATER: '#34d399',
      PARTIALLY_FILLED: '#fbbf24',
      DRY: '#f87171',
      DAMAGED: '#f87171',
      NOT_FOUND: '#94a3b8'
    };
    return (
      <span style={{
        fontSize: '11px',
        fontWeight: 600,
        color: colors[status] || '#38bdf8',
        background: 'rgba(255, 255, 255, 0.05)',
        padding: '3px 8px',
        borderRadius: '6px',
        border: `1px solid ${colors[status]}40`
      }}>
        Ground: {status.replace('_', ' ')}
      </span>
    );
  };

  return (
    <div className="glass-panel" style={{ padding: '1.25rem' }}>
      {/* Controls Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '1.25rem'
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1', minWidth: '240px' }}>
          <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '11px' }} />
          <input
            type="text"
            placeholder="Search structure name, ID, village, or block..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px 9px 36px',
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid rgba(148, 163, 184, 0.2)',
              borderRadius: '8px',
              color: '#f8fafc',
              fontSize: '13px',
              outline: 'none'
            }}
          />
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <select
            value={priorityFilter || ''}
            onChange={(e) => setPriorityFilter(e.target.value || null)}
            style={{
              padding: '9px 12px',
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid rgba(148, 163, 184, 0.2)',
              borderRadius: '8px',
              color: '#f8fafc',
              fontSize: '13px',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="">All Priorities</option>
            <option value="HIGH">🚨 High Priority (Failed)</option>
            <option value="MEDIUM">⚠️ Medium Priority</option>
            <option value="LOW">✓ Low Priority (Healthy)</option>
            <option value="CANNOT_ASSESS">Cannot Assess (&lt;0.15 ha)</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{
              padding: '9px 12px',
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid rgba(148, 163, 184, 0.2)',
              borderRadius: '8px',
              color: '#f8fafc',
              fontSize: '13px',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="">All Types</option>
            <option value="pond">Village Pond (Talab)</option>
            <option value="check_dam">Check Dam / Bandhara</option>
            <option value="percolation_tank">Percolation Tank</option>
            <option value="amrit_sarovar">Amrit Sarovar</option>
          </select>
        </div>
      </div>

      {/* Ranked Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.15)', color: '#94a3b8' }}>
              <th style={{ padding: '10px 12px', fontWeight: 600 }}>Priority & ID</th>
              <th style={{ padding: '10px 12px', fontWeight: 600 }}>Structure Name & Location</th>
              <th style={{ padding: '10px 12px', fontWeight: 600 }}>Size & Resolution</th>
              <th style={{ padding: '10px 12px', fontWeight: 600 }}>Dry Season NDWI</th>
              <th style={{ padding: '10px 12px', fontWeight: 600 }}>Field Verification</th>
              <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'right' }}>Telemetry</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                  No structures match the selected filter criteria.
                </td>
              </tr>
            ) : (
              filtered.map((s) => {
                const isSmall = s.approximate_size_ha != null && s.approximate_size_ha < 0.15;

                return (
                  <tr
                    key={s.id}
                    style={{
                      borderBottom: '1px solid rgba(148, 163, 184, 0.08)',
                      transition: 'background 0.15s ease',
                      cursor: 'pointer'
                    }}
                    onClick={() => onSelectStructure(s)}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(30, 41, 59, 0.4)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    {/* Priority & ID */}
                    <td style={{ padding: '12px' }}>
                      <div style={{ marginBottom: '4px' }}>
                        {getPriorityBadge(s.priority)}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>
                        {s.id}
                      </div>
                    </td>

                    {/* Name & Location */}
                    <td style={{ padding: '12px' }}>
                      <div style={{ fontWeight: 700, color: '#f8fafc', marginBottom: '2px' }}>
                        {s.name}
                      </div>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                        {s.village ? `${s.village}, ` : ''}{s.block ? `${s.block}, ` : ''}{s.district} • {s.structure_type.replace('_', ' ')}
                      </div>
                    </td>

                    {/* Size & Resolution */}
                    <td style={{ padding: '12px' }}>
                      <div style={{ fontWeight: 600, color: '#cbd5e1' }}>
                        {s.approximate_size_ha ? `${s.approximate_size_ha} ha` : 'Unspecified'}
                      </div>
                      {isSmall ? (
                        <div style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '3px', 
                          fontSize: '10px', 
                          color: '#c4b5fd',
                          background: 'rgba(139, 92, 246, 0.15)',
                          padding: '1px 5px',
                          borderRadius: '4px',
                          marginTop: '2px'
                        }}>
                          <HelpCircle size={10} /> &lt; 0.15 ha pixel limit
                        </div>
                      ) : (
                        <div style={{ fontSize: '10px', color: '#64748b' }}>
                          Sentinel-2 resolvable
                        </div>
                      )}
                    </td>

                    {/* NDWI & Retention */}
                    <td style={{ padding: '12px' }}>
                      <div style={{ 
                        fontWeight: 700, 
                        color: (s.mean_dry_season_ndwi || 0) > 0.05 ? '#38bdf8' : '#f87171' 
                      }}>
                        NDWI: {s.mean_dry_season_ndwi != null ? `${s.mean_dry_season_ndwi > 0 ? '+' : ''}${s.mean_dry_season_ndwi.toFixed(2)}` : 'N/A'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                        Retention: {s.water_retention_score || 0}%
                      </div>
                    </td>

                    {/* Field Verification */}
                    <td style={{ padding: '12px' }}>
                      {getGroundTruthBadge(s.latest_inspection_status)}
                    </td>

                    {/* Action */}
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectStructure(s);
                        }}
                        className="btn-secondary"
                        style={{ padding: '5px 10px', fontSize: '11px' }}
                      >
                        <Eye size={13} />
                        View Telemetry
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
