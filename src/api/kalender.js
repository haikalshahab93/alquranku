import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// MyQuran v2 base
const MYQURAN_V2_BASE = 'https://api.myquran.com/v2';
// Gunakan proxy yang umumnya sudah menyertakan ACAO sebagai primary
const CORS_PROXY_PRIMARY = 'https://api.allorigins.win/raw?url=';
const CORS_PROXY_FALLBACKS = [
  'https://corsproxy.io/?',
  'https://api.codetabs.com/v1/proxy?quest='
  // 'https://cors.isomorphic-git.org/' // opsional, taruh paling akhir jika ingin dicoba juga
];

function buildProxyUrl(pxy, url) {
  if (pxy.endsWith('?') || pxy.endsWith('url=') || pxy.endsWith('quest=')) return pxy + encodeURIComponent(url);
  return pxy + url;
}

async function getJSON(url) {
  try {
    const { data } = await axios.get(url, { headers: { Accept: 'application/json' }, timeout: 15000 });
    if (data && data.status === false) {
      throw new Error(data?.message || 'API error');
    }
    return data;
  } catch (e) {
    const isWeb = Platform?.OS === 'web' || typeof window !== 'undefined';
    const networkErr = e?.message?.toLowerCase?.().includes('network error') || e?.code === 'ECONNABORTED' || !e?.response;
    const maybeCors = isWeb && networkErr;
    if (maybeCors) {
      const proxies = [CORS_PROXY_PRIMARY, ...CORS_PROXY_FALLBACKS];
      for (const pxy of proxies) {
        try {
          const proxied = buildProxyUrl(pxy, url);
          const res = await fetch(proxied, { headers: { Accept: 'application/json' } });
          if (!res.ok) throw new Error('Proxy fetch failed: ' + res.status);
          const ct = (res.headers.get('content-type') || '').toLowerCase();
          if (ct.includes('application/json')) {
            const data = await res.json();
            if (data && data.status === false) throw new Error(data?.message || 'API error');
            return data;
          } else {
            const text = await res.text();
            const data = JSON.parse(text);
            if (data && data.status === false) throw new Error(data?.message || 'API error');
            return data;
          }
        } catch (e2) {
          // lanjut coba proxy berikutnya
        }
      }
    }
    throw e;
  }
}

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 hari
const cacheKey = (name, params = '') => `cache:kalender:${name}${params ? ':' + params : ''}`;
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

// Ambil kalender Hijriah bulanan dari API MyQuran
// Catatan: Struktur respons bervariasi per API; fungsi normalize akan mencoba mengekstrak array hari.
function normalizeArray(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  const candidates = [];
  const keys = ['data', 'result', 'list', 'hasil', 'kalender', 'calendar'];
  for (const k of keys) {
    const v = payload?.[k];
    if (Array.isArray(v)) return v;
    if (v && typeof v === 'object') candidates.push(v);
  }
  // Objek dengan key numerik -> array terurut
  for (const obj of candidates) {
    const numKeys = Object.keys(obj).filter((x) => /^\d+$/.test(String(x))).sort((a,b) => Number(a)-Number(b));
    if (numKeys.length) return numKeys.map((k) => obj[k]);
  }
  // fallback: ambil array pertama yang ditemukan secara mendalam
  const deepFindArray = (o, depth = 0) => {
    if (!o || depth > 4) return null;
    if (Array.isArray(o)) return o;
    if (typeof o === 'object') {
      for (const v of Object.values(o)) {
        const found = deepFindArray(v, depth + 1);
        if (found) return found;
      }
    }
    return null;
  };
  const arr = deepFindArray(payload);
  return Array.isArray(arr) ? arr : [];
}

export async function getHijriMonthly(year, month) {
  const ym = `${year}-${month}`;
  const key = cacheKey('hijri_month', ym);
  try {
    const data = await getJSON(`${MYQURAN_V2_BASE}/kalender/hijriah/${encodeURIComponent(year)}/${encodeURIComponent(month)}`);
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

// Opsional: Konversi tanggal Masehi -> Hijriah (jika tersedia di API)
export async function masehiToHijri(year, month, day) {
  const ymd = `${year}-${month}-${day}`;
  const key = cacheKey('masehi2hijri', ymd);
  try {
    const data = await getJSON(`${MYQURAN_V2_BASE}/kalender/masehi2hijriah/${encodeURIComponent(year)}/${encodeURIComponent(month)}/${encodeURIComponent(day)}`);
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

// Helper untuk memetakan array bulan ke indeks hari (1-based)
export function mapMonthlyToDay(items, expectedLength) {
  const arr = normalizeArray(items);
  const len = Array.isArray(arr) ? arr.length : 0;
  const map = {};
  if (!len) return map;
  const useLen = expectedLength || len;
  for (let i = 1; i <= useLen; i++) {
    map[i] = arr[i-1] || null;
  }
  return map;
}