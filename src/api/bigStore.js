// Penyimpanan data BESAR berbasis file (bukan AsyncStorage).
//
// Kenapa: AsyncStorage di Android disimpan di SQLite yang cepat penuh ketika
// menyimpan payload besar (verse_timings karaoke, tafsir, cache detail surah),
// memunculkan error "database or disk full (code 13 SQLITE_FULL)".
// File di documentDirectory tidak punya batas itu.
//
// API mengikuti AsyncStorage supaya tinggal ditukar: getItem/setItem/removeItem/getAllKeys.
// Di web (tidak ada file system), pakai IndexedDB (kuota ratusan MB) — localStorage
// hanya kuota ±5 MB dan berbagi dengan semua key lain, sehingga cache besar membuat
// penulisan key kecil mana pun (mis. last_read) gagal "QuotaExceededError".
// localStorage hanya fallback terakhir bila IndexedDB tidak tersedia.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { tNow } from './i18n';

const BASE_DIR = `${FileSystem.documentDirectory}bigstore`;
const LS_PREFIX = 'bigstore:'; // fallback web terakhir (hanya bila IndexedDB tak tersedia)
// Prefix AsyncStorage yang berisi payload besar -> dimigrasikan ke file sekali saja
const MIGRATE_PREFIXES = ['cache:quran:', 'cache:hadits:', 'cache:doa:', 'cache:kalender:', 'offline_audio_meta_'];
const MIGRATED_FLAG = 'bigstore:migrated_v1';
// Flag migrasi web-IndexedDB: pindahkan entri 'bigstore:*' dari localStorage ke IndexedDB
const MIGRATED_IDB_FLAG = 'bigstore:migrated_v2_idb';

const useFiles = Platform.OS !== 'web' && !!FileSystem.documentDirectory;

// ---------------- IndexedDB (web) ----------------
const IDB_NAME = 'bigstore';
const IDB_STORE = 'kv';

const idbAvailable = () =>
  Platform.OS === 'web' && typeof indexedDB !== 'undefined' && indexedDB !== null;

let idbOpenPromise = null;
function idbOpen() {
  if (!idbOpenPromise) {
    idbOpenPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(IDB_STORE)) req.result.createObjectStore(IDB_STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      req.onblocked = () => reject(new Error('indexedDB blocked'));
    });
    idbOpenPromise.catch(() => { idbOpenPromise = null; });
  }
  return idbOpenPromise;
}

const reqToPromise = (req) => new Promise((resolve, reject) => {
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
  req.onabort = () => reject(req.error || new Error('tx aborted'));
});

async function idbGet(key) {
  const db = await idbOpen();
  const tx = db.transaction(IDB_STORE, 'readonly');
  return reqToPromise(tx.objectStore(IDB_STORE).get(String(key)));
}

async function idbSet(key, value) {
  const db = await idbOpen();
  const tx = db.transaction(IDB_STORE, 'readwrite');
  return reqToPromise(tx.objectStore(IDB_STORE).put(String(value), String(key)));
}

async function idbRemove(key) {
  const db = await idbOpen();
  const tx = db.transaction(IDB_STORE, 'readwrite');
  return reqToPromise(tx.objectStore(IDB_STORE).delete(String(key)));
}

async function idbKeys() {
  const db = await idbOpen();
  const tx = db.transaction(IDB_STORE, 'readonly');
  return reqToPromise(tx.objectStore(IDB_STORE).getAllKeys());
}

// `:` pada key diganti aman untuk nama file lintas platform
const fileSafe = (key) => String(key).replace(/[^a-zA-Z0-9._-]/g, '__');

let migratePromise = null;
function ensureMigrated() {
  if (!migratePromise) {
    migratePromise = (async () => {
      try {
        // --- Web v2: pindahkan entri 'bigstore:*' dari localStorage ke IndexedDB ---
        // localStorage kuotanya ±5 MB dan berbagi dengan semua key lain; entri besar
        // di sana yang dulu membuat setItem kecil (last_read) gagal QuotaExceededError.
        if (idbAvailable()) {
          if (!(await AsyncStorage.getItem(MIGRATED_IDB_FLAG))) {
            try {
              const legacy = Object.keys(localStorage).filter((k) => k.startsWith(LS_PREFIX));
              for (const k of legacy) {
                const v = localStorage.getItem(k);
                if (v != null) {
                  try { await idbSet(k.slice(LS_PREFIX.length), v); } catch { continue; }
                  try { localStorage.removeItem(k); } catch {}
                }
              }
              await AsyncStorage.setItem(MIGRATED_IDB_FLAG, '1');
            } catch {}
          }
        }
        if (await AsyncStorage.getItem(MIGRATED_FLAG)) return;
        if (!useFiles) {
          // Web: pindahkan dari AsyncStorage ke bigstore (IndexedDB utama)
          for (const prefix of MIGRATE_PREFIXES) {
            const keys = await AsyncStorage.getAllKeys();
            const targets = keys.filter((k) => k.startsWith(prefix));
            for (const k of targets) {
              const v = await AsyncStorage.getItem(k);
              if (v == null) continue;
              try {
                if (idbAvailable()) await idbSet(k, v);
                else localStorage.setItem(LS_PREFIX + k, v);
                await AsyncStorage.removeItem(k);
              } catch {}
            }
          }
        } else {
          await FileSystem.makeDirectoryAsync(BASE_DIR, { intermediates: true }).catch(() => {});
          for (const prefix of MIGRATE_PREFIXES) {
            const keys = await AsyncStorage.getAllKeys();
            const targets = keys.filter((k) => k.startsWith(prefix));
            for (const k of targets) {
              const v = await AsyncStorage.getItem(k);
              if (v == null) continue;
              const file = `${BASE_DIR}/${fileSafe(k)}.json`;
              try {
                await FileSystem.writeAsStringAsync(file, v, { encoding: FileSystem.EncodingType.UTF8 });
                await AsyncStorage.removeItem(k);
              } catch {}
            }
          }
        }
        await AsyncStorage.setItem(MIGRATED_FLAG, '1');
      } catch {
        // Gagal migrasi tidak fatal: fallback lama tetap dibaca oleh getter
        migratePromise = null;
      }
    })();
  }
  return migratePromise;
}

/** Baca nilai string besar. Return null jika tidak ada. */
export async function bigGetItem(key) {
  await ensureMigrated();
  if (!useFiles) {
    if (idbAvailable()) {
      try {
        const v = await idbGet(key);
        if (v != null) return v;
      } catch {}
      try { return localStorage.getItem(LS_PREFIX + key); } catch { return null; }
    }
    try { return localStorage.getItem(LS_PREFIX + key); } catch { return null; }
  }
  try {
    const file = `${BASE_DIR}/${fileSafe(key)}.json`;
    const info = await FileSystem.getInfoAsync(file);
    if (!info.exists) {
      // Fallback: mungkin masih di AsyncStorage (migrasi tertunda/gagal)
      return await AsyncStorage.getItem(key);
    }
    return await FileSystem.readAsStringAsync(file, { encoding: FileSystem.EncodingType.UTF8 });
  } catch {
    return null;
  }
}

/** Tulis nilai string besar. Throw bila penyimpanan penuh (pesan ramah). */
export async function bigSetItem(key, value) {
  await ensureMigrated();
  if (!useFiles) {
    if (idbAvailable()) {
      try {
        await idbSet(key, String(value));
        return;
      } catch (e) {
        // IndexedDB gagal (mode privat/dll) -> coba localStorage masih bisa untuk data kecil
        try { localStorage.setItem(LS_PREFIX + key, String(value)); return; } catch {}
        throw new Error(tNow('store.fullWeb'));
      }
    }
    try { localStorage.setItem(LS_PREFIX + key, String(value)); } catch (e) {
      throw new Error(tNow('store.fullWeb'));
    }
    return;
  }
  try {
    await FileSystem.makeDirectoryAsync(BASE_DIR, { intermediates: true }).catch(() => {});
    const file = `${BASE_DIR}/${fileSafe(key)}.json`;
    await FileSystem.writeAsStringAsync(file, String(value), { encoding: FileSystem.EncodingType.UTF8 });
    // Bersihkan sisa lama di AsyncStorage jika ada (migrasi berjalan bertahap)
    AsyncStorage.getItem(key).then((old) => { if (old != null) AsyncStorage.removeItem(key); }).catch(() => {});
  } catch (e) {
    const msg = String(e?.message || e || '');
    if (/no space|ENOSPC|disk full|1004/i.test(msg)) {
      throw new Error(tNow('store.fullDisk'));
    }
    throw e;
  }
}

/** Hapus satu entri. */
export async function bigRemoveItem(key) {
  await ensureMigrated();
  if (!useFiles) {
    if (idbAvailable()) { try { await idbRemove(key); } catch {} }
    try { localStorage.removeItem(LS_PREFIX + key); } catch {}
    return;
  }
  try {
    await FileSystem.deleteAsync(`${BASE_DIR}/${fileSafe(key)}.json`, { idempotent: true });
  } catch {}
  try { await AsyncStorage.removeItem(key); } catch {}
}

/** Daftar key dengan prefix tertentu. */
export async function bigGetAllKeys(prefix = '') {
  await ensureMigrated();
  if (!useFiles) {
    let keys = [];
    if (idbAvailable()) {
      try { keys = await idbKeys(); } catch { keys = []; }
    }
    try {
      keys = keys.concat(Object.keys(localStorage).filter((k) => k.startsWith(LS_PREFIX)).map((k) => k.slice(LS_PREFIX.length)));
    } catch {}
    const seen = new Set();
    return keys.filter((k) => { if (k.startsWith(prefix) && !seen.has(k)) { seen.add(k); return true; } return false; });
  }
  try {
    const names = await FileSystem.readDirectoryAsync(BASE_DIR);
    return names
      .filter((n) => n.endsWith('.json'))
      .map((n) => n.slice(0, -5))
      // Kembalikan nama asli: fileSafe mengganti karakter khusus dengan __
      .map((n) => n.replace(/__/g, ':'))
      .filter((n) => n.startsWith(prefix));
  } catch {
    return [];
  }
}

/** Statistik penyimpanan: jumlah entri + total byte untuk prefix tertentu. */
export async function bigStats(prefix = '') {
  await ensureMigrated();
  if (!useFiles) {
    let count = 0, bytes = 0;
    if (idbAvailable()) {
      try {
        const keys = await idbKeys();
        for (const k of keys) {
          if (!prefix || String(k).startsWith(prefix)) {
            try {
              const v = await idbGet(k);
              bytes += (v ? String(v).length : 0);
              count++;
            } catch {}
          }
        }
      } catch {}
    }
    try {
      for (const k of Object.keys(localStorage)) {
        if (String(k).startsWith(LS_PREFIX) && (!prefix || k.slice(LS_PREFIX.length).startsWith(prefix))) {
          bytes += (localStorage.getItem(k) || '').length;
          count++;
        }
      }
    } catch {}
    return { count, totalBytes: bytes };
  }
  try {
    const names = await FileSystem.readDirectoryAsync(BASE_DIR);
    for (const n of names) {
      if (!n.endsWith('.json')) continue;
      const key = n.slice(0, -5).replace(/__/g, ':');
      if (prefix && !key.startsWith(prefix)) continue;
      try {
        const info = await FileSystem.getInfoAsync(`${BASE_DIR}/${n}`);
        if (info.exists) { bytes += info.size || 0; count++; }
      } catch {}
    }
    return { count, totalBytes: bytes };
  } catch {
    return { count: 0, totalBytes: 0 };
  }
}
