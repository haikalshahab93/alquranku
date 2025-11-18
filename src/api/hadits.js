import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Hadits API via myQuran v2
const MYQURAN_V2_BASE = 'https://api.myquran.com/v2';

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
    return obj.payload;
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
    const { data } = await axios.get(`${MYQURAN_V2_BASE}/hadits/arbain/all`);
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
    const { data } = await axios.get(`${MYQURAN_V2_BASE}/hadits/arbain/${encodeURIComponent(nomor)}`);
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
  const { data } = await axios.get(`${MYQURAN_V2_BASE}/hadits/arbain/random`);
  return data;
}

export async function getHaditsBmNomor(nomor) {
  const key = cacheKey('bm_num', String(nomor));
  try {
    const { data } = await axios.get(`${MYQURAN_V2_BASE}/hadits/bm/${encodeURIComponent(nomor)}`);
    await writeCache(key, data);
    return data;
  } catch (e) {
    const cached = await readCache(key, true);
    if (cached) return cached;
    throw e;
  }
}

export async function getHaditsBmAcak() {
  const { data } = await axios.get(`${MYQURAN_V2_BASE}/hadits/bm/random`);
  return data;
}

export async function getHaditsPerawiList() {
  const key = cacheKey('perawi_list');
  try {
    const { data } = await axios.get(`${MYQURAN_V2_BASE}/hadits/perawi`);
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
    const { data } = await axios.get(`${MYQURAN_V2_BASE}/hadits/${encodeURIComponent(slug)}/${encodeURIComponent(nomor)}`);
    await writeCache(key, data);
    return data;
  } catch (e) {
    const cached = await readCache(key, true);
    if (cached) return cached;
    throw e;
  }
}

export async function getHaditsPerawiAcak() {
  const { data } = await axios.get(`${MYQURAN_V2_BASE}/hadits/perawi/random`);
  return data;
}