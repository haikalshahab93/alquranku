import axios from 'axios';

/**
 * Centralized API configuration for maintainability.
 * Update base URLs or timeout here if the provider changes in future.
 */
const CONFIG = {
  TIMEOUT: 15000,
  BASE_URL_V2: 'https://equran.id/api/v2', // Surah & Tafsir v2 endpoints
  BASE_URL_ROOT: 'https://equran.id',      // Root for other endpoints (e.g., /api/doa)
};

/** Axios instances */
const equranV2 = axios.create({ baseURL: CONFIG.BASE_URL_V2, timeout: CONFIG.TIMEOUT });
const equranRoot = axios.create({ baseURL: CONFIG.BASE_URL_ROOT, timeout: CONFIG.TIMEOUT });

/**
 * Normalize successful response structures.
 * - V2 APIs generally wrap payload as { code, message, data }
 * - Other APIs (like doa) use { status, data } or return raw arrays/objects
 */
const unwrapV2 = (res) => (res?.data?.data ?? res?.data);
const unwrapDoa = (res) => (res?.data?.data ?? res?.data);

/**
 * Safe GET wrapper to standardize error handling.
 * You can extend this with retry, logging, or interceptors later.
 */
async function safeGet(client, url, options = {}) {
  try {
    const res = await client.get(url, options);
    return res;
  } catch (err) {
    const message = err?.response?.data?.message || err?.message || 'Network error';
    const code = err?.response?.status;
    const e = new Error(message);
    if (code) e.code = code;
    throw e;
  }
}

/**
 * Surah APIs (v2)
 */
export async function getSuratList() {
  const res = await safeGet(equranV2, '/surat');
  return unwrapV2(res);
}

export async function getSuratDetail(nomor) {
  const res = await safeGet(equranV2, `/surat/${nomor}`);
  return unwrapV2(res);
}

export async function getTafsir(nomor) {
  const res = await safeGet(equranV2, `/tafsir/${nomor}`);
  return unwrapV2(res);
}

/**
 * Doa APIs (root)
 * List supports params: { grup?: string, tag?: string }
 */
export async function getDoaList(params = {}) {
  const res = await safeGet(equranRoot, '/api/doa', { params });
  return unwrapDoa(res);
}

export async function getDoaDetail(id) {
  const res = await safeGet(equranRoot, `/api/doa/${id}`);
  return unwrapDoa(res);
}

/**
 * Default export to keep backwards compatibility with existing imports.
 */
export default {
  getSuratList,
  getSuratDetail,
  getTafsir,
  getDoaList,
  getDoaDetail,
};