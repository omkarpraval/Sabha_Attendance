// IndexedDB Offline Attendance Scan Queue

const DB_NAME = 'sabha_offline_db';
const DB_VERSION = 1;
const STORE_NAME = 'offline_scans';

function openDB() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

export async function saveOfflineScan(scanPayload) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const record = {
      ...scanPayload,
      timestamp: new Date().toISOString()
    };
    store.add(record);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(true);
      tx.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.error('Failed to save scan to offline IndexedDB store:', err);
    return false;
  }
}

export async function getOfflineScans() {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    return [];
  }
}

export async function clearOfflineScans() {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.clear();
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(true);
      tx.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    return false;
  }
}

export async function syncOfflineScans(apiFetch, showToast) {
  if (!navigator.onLine) return;
  const scans = await getOfflineScans();
  if (!scans || scans.length === 0) return;

  let syncedCount = 0;
  for (const scan of scans) {
    try {
      await apiFetch('/attendance/scan', {
        method: 'POST',
        body: JSON.stringify({
          qr_code_reference: scan.qr_code_reference,
          latitude: scan.latitude,
          longitude: scan.longitude
        })
      });
      syncedCount++;
    } catch (err) {
      console.warn('Failed to sync offline scan item:', scan, err);
    }
  }

  await clearOfflineScans();
  if (syncedCount > 0 && showToast) {
    showToast(`Synced ${syncedCount} offline attendance scan(s) to server!`);
  }
}
