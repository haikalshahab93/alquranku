// ============================================================
// DATA KATA PER KATA (Mode Belajar) — quran.com QDC
// ============================================================
// Satu ayat dipecah menjadi kata, masing-masing dengan teks Arab, transliterasi,
// arti, dan audio pengucapan (wbw/*.mp3). Dipakai layar surat untuk belajar
// makna tiap kata, bukan sekadar membaca terjemahan per ayat.
//
// Sifat data: statis (teks Quran tidak berubah), jadi cache diutamakan.
// - Cache memori: sesi ini, per surah+bahasa.
// - Cache disk (bigStore): TTL 30 hari, agar sekali unduh bisa dipakai offline.
//   bigStore (file/IndexedDB) dipakai karena daftar kata satu surah besar.
// ============================================================

import { bigGetItem, bigSetItem } from './bigStore.js';

const QDC_BASE = 'https://api.quran.com/api/qdc';
// Audio kata memakai CDN quran.com; audio_url dari API masih relatif.
const AUDIO_BASE = 'https://audio.qurancdn.com/';
const CACHE_PREFIX = 'cache:quran:words:';
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const PER_PAGE = 50;
const FETCH_TIMEOUT_MS = 12000;

// Cache memori per `${surah}:${lang}` -> { ts, verses }
const memCache = new Map();

const cacheKey = (surah, lang) => `${CACHE_PREFIX}${surah}:${lang}`;

// fetch + batas waktu: permintaan tanpa jaringan tidak boleh menggantung.
async function fetchWithTimeout(url, timeoutMs = FETCH_TIMEOUT_MS) {
  const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => { try { ctrl.abort(); } catch {} }, timeoutMs) : null;
  try {
    return await fetch(url, ctrl ? { signal: ctrl.signal } : undefined);
  } catch (e) {
    if (e?.name === 'AbortError') throw new Error('Koneksi ke quran.com timeout');
    throw e;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function wordAudioUrl(path) {
  const s = typeof path === 'string' ? path.trim() : '';
  if (!s) return null;
  if (/^https?:\/\//i.test(s) || s.startsWith('//')) return s.startsWith('//') ? `https:${s}` : s;
  return `${AUDIO_BASE}${s.replace(/^\/+/, '')}`;
}

async function readCache(surah, lang) {
  try {
    const raw = await bigGetItem(cacheKey(surah, lang));
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (!obj || typeof obj.ts !== 'number' || !obj.verses) return null;
    if (Date.now() - obj.ts > CACHE_TTL_MS) return null;
    return obj;
  } catch {
    return null;
  }
}

async function writeCache(surah, lang, verses) {
  const obj = { ts: Date.now(), verses };
  memCache.set(`${surah}:${lang}`, obj);
  try { await bigSetItem(cacheKey(surah, lang), JSON.stringify(obj)); } catch {}
}

// Ambil semua ayat satu surah, halaman demi halaman (per_page maksimal 50).
async function fetchSurahWords(surah, lang) {
  const verses = {};
  let page = 1;
  let totalPages = 1;
  do {
    const url = `${QDC_BASE}/verses/by_chapter/${surah}?words=true`
      + `&word_fields=text_uthmani,transliteration,translation`
      + `&word_translation_language=${lang === 'en' ? 'en' : 'id'}`
      + `&per_page=${PER_PAGE}&page=${page}`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) throw new Error(`Gagal memuat kata quran.com (${res.status})`);
    const json = await res.json();
    const list = Array.isArray(json?.verses) ? json.verses : [];
    for (const v of list) {
      const words = (Array.isArray(v?.words) ? v.words : [])
        // Simbol akhir ayat / tanda waqaf bukan kata yang bisa dipelajari.
        .filter((w) => !w?.char_type_name || w.char_type_name === 'word')
        .map((w, i) => ({
          position: w.position || i + 1,
          arabic: w.text_uthmani || w.text || '',
          transliteration: w.transliteration?.text || '',
          meaning: w.translation?.text || '',
          audioUrl: wordAudioUrl(w.audio_url),
        }))
        .filter((w) => !!w.arabic);
      if (v?.verse_key && words.length) verses[v.verse_key] = words;
    }
    totalPages = json?.pagination?.total_pages || 1;
    page += 1;
  } while (page <= totalPages);

  if (!Object.keys(verses).length) throw new Error('Data kata per kata kosong');
  return verses;
}

/**
 * Kata per kata satu surah.
 * Urutan sumber: cache (memori lalu disk) dulu karena datanya statis, baru
 * jaringan; bila jaringan gagal dan tidak ada cache, error dilempar ke layar.
 * Return: { verses: { '1:1': [{ position, arabic, transliteration, meaning, audioUrl }] }, fromCache }
 */
export async function getSurahWords(surah, lang = 'id') {
  const n = Number(surah);
  const l = lang === 'en' ? 'en' : 'id';
  const key = `${n}:${l}`;

  const mem = memCache.get(key);
  if (mem && Date.now() - mem.ts <= CACHE_TTL_MS) {
    return { verses: mem.verses, fromCache: true };
  }

  const disk = await readCache(n, l);
  if (disk) {
    memCache.set(key, disk);
    return { verses: disk.verses, fromCache: true };
  }

  const verses = await fetchSurahWords(n, l);
  await writeCache(n, l, verses);
  return { verses, fromCache: false };
}

// Cache disk memakai prefix 'cache:quran:' sehingga ikut terhapus oleh
// clearQuranCache() di api/quran.js (reset cache Quran).
