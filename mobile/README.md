# JalSakshya Field Worker Mobile App (Offline-First)

Designed for low-end Android smartphones operating in remote villages with intermittent or zero cellular connectivity.

## Architecture

1. **Local Offline Storage (SQLite)**:
   - `cached_structures`: Local cache of structures assigned to the field worker, complete with GPS coordinates, administrative hierarchy, and Sentinel-2 dry season priority flags.
   - `offline_inspections`: Inspection queue storing ground truth assessments, water depth, bund condition, local photo file paths, and GPS coordinates recorded at the time of visit.
2. **Auto-Sync Engine (`sync_manager.dart`)**:
   - Subscribes to `connectivity_plus` stream. When cellular or Wi-Fi connectivity is detected, automatically triggers `syncPendingData()`.
   - Sends batch payload to FastAPI backend endpoint `/api/v1/inspections/sync-batch`.
   - Marks local records as `is_synced = 1`.
3. **PWA Mobile Simulator Included**:
   - The React/Vite dashboard also provides a browser-based **Field Worker Mobile Mode** with full offline IndexedDB/LocalStorage replication, allowing immediate testing of offline inspections on any device.

## How to Run & Build

```bash
cd mobile
flutter pub get
flutter run
```

To build a release APK for deployment to field workers:
```bash
flutter build apk --release
```
