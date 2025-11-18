import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// EQuran v2 - Surah & Tafsir
const EQURAN_V2_BASE = 'https://equran.id/api/v2';

// Simple cache helpers
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 hari
const cacheKey = (name, params = '') => `cache:quran:${name}${params ? ':' + params : ''}`;
async function readCache(key, allowStale = false) {
  try {
    const raw = await AsyncStorage.getItem(key);
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
    await AsyncStorage.setItem(key, JSON.stringify(obj));
  } catch {}
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

// Alias kompatibilitas: "Surat" -> fungsi "Surah"
export async function getSuratList() { return getSurahList(); }
export async function getSuratDetail(nomor) { return getSurahDetail(nomor); }