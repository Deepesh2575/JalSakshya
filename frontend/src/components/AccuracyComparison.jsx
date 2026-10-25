import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, ShieldAlert, Award, TrendingUp, Info } from 'lucide-react';
import { getAnalyticsComparison } from '../services/api';

export default function AccuracyComparison() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadComparison();
  }, []);

  const loadComparison = async () => {
    try {
      setLoading(true);
      const res = await getAnalyticsComparison();
      setData(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>Loading ground-truth validation comparison metrics...</div>;
  }

  if (error) {
    return <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: '#f87171' }}>Failed to load metrics: {error}</div>;
  }

  const { summary, metrics, confusion_matrix, comparison_table, disclaimer } = data;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Scientific Honesty & Regulatory Disclaimer Banner */}
      <div style={{
        background: 'rgba(2, 132, 199, 0.1)',
        border: '1px solid rgba(56, 189, 248, 0.25)',
        borderRadius: '12px',
        padding: '16px',
        display: 'flex',
        gap: '12px',
        alignItems: 'flex-start'
      }}>
        <Info size={20} color="#38bdf8" style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc', marginBottom: '2px' }}>
            {disclaimer.notice}
          </div>
          <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: '1.5' }}>
            {disclaimer.message}
          </div>
        </div>
      </div>

      {/* Top Metrics Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '12px'
      }}>
        <div className="glass-panel" style={{ padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px', fontWeight: 600 }}>Triage Accuracy</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#38bdf8' }}>
            {metrics.accuracy_pct}%
          </div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>
            Based on {metrics.evaluable_sample_size} field-verified ponds
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px', fontWeight: 600 }}>Precision (Failure Detection)</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#10b981' }}>
            {metrics.precision_pct}%
          </div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>
            Correctly caught true dry/failed structures
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px', fontWeight: 600 }}>Ground Truth Coverage</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#f59e0b' }}>
            {summary.verification_rate_pct}%
          </div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>
            {summary.total_verified} of {summary.total_structures} structures verified
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px', fontWeight: 600 }}>Resolution Threshold Filter</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#8b5cf6' }}>
            {summary.cannot_assess_count}
          </div>
          <div style={{ fontSize: '11px', color: '#c4b5fd' }}>
            Excluded from triage (&lt; 0.15 ha)
          </div>
        </div>
      </div>

      {/* Confusion Matrix Section */}
      <div className="glass-panel" style={{ padding: '1.25rem' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#f8fafc', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Award size={18} color="#06b6d4" />
          Satellite Prediction vs Field Ground Reality (Confusion Matrix)
        </h3>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '12px',
          maxWidth: '680px',
          margin: '0 auto'
        }}>
          {/* True Positive */}
          <div className="matrix-cell tp">
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#fca5a5', textTransform: 'uppercase' }}>
              True Positives (Correct Failure Alert)
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ef4444', margin: '6px 0' }}>
              {confusion_matrix.true_positives}
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
              Satellite flagged <strong>High Priority</strong> and Field Worker verified <strong>Dry / Damaged</strong>.
            </div>
          </div>

          {/* False Positive */}
          <div className="matrix-cell">
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase' }}>
              False Positives (False Alarm)
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#f59e0b', margin: '6px 0' }}>
              {confusion_matrix.false_positives}
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
              Satellite flagged <strong>High Priority</strong> but Field Worker found <strong>Holding Water</strong>.
            </div>
          </div>

          {/* False Negative */}
          <div className="matrix-cell">
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase' }}>
              False Negatives (Missed Failure)
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#f59e0b', margin: '6px 0' }}>
              {confusion_matrix.false_negatives}
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
              Satellite predicted <strong>Low Priority</strong> but structure was actually <strong>Dry</strong>.
            </div>
          </div>

          {/* True Negative */}
          <div className="matrix-cell tn">
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#6ee7b7', textTransform: 'uppercase' }}>
              True Negatives (Correct Healthy Pond)
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#10b981', margin: '6px 0' }}>
              {confusion_matrix.true_negatives}
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
              Satellite predicted <strong>Low Priority</strong> and Field Worker confirmed <strong>Holding Water</strong>.
            </div>
          </div>
        </div>
      </div>

      {/* Comparison Records Table */}
      <div className="glass-panel" style={{ padding: '1.25rem' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#f8fafc', marginBottom: '12px' }}>
          Ground Verification Audit Log
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.15)', color: '#94a3b8' }}>
                <th style={{ padding: '8px 10px' }}>Structure</th>
                <th style={{ padding: '8px 10px' }}>Satellite Triage</th>
                <th style={{ padding: '8px 10px' }}>Field Ground Status</th>
                <th style={{ padding: '8px 10px' }}>Bund Condition</th>
                <th style={{ padding: '8px 10px' }}>Agreement</th>
                <th style={{ padding: '8px 10px' }}>Field Worker Notes</th>
              </tr>
            </thead>
            <tbody>
              {comparison_table.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                    No field ground-truth inspections recorded yet.
                  </td>
                </tr>
              ) : (
                comparison_table.map((rec, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.08)' }}>
                    <td style={{ padding: '10px' }}>
                      <div style={{ fontWeight: 700, color: '#f8fafc' }}>{rec.structure_name}</div>
                      <div style={{ fontSize: '10px', color: '#64748b' }}>{rec.structure_id} • {rec.district}</div>
                    </td>
                    <td style={{ padding: '10px' }}>
                      <span style={{ 
                        fontWeight: 700, 
                        color: rec.satellite_priority === 'HIGH' ? '#f87171' : rec.satellite_priority === 'LOW' ? '#34d399' : '#fbbf24' 
                      }}>
                        {rec.satellite_priority}
                      </span>
                    </td>
                    <td style={{ padding: '10px' }}>
                      <span style={{ fontWeight: 600, color: '#e2e8f0' }}>
                        {rec.ground_status.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '10px', color: '#94a3b8' }}>
                      {rec.bund_condition}
                    </td>
                    <td style={{ padding: '10px' }}>
                      {rec.agrees ? (
                        <span style={{ color: '#34d399', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircle2 size={13} /> Validated
                        </span>
                      ) : (
                        <span style={{ color: '#fbbf24', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <AlertTriangle size={13} /> Discrepancy
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '10px', color: '#cbd5e1', maxWidth: '300px' }}>
                      {rec.notes || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
