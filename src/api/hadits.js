import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Hadits API via myQuran v2
const MYQURAN_V2_BASE = 'https://api.myquran.com/v2';
const CORS_PROXY = 'https://cors.isomorphic-git.org/';

async function getJSON(url) {
  try {
    const { data } = await axios.get(url);
    if (data && data.status === false) {
      throw new Error(data?.message || 'API error');
    }
    return data;
  } catch (e) {
    const isWeb = Platform?.OS === 'web' || typeof window !== 'undefined';
    const maybeCors = isWeb && (!e?.response || e?.message?.toLowerCase?.().includes('network error'));
    if (maybeCors) {
      try {
        const res = await fetch(CORS_PROXY + url);
        if (!res.ok) throw new Error('Proxy fetch failed: ' + res.status);
        const data = await res.json();
        if (data && data.status === false) {
          throw new Error(data?.message || 'API error');
        }
        return data;
      } catch (e2) {
        // Fall back to original error
        throw e;
      }
    }
    throw e;
  }
}

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 hari
const cacheKey = (name, params = '') => `cache:hadits:${name}${params ? ':' + params : ''}`;
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

export async function getHaditsArbainSemua() {
  const key = cacheKey('arbain_all');
  try {
    const data = await getJSON(`${MYQURAN_V2_BASE}/hadits/arbain`);
    if (data && typeof data === 'object') {
      try { data.__fromCache = false; } catch {}
    }
    await writeCache(key, data);
    return data;
  } catch (e) {
    const cached = await readCache(key, true);
    if (cached) return cached;
    throw e;
  }
}

export async function getHaditsArbainNomor(nomor) {
  const key = cacheKey('arbain_num', String(nomor));
  try {
    const data = await getJSON(`${MYQURAN_V2_BASE}/hadits/arbain/${encodeURIComponent(nomor)}`);
    if (data && typeof data === 'object') {
      try { data.__fromCache = false; } catch {}
    }
    await writeCache(key, data);
    return data;
  } catch (e) {
    const cached = await readCache(key, true);
    if (cached) return cached;
    throw e;
  }
}

export async function getHaditsArbainAcak() {
  // Random tidak cocok disimpan sebagai deterministik; tidak di-cache.
  const data = await getJSON(`${MYQURAN_V2_BASE}/hadits/arbain/random`);
  return data;
}

export async function getHaditsBmNomor(nomor) {
  const key = cacheKey('bm_num', String(nomor));
  try {
    const data = await getJSON(`${MYQURAN_V2_BASE}/hadits/bm/${encodeURIComponent(nomor)}`);
    if (data && typeof data === 'object') {
      try { data.__fromCache = false; } catch {}
    }
    await writeCache(key, data);
    return data;
  } catch (e) {
    const cached = await readCache(key, true);
    if (cached) return cached;
    throw e;
  }
}

export async function getHaditsBmAcak() {
  const data = await getJSON(`${MYQURAN_V2_BASE}/hadits/bm/random`);
  return data;
}

export async function getHaditsPerawiList() {
  const key = cacheKey('perawi_list');
  try {
    const data = await getJSON(`${MYQURAN_V2_BASE}/hadits/perawi`);
    if (data && typeof data === 'object') {
      try { data.__fromCache = false; } catch {}
    }
    await writeCache(key, data);
    return data;
  } catch (e) {
    const cached = await readCache(key, true);
    if (cached) return cached;
    throw e;
  }
}

export async function getHaditsPerawiNomor(slug, nomor) {
  const key = cacheKey('perawi_num', `${slug}:${nomor}`);
  try {
    const data = await getJSON(`${MYQURAN_V2_BASE}/hadits/${encodeURIComponent(slug)}/${encodeURIComponent(nomor)}`);
    if (data && typeof data === 'object') {
      try { data.__fromCache = false; } catch {}
    }
    await writeCache(key, data);
    return data;
  } catch (e) {
    const cached = await readCache(key, true);
    if (cached) return cached;
    throw e;
  }
}

export async function getHaditsPerawiAcak() {
  try {
    const data = await getJSON(`${MYQURAN_V2_BASE}/hadits/perawi/random`);
    return data;
  } catch (e) {
    // Fallback ke "/acak" jika "/random" tidak tersedia
    const data2 = await getJSON(`${MYQURAN_V2_BASE}/hadits/perawi/acak`);
    return data2;
  }
}