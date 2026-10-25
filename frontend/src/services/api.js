const API_BASE = '/api/v1';

export async function getStructures(filters = {}) {
  const params = new URLSearchParams();
  if (filters.priority) params.append('priority', filters.priority);
  if (filters.structure_type) params.append('structure_type', filters.structure_type);
  if (filters.district) params.append('district', filters.district);
  if (filters.search) params.append('search', filters.search);
  if (filters.assigned_worker_id) params.append('assigned_worker_id', filters.assigned_worker_id);

  const res = await fetch(`${API_BASE}/structures?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch structures');
  return res.json();
}

export async function getStructureDetails(id) {
  const res = await fetch(`${API_BASE}/structures/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch structure ${id}`);
  return res.json();
}

export async function getStructureSatellite(id) {
  const res = await fetch(`${API_BASE}/satellite/structure/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch satellite telemetry for ${id}`);
  return res.json();
}

export async function getAnalyticsComparison() {
  const res = await fetch(`${API_BASE}/analytics/comparison`);
  if (!res.ok) throw new Error('Failed to fetch analytics comparison');
  return res.json();
}

export async function uploadStructureFile(file) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/structures/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
    throw new Error(err.detail || 'Upload failed');
  }
  return res.json();
}

export async function reanalyzeStructure(id) {
  const res = await fetch(`${API_BASE}/structures/${id}/reanalyze`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error('Reanalysis failed');
  return res.json();
}

export async function submitFieldInspection(data) {
  const res = await fetch(`${API_BASE}/inspections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to submit inspection');
  return res.json();
}

export async function syncBatchInspections(inspections) {
  const res = await fetch(`${API_BASE}/inspections/sync-batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ inspections }),
  });
  if (!res.ok) throw new Error('Batch sync failed');
  return res.json();
}
