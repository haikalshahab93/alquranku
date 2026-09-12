// Penyimpanan data BESAR berbasis file (bukan AsyncStorage).
//
// Kenapa: AsyncStorage di Android disimpan di SQLite yang cepat penuh ketika
// menyimpan payload besar (verse_timings karaoke, tafsir, cache detail surah),
// memunculkan error "database or disk full (code 13 SQLITE_FULL)".
// File di documentDirectory tidak punya batas itu.
//
// API mengikuti AsyncStorage supaya tinggal ditukar: getItem/setItem/removeItem/getAllKeys.
// Di web (tidak ada file system), fallback transparan ke localStorage.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

const BASE_DIR = `${FileSystem.documentDirectory}bigstore`;
const LS_PREFIX = 'bigstore:'; // fallback web
// Prefix AsyncStorage yang berisi payload besar -> dimigrasikan ke file sekali saja
const MIGRATE_PREFIXES = ['cache:quran:', 'cache:hadits:', 'cache:doa:', 'cache:kalender:', 'offline_audio_meta_'];
const MIGRATED_FLAG = 'bigstore:migrated_v1';

const useFiles = Platform.OS !== 'web' && !!FileSystem.documentDirectory;

// `:` pada key diganti aman untuk nama file lintas platform
const fileSafe = (key) => String(key).replace(/[^a-zA-Z0-9._-]/g, '__');

let migratePromise = null;
function ensureMigrated() {
  if (!migratePromise) {
    migratePromise = (async () => {
      try {
        if (await AsyncStorage.getItem(MIGRATED_FLAG)) return;
        if (!useFiles) {
          // Web: pindahkan ke namespace localStorage bigstore:
          for (const prefix of MIGRATE_PREFIXES) {
            const keys = await AsyncStorage.getAllKeys();
            const targets = keys.filter((k) => k.startsWith(prefix));
            for (const k of targets) {
              const v = await AsyncStorage.getItem(k);
              if (v != null) {
                try { localStorage.setItem(LS_PREFIX + k, v); } catch {}
                await AsyncStorage.removeItem(k);
              }
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
    try { localStorage.setItem(LS_PREFIX + key, value); } catch (e) {
      throw new Error('Penyimpanan penuh — hapus cache atau audio offline lalu coba lagi.');
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
      throw new Error('Penyimpanan HP penuh — hapus beberapa file atau audio offline lalu coba lagi.');
    }
    throw e;
  }
}

/** Hapus satu entri. */
export async function bigRemoveItem(key) {
  await ensureMigrated();
  if (!useFiles) {
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
    try {
      return Object.keys(localStorage)
        .filter((k) => k.startsWith(LS_PREFIX + prefix))
        .map((k) => k.slice(LS_PREFIX.length));
    } catch { return []; }
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
    try {
      let bytes = 0, count = 0;
      for (const k of Object.keys(localStorage)) {
        if (k.startsWith(LS_PREFIX + prefix)) {
          bytes += (localStorage.getItem(k) || '').length;
          count++;
        }
      }
      return { count, totalBytes: bytes };
    } catch { return { count: 0, totalBytes: 0 }; }
  }
  try {
    const names = await FileSystem.readDirectoryAsync(BASE_DIR);
    let bytes = 0, count = 0;
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
