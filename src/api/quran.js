import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { bigGetItem, bigSetItem, bigGetAllKeys, bigRemoveItem } from './bigStore';

// EQuran v2 - Surah & Tafsir
const EQURAN_V2_BASE = 'https://equran.id/api/v2';

// Simple cache helpers
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 hari
const cacheKey = (name, params = '') => `cache:quran:${name}${params ? ':' + params : ''}`;
async function readCache(key, allowStale = false) {
  try {
    // Payload cache bisa sangat besar (detail surah, tafsir) -> disimpan via bigStore
    // (file system) agar tidak membanjiri SQLite AsyncStorage (SQLITE_FULL).
    const raw = await bigGetItem(key);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (!obj || typeof obj.ts !== 'number') return null;
    const expired = Date.now() - obj.ts > CACHE_TTL_MS;
    if (expired && !allowStale) return null;
    const payload = obj.payload;
    if (payload && typeof payload === 'object') {
      try { payload.__fromCache = true; } catch {}
    }
    return payload;
  } catch {
    return null;
  }
}
async function writeCache(key, payload) {
  try {
    const obj = { ts: Date.now(), payload };
    await bigSetItem(key, JSON.stringify(obj));
  } catch {}
}

/** Cek apakah device saat ini memiliki koneksi internet. */
export async function isOnline() {
  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 4000);
    const res = await fetch('https://equran.id', { signal: ctrl.signal, method: 'HEAD' });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
}

export async function getSurahList() {
  const key = cacheKey('surah_list');
  try {
    const { data } = await axios.get(`${EQURAN_V2_BASE}/surat`);
    const out = Array.isArray(data?.data) ? data.data : data;
    if (out && typeof out === 'object') {
      try { out.__fromCache = false; } catch {}
    }
    await writeCache(key, out);
    return out;
  } catch (e) {
    const cached = await readCache(key, true);
    if (cached) return cached;
    throw e;
  }
}

export async function getSurahDetail(nomor) {
  const key = cacheKey('surah_detail', String(nomor));
  try {
    const { data } = await axios.get(`${EQURAN_V2_BASE}/surat/${encodeURIComponent(nomor)}`);
    const out = data?.data ?? data;
    if (out && typeof out === 'object') {
      try { out.__fromCache = false; } catch {}
    }
    await writeCache(key, out);
    return out;
  } catch (e) {
    const cached = await readCache(key, true);
    if (cached) return cached;
    throw e;
  }
}

export async function getTafsir(nomor) {
  const key = cacheKey('tafsir', String(nomor));
  try {
    const { data } = await axios.get(`${EQURAN_V2_BASE}/tafsir/${encodeURIComponent(nomor)}`);
    const out = data?.data ?? data;
    if (out && typeof out === 'object') {
      try { out.__fromCache = false; } catch {}
    }
    await writeCache(key, out);
    return out;
  } catch (e) {
    const cached = await readCache(key, true);
    if (cached) return cached;
    throw e;
  }
}

// Kunci manifest offline: daftar surah yang sudah lengkap ter-cache (detail+tafsir)
const OFFLINE_MANIFEST_KEY = 'cache:quran:offline_manifest';

async function readOfflineManifest() {
  try {
    const raw = await bigGetItem(OFFLINE_MANIFEST_KEY);
    const obj = raw ? JSON.parse(raw) : null;
    return obj && typeof obj === 'object' ? obj : {};
  } catch {
    return {};
  }
}

async function writeOfflineManifest(obj) {
  try {
    await bigSetItem(OFFLINE_MANIFEST_KEY, JSON.stringify(obj));
  } catch {}
}

/** Jumlah surah yang sudah lengkap tersimpan untuk offline (detail+tafsir). */
export async function getOfflineReadyCount() {
  try {
    const manifest = await readOfflineManifest();
    const ready = Object.keys(manifest).filter((k) => manifest[k] === true).length;
    // Validasi cepat: pastikan daftar surah juga ada
    if (ready > 0) {
      const listOk = !!(await readCache(cacheKey('surah_list'), true));
      return listOk ? ready : 0;
    }
    return 0;
  } catch {
    return 0;
  }
}

/**
 * Bulk-cache semua daftar surah + detail 114 surah + tafsir (persiapan offline).
 * onProgress(done, total) dipanggil setiap satu surah selesai.
 */
export async function preloadAllSurahData(onProgress) {
  try {
    const list = await getSurahList();
    const surahs = Array.isArray(list) ? list : [];
    const total = surahs.length;
    const manifest = await readOfflineManifest();
    let done = 0;
    for (const s of surahs) {
      const nomor = s.nomor || s.number || s.id;
      if (nomor != null) {
        let ok = true;
        try { await getSurahDetail(nomor); } catch { ok = false; }
        try { await getTafsir(nomor); } catch { ok = false; }
        manifest[String(nomor)] = ok;
        // Simpan manifest tiap 10 surah agar tidak hilang jika dibatalkan
        if (done % 10 === 0) await writeOfflineManifest(manifest);
      }
      done += 1;
      if (typeof onProgress === 'function') {
        try { onProgress(done, total); } catch {}
      }
    }
    await writeOfflineManifest(manifest);
    return true;
  } catch {
    return false;
  }
}

/** Periksa apakah data surah tertentu sudah tersedia di cache lokal (bisa dibuka tanpa internet). */
export async function isSurahDataAvailableOffline(nomor) {
  const detailKey = cacheKey('surah_detail', String(nomor));
  const tafsirKey = cacheKey('tafsir', String(nomor));
  const [detail, tafsir] = await Promise.all([
    readCache(detailKey, true),
    readCache(tafsirKey, true),
  ]);
  return !!(detail && tafsir);
}

/** Hapus seluruh cache Quran (untuk reset / fresh download). */
export async function clearQuranCache() {
  try {
    const keys = await bigGetAllKeys('cache:quran:');
    for (const k of keys) {
      await bigRemoveItem(k);
    }
    // Juga hapus cache reciter karaoke
    await AsyncStorage.removeItem('quran_karaoke_reciters');
    await AsyncStorage.removeItem('karaoke_reciter_id');
  } catch {}
}

// Alias kompatibilitas: "Surat" -> fungsi "Surah"
export async function getSuratList() { return getSurahList(); }
export async function getSuratDetail(nomor) { return getSurahDetail(nomor); }