import React from 'react';
import { AlertTriangle, Clock, CheckCircle, HelpCircle, Layers, CheckCheck } from 'lucide-react';

export default function StatsOverview({ structures, onSelectPriorityFilter, selectedPriority }) {
  const total = structures.length;
  const highCount = structures.filter(s => s.priority === 'HIGH').length;
  const medCount = structures.filter(s => s.priority === 'MEDIUM').length;
  const lowCount = structures.filter(s => s.priority === 'LOW').length;
  const cannotCount = structures.filter(s => s.priority === 'CANNOT_ASSESS').length;
  const verifiedCount = structures.filter(s => s.latest_inspection_status).length;

  const cards = [
    {
      id: 'ALL',
      label: 'Total Structures',
      count: total,
      subtext: 'Ponds & Check Dams',
      color: '#0ea5e9',
      bg: 'rgba(14, 165, 233, 0.1)',
      border: 'rgba(14, 165, 233, 0.25)',
      icon: Layers,
    },
    {
      id: 'HIGH',
      label: 'High Priority (Failed)',
      count: highCount,
      subtext: 'Inspect First • Likely Dry',
      color: '#ef4444',
      bg: 'rgba(239, 68, 68, 0.12)',
      border: 'rgba(239, 68, 68, 0.35)',
      icon: AlertTriangle,
    },
    {
      id: 'MEDIUM',
      label: 'Medium Priority',
      count: medCount,
      subtext: 'Premature Water Loss',
      color: '#f59e0b',
      bg: 'rgba(245, 158, 11, 0.12)',
      border: 'rgba(245, 158, 11, 0.35)',
      icon: Clock,
    },
    {
      id: 'LOW',
      label: 'Low Priority (Healthy)',
      count: lowCount,
      subtext: 'Holding Water in Dry Season',
      color: '#10b981',
      bg: 'rgba(16, 185, 129, 0.12)',
      border: 'rgba(16, 185, 129, 0.35)',
      icon: CheckCircle,
    },
    {
      id: 'CANNOT_ASSESS',
      label: 'Cannot Assess (<0.15 ha)',
      count: cannotCount,
      subtext: 'Below Sentinel 10m Pixel',
      color: '#8b5cf6',
      bg: 'rgba(139, 92, 246, 0.12)',
      border: 'rgba(139, 92, 246, 0.35)',
      icon: HelpCircle,
    },
    {
      id: 'VERIFIED',
      label: 'Ground Verified',
      count: verifiedCount,
      subtext: `${total > 0 ? Math.round((verifiedCount / total) * 100) : 0}% Field Ground-Truth`,
      color: '#06b6d4',
      bg: 'rgba(6, 182, 212, 0.12)',
      border: 'rgba(6, 182, 212, 0.35)',
      icon: CheckCheck,
    }
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
      gap: '12px',
      marginBottom: '1.25rem'
    }}>
      {cards.map((c) => {
        const Icon = c.icon;
        const isSelected = selectedPriority === c.id || (c.id === 'ALL' && !selectedPriority);

        return (
          <div
            key={c.id}
            onClick={() => onSelectPriorityFilter(c.id === 'ALL' ? null : c.id)}
            style={{
              background: c.bg,
              border: `1px solid ${isSelected ? c.color : c.border}`,
              borderRadius: '12px',
              padding: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: isSelected ? `0 0 16px ${c.color}33` : 'none',
              transform: isSelected ? 'translateY(-2px)' : 'none'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8' }}>{c.label}</span>
              <Icon size={16} color={c.color} />
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f8fafc', lineHeight: 1 }}>
              {c.count}
            </div>
            <div style={{ fontSize: '0.7rem', color: c.color, marginTop: '6px', fontWeight: 500 }}>
              {c.subtext}
            </div>
          </div>
        );
      })}
    </div>
  );
}
