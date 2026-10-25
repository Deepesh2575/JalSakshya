import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Eye, AlertTriangle } from 'lucide-react';

export default function StructureMap({ structures, onSelectStructure, selectedStructureId }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Default center around Central India (e.g. Datia / Bundelkhand / MP)
      const map = L.map(mapContainerRef.current, {
        center: [26.1425, 78.7842],
        zoom: 11,
        zoomControl: true,
      });

      // CartoDB Dark Matter / Sleek GIS tiles
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a> | Sentinel-2 Imagery',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Clear previous markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    const bounds = L.latLngBounds([]);

    structures.forEach(s => {
      if (!s.latitude || !s.longitude) return;

      const lat = s.latitude;
      const lon = s.longitude;
      bounds.extend([lat, lon]);

      let pinColor = '#8b5cf6';
      let priorityText = 'CANNOT ASSESS';
      if (s.priority === 'HIGH') {
        pinColor = '#ef4444';
        priorityText = 'HIGH PRIORITY (FAILED/EMPTY)';
      } else if (s.priority === 'MEDIUM') {
        pinColor = '#f59e0b';
        priorityText = 'MEDIUM PRIORITY';
      } else if (s.priority === 'LOW') {
        pinColor = '#10b981';
        priorityText = 'LOW PRIORITY (HOLDING WATER)';
      }

      const isSelected = selectedStructureId === s.id;

      // Custom SVG divIcon with glowing pulse for High Priority
      const customIcon = L.divIcon({
        className: 'custom-gis-pin',
        html: `
          <div style="
            position: relative;
            width: ${isSelected ? '32px' : '26px'};
            height: ${isSelected ? '32px' : '26px'};
            border-radius: 50%;
            background: ${pinColor};
            border: 2px solid #ffffff;
            box-shadow: 0 0 ${isSelected ? '20px' : '10px'} ${pinColor};
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            font-size: 11px;
            font-weight: 800;
          ">
            ${s.priority === 'HIGH' ? '!' : s.structure_type === 'check_dam' ? 'D' : 'P'}
          </div>
        `,
        iconSize: [26, 26],
        iconAnchor: [13, 13]
      });

      const marker = L.marker([lat, lon], { icon: customIcon }).addTo(map);

      // Popup Content
      const popupHtml = `
        <div style="font-family: system-ui, sans-serif; min-width: 210px; padding: 4px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
            <span style="font-size: 9px; font-weight: 700; color: ${pinColor}; letter-spacing: 0.05em;">
              ${priorityText}
            </span>
            <span style="font-size: 10px; color: #64748b; font-family: monospace;">${s.id}</span>
          </div>
          <h4 style="margin: 0 0 4px 0; font-size: 14px; font-weight: bold; color: #0f172a;">${s.name}</h4>
          <p style="margin: 0 0 6px 0; font-size: 11px; color: #475569;">
            ${s.village ? s.village + ', ' : ''}${s.district} • ${s.structure_type.replace('_', ' ').toUpperCase()}
          </p>
          <div style="background: #f1f5f9; padding: 6px; border-radius: 6px; font-size: 11px; margin-bottom: 8px;">
            <div><strong>Dry Season NDWI:</strong> ${s.mean_dry_season_ndwi != null ? s.mean_dry_season_ndwi : 'N/A'}</div>
            <div><strong>Water Retention:</strong> ${s.water_retention_score || 0}%</div>
            <div><strong>Size:</strong> ${s.approximate_size_ha ? s.approximate_size_ha + ' ha' : 'Unspecified'}</div>
            ${s.latest_inspection_status ? `
              <div style="margin-top: 4px; color: #0369a1; font-weight: 600;">
                Ground Reality: ${s.latest_inspection_status}
              </div>
            ` : ''}
          </div>
          <button id="btn-inspect-${s.id}" style="
            width: 100%;
            padding: 6px 10px;
            background: #0284c7;
            color: #ffffff;
            border: none;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 600;
            cursor: pointer;
          ">
            Inspect Satellite Evidence →
          </button>
        </div>
      `;

      marker.bindPopup(popupHtml);
      marker.on('popupopen', () => {
        const btn = document.getElementById(`btn-inspect-${s.id}`);
        if (btn) {
          btn.onclick = () => onSelectStructure(s);
        }
      });

      markersRef.current.push(marker);
    });

    if (structures.length > 0 && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [structures, selectedStructureId]);

  return (
    <div className="glass-panel" style={{ height: '580px', position: 'relative', overflow: 'hidden' }}>
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

      {/* Floating Map Legend */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        right: '20px',
        background: 'rgba(9, 13, 22, 0.9)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(148, 163, 184, 0.2)',
        borderRadius: '10px',
        padding: '12px 16px',
        zIndex: 1000,
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.6)',
        fontSize: '11px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        <div style={{ fontWeight: 700, color: '#f8fafc', marginBottom: '2px', letterSpacing: '0.02em' }}>
          Satellite Priority Legend
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 6px #ef4444' }} />
          <span style={{ color: '#fca5a5' }}>High: Likely Empty / Failed (Inspect First)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b' }} />
          <span style={{ color: '#fcd34d' }}>Medium: Receding / Depleted Early</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }} />
          <span style={{ color: '#6ee7b7' }}>Low: Consistently Holding Water</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#8b5cf6' }} />
          <span style={{ color: '#c4b5fd' }}>Cannot Assess (&lt; 0.15 ha, 10m Pixel Limit)</span>
        </div>
      </div>
    </div>
  );
}
