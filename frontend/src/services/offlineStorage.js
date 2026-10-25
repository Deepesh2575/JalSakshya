const OFFLINE_QUEUE_KEY = 'jalsakshya_offline_inspections_queue';
const CACHED_STRUCTURES_KEY = 'jalsakshya_cached_structures';
const OFFLINE_SIMULATION_KEY = 'jalsakshya_simulate_offline';

export function isOfflineSimulationActive() {
  return localStorage.getItem(OFFLINE_SIMULATION_KEY) === 'true';
}

export function setOfflineSimulation(active) {
  localStorage.setItem(OFFLINE_SIMULATION_KEY, active ? 'true' : 'false');
}

export function getOfflineInspections() {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function saveInspectionOffline(inspection) {
  const queue = getOfflineInspections();
  const id = inspection.id || `offline_insp_${Date.now()}`;
  const record = {
    ...inspection,
    id,
    recorded_at_client: new Date().toISOString(),
    is_offline_synced: true,
  };
  queue.push(record);
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  return record;
}

export function clearSyncedInspections(syncedIds) {
  const queue = getOfflineInspections();
  const remaining = queue.filter(item => !syncedIds.includes(item.id));
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remaining));
  return remaining.length;
}

export function cacheAssignedStructures(structures) {
  localStorage.setItem(CACHED_STRUCTURES_KEY, JSON.stringify(structures));
}

export function getCachedAssignedStructures() {
  try {
    const raw = localStorage.getItem(CACHED_STRUCTURES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}
