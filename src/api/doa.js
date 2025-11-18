import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Doa API from EQuran
const DOA_BASE = 'https://equran.id/api/doa';

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 hari
const cacheKey = (name, params = '') => `cache:doa:${name}${params ? ':' + params : ''}`;
async function readCache(key, allowStale = false) {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return [];
    const obj = JSON.parse(raw);
    if (!obj || typeof obj.ts !== 'number') return [];
    const expired = Date.now() - obj.ts > CACHE_TTL_MS;
    if (expired && !allowStale) return [];
    const payload = obj.payload;
    if (payload && typeof payload === 'object') {
      try { payload.__fromCache = true; } catch {}
    }
    return payload;
  } catch {
    return [];
  }
}
async function writeCache(key, payload) {
  try {
    const obj = { ts: Date.now(), payload };
    await AsyncStorage.setItem(key, JSON.stringify(obj));
  } catch {}
}

export async function getDoaList({ grup, tag } = {}) {
  const params = {};
  if (grup) params.grup = grup;
  if (tag) params.tag = tag;
  const key = cacheKey('list', JSON.stringify(params));
  try {
    const { data } = await axios.get(DOA_BASE, { params });
    const out = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
    if (out && typeof out === 'object') {
      try { out.__fromCache = false; } catch {}
    }
    await writeCache(key, out);
    return out;
  } catch (e) {
    const cached = await readCache(key, true);
    if (cached.length) return cached;
    throw e;
  }
}

export async function getDoaDetail(id) {
  const iid = parseInt(id, 10);
  if (Number.isNaN(iid)) {
    return { data: null };
  }
  const key = cacheKey('detail', String(iid));
  try {
    const { data } = await axios.get(`${DOA_BASE}/${iid}`);
    const detail = data?.data ?? data;
    if (detail && typeof detail === 'object') {
      try { detail.__fromCache = false; } catch {}
    }
    await writeCache(key, detail);
    return { data: detail };
  } catch (e) {
    const cached = await readCache(key, true);
    if (cached && Object.keys(cached).length) return { data: cached };
    throw e;
  }
}