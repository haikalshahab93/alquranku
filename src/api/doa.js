import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { bigGetItem, bigSetItem } from './bigStore';

// Doa API from EQuran
const DOA_BASE = 'https://equran.id/api/doa';

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 hari
const cacheKey = (name, params = '') => `cache:doa:${name}${params ? ':' + params : ''}`;
async function readCache(key, allowStale = false) {
  try {
    // Cache daftar doa -> bigStore (file), bukan AsyncStorage (SQLITE_FULL risk)
    const raw = await bigGetItem(key);
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
    await bigSetItem(key, JSON.stringify(obj));
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

// Favorit & Terakhir Dibaca (AsyncStorage)
const FAVORITES_KEY = 'doa:favorites';
const LAST_READ_KEY = 'doa:lastRead';

export async function getDoaFavorites() {
  try {
    const raw = await AsyncStorage.getItem(FAVORITES_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export async function toggleDoaFavorite(id) {
  const iid = parseInt(id, 10);
  if (Number.isNaN(iid)) return false;
  try {
    const current = await getDoaFavorites();
    const set = new Set(current);
    let isFav;
    if (set.has(iid)) {
      set.delete(iid);
      isFav = false;
    } else {
      set.add(iid);
      isFav = true;
    }
    const next = Array.from(set);
    await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
    return isFav;
  } catch {
    return false;
  }
}

export async function isDoaFavorite(id) {
  const iid = parseInt(id, 10);
  if (Number.isNaN(iid)) return false;
  const favs = await getDoaFavorites();
  return favs.includes(iid);
}

export async function setLastReadDoa(id) {
  const iid = parseInt(id, 10);
  if (Number.isNaN(iid)) return false;
  try {
    const payload = { id: iid, ts: Date.now() };
    await AsyncStorage.setItem(LAST_READ_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

export async function getLastReadDoa() {
  try {
    const raw = await AsyncStorage.getItem(LAST_READ_KEY);
    const obj = raw ? JSON.parse(raw) : null;
    if (!obj || typeof obj.id !== 'number') return null;
    return obj; // { id, ts }
  } catch {
    return null;
  }
}