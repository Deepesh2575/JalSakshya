import React, { useState } from 'react';
import { X, Upload, FileSpreadsheet, Download, CheckCircle, AlertCircle, HelpCircle } from 'lucide-react';
import { uploadStructureFile } from '../services/api';

export default function UploadModal({ onClose, onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    try {
      setUploading(true);
      setError(null);
      const res = await uploadStructureFile(file);
      setResult(res);
      if (onUploadSuccess) onUploadSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="glass-panel animate-fade-in"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '90%',
          maxWidth: '680px',
          background: 'rgba(15, 23, 42, 0.98)',
          border: '1px solid rgba(148, 163, 184, 0.25)',
          padding: '1.75rem',
          borderRadius: '16px'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileSpreadsheet size={20} color="#38bdf8" />
              Upload Water Structures File
            </h2>
            <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
              Upload Excel (.xlsx, .xls) or CSV with coordinates to trigger Sentinel-2 dry season analysis.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '6px'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Download Sample Templates Banner */}
        <div style={{
          background: 'rgba(2, 132, 199, 0.1)',
          border: '1px solid rgba(56, 189, 248, 0.2)',
          borderRadius: '10px',
          padding: '12px 14px',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px'
        }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#38bdf8' }}>
              Need the official format?
            </div>
            <div style={{ fontSize: '11px', color: '#cbd5e1' }}>
              Download pre-formatted Excel or CSV template with example ponds & check dams.
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <a
              href="/api/v1/structures/template?file_format=xlsx"
              download="jalsakshya_template.xlsx"
              className="btn-secondary"
              style={{ fontSize: '11px', padding: '5px 10px', textDecoration: 'none' }}
            >
              <Download size={12} /> Excel (.xlsx)
            </a>
            <a
              href="/api/v1/structures/template?file_format=csv"
              download="jalsakshya_template.csv"
              className="btn-secondary"
              style={{ fontSize: '11px', padding: '5px 10px', textDecoration: 'none' }}
            >
              <Download size={12} /> CSV (.csv)
            </a>
          </div>
        </div>

        {/* Upload Drop Zone */}
        {!result && (
          <div
            style={{
              border: '2px dashed rgba(148, 163, 184, 0.3)',
              borderRadius: '12px',
              padding: '2.5rem 1.5rem',
              textAlign: 'center',
              background: 'rgba(15, 23, 42, 0.4)',
              cursor: 'pointer',
              marginBottom: '1.25rem'
            }}
            onClick={() => document.getElementById('file-upload-input').click()}
          >
            <input
              id="file-upload-input"
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            <Upload size={36} color="#38bdf8" style={{ margin: '0 auto 12px auto' }} />
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#f8fafc', marginBottom: '4px' }}>
              {file ? file.name : "Click to select or drag & drop Excel / CSV file"}
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
              Expected columns: Structure ID, Name, Type, Latitude, Longitude, Size (ha), Year
            </div>
          </div>
        )}

        {/* Upload Action */}
        {!result && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="btn-primary"
              style={{ opacity: !file || uploading ? 0.6 : 1 }}
            >
              {uploading ? "Analyzing Sentinel-2 Imagery..." : "Upload & Analyze Structures"}
            </button>
          </div>
        )}

        {/* Error Notification */}
        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: '8px',
            padding: '12px',
            marginTop: '1rem',
            color: '#fca5a5',
            fontSize: '12px',
            display: 'flex',
            gap: '8px',
            alignItems: 'center'
          }}>
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {/* Success Report */}
        {result && (
          <div style={{ marginTop: '0.5rem' }}>
            <div style={{
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              borderRadius: '10px',
              padding: '14px',
              marginBottom: '1rem',
              display: 'flex',
              gap: '10px',
              alignItems: 'center'
            }}>
              <CheckCircle size={22} color="#34d399" />
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>
                  Analysis Complete: {result.valid_count} Structures Ingested
                </div>
                <div style={{ fontSize: '11px', color: '#6ee7b7' }}>
                  Coordinates verified within India; Sentinel-2 dry season NDWI calculated.
                </div>
              </div>
            </div>

            {/* Results Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '8px',
              marginBottom: '1.25rem',
              textAlign: 'center'
            }}>
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f87171' }}>{result.high_priority_count}</div>
                <div style={{ fontSize: '10px', color: '#fca5a5' }}>High Priority</div>
              </div>
              <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fbbf24' }}>{result.medium_priority_count}</div>
                <div style={{ fontSize: '10px', color: '#fcd34d' }}>Medium Priority</div>
              </div>
              <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#34d399' }}>{result.low_priority_count}</div>
                <div style={{ fontSize: '10px', color: '#6ee7b7' }}>Low Priority</div>
              </div>
              <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#c4b5fd' }}>{result.cannot_assess_count}</div>
                <div style={{ fontSize: '10px', color: '#c4b5fd' }}>&lt; 0.15 ha Pixel Limit</div>
              </div>
            </div>

            {/* Resolution limit warning notice if any were <0.15 ha */}
            {result.below_resolution_limit_count > 0 && (
              <div style={{
                background: 'rgba(139, 92, 246, 0.15)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                borderRadius: '8px',
                padding: '10px',
                marginBottom: '1rem',
                fontSize: '11px',
                color: '#e9d5ff',
                display: 'flex',
                gap: '8px'
              }}>
                <HelpCircle size={15} style={{ flexShrink: 0 }} />
                <span>
                  {result.below_resolution_limit_count} structure(s) are smaller than ~0.15 ha (~1500m²). 
                  They have been marked <strong>Cannot Assess</strong> due to Sentinel-2 10m pixel limitations. Ground physical inspection is required.
                </span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={onClose} className="btn-primary">
                View in GIS Command Center →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
