// ============================================================
// TERJEMAHAN AYAT BAHASA INGGRIS (api.quran.com)
// ============================================================
// Catatan mimbar:
//  - Sumber konten asli aplikasi (EQuran) hanya menyediakan terjemahan
//    berbahasa Indonesia. Untuk bahasa Inggris dipakai API quran.com,
//    terjemahan M.A.S. Abdel Haleem (resource #85) — teksnya bersih
//    tanpa catatan kaki HTML (Saya International masih ber-tag <sup>).
//  - Respons API dipakai apa adanya (urut ayat dalam surah), jadi elemen
//    ke-i padan dengan ayat nomor i+1.
//  - Pola cache sama dengan quran.js: 7 hari via bigStore (file), dan
//    saat offline jatuh ke cache basi ketimbang gagal total.
//  - Layar memanggil hook useSurahTranslationEn(surah, enabled); bila
//    belum termuat / gagal fetch, layar otomatis memakai terjemahan ID.
// ============================================================

import axios from 'axios';
import { useEffect, useState } from 'react';
import { bigGetItem, bigSetItem } from './bigStore';

const QCOM_V4 = 'https://api.quran.com/api/v4';
// M.A.S. Abdel Haleem — "The Qur'an: A New Translation" (Oxford).
const TRANSLATION_RESOURCE = 85;

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 hari
const cacheKey = (nomor) => `cache:quran:trans_en:${nomor}`;

async function readCache(key, allowStale = false) {
  try {
    const raw = await bigGetItem(key);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (!obj || !Array.isArray(obj.payload)) return null;
    const expired = Date.now() - obj.ts > CACHE_TTL_MS;
    if (expired && !allowStale) return null;
    return obj.payload;
  } catch {
    return null;
  }
}

async function writeCache(key, payload) {
  try {
    await bigSetItem(key, JSON.stringify({ ts: Date.now(), payload }));
  } catch {}
}

// Bersihkan tag catatan kaki yang bisa lolos dari beberapa edisi.
function stripHtml(text) {
  return String(text || '')
    .replace(/<sup[^>]*>[\s\S]*?<\/sup>/g, '')
    .replace(/<[^>]+>/g, '')
    .trim();
}

/**
 * Terjemahan EN satu surah: array teks, index i = ayat nomor i+1.
 * Melempar error jika fetch gagal DAN tidak ada cache (sekalipun basi).
 */
export async function getSurahTranslationEn(nomor) {
  const n = parseInt(nomor, 10);
  if (!(n >= 1 && n <= 114)) throw new Error('nomor surah tidak valid');
  const key = cacheKey(n);
  try {
    const { data } = await axios.get(`${QCOM_V4}/quran/translations/${TRANSLATION_RESOURCE}`, {
      params: { chapter_number: n },
      timeout: 15000,
    });
    const arr = Array.isArray(data?.translations) ? data.translations : [];
    const texts = arr.map((v) => stripHtml(v?.text));
    if (!texts.length) throw new Error('terjemahan EN kosong');
    await writeCache(key, texts);
    return texts;
  } catch (e) {
    const cached = await readCache(key, true);
    if (cached) return cached;
    throw e;
  }
}

/**
 * Hook layar: kumpulan terjemahan EN untuk satu surah, hanya saat
 * `enabled` (bahasa efektif = English). Return null saat belum termuat /
 * dimatikan — pemanggil harus tetap punya fallback teks ID.
 */
export function useSurahTranslationEn(surahNumber, enabled) {
  const [texts, setTexts] = useState(null);
  useEffect(() => {
    if (!enabled) { setTexts(null); return; }
    let alive = true;
    getSurahTranslationEn(surahNumber)
      .then((t) => { if (alive) setTexts(t); })
      .catch(() => { if (alive) setTexts(null); });
    return () => { alive = false; };
  }, [surahNumber, enabled]);
  return texts;
}

// ============================================================
// TAFSIR AYAT BAHASA INGGRIS (spa5k/tafsir_api via jsDelivr)
// ============================================================
// Sumber: "Tafsir Ibn Kathir (Abridged)" + Tafsir Al-Jalalayn (EN),
// dikurasi Quran.com Foundation / QUL. File statis per surah:
//   https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@v1.2.1/tafsir/
//     en-tafisr-ibn-kathir/{surah}.json  (array [{text, ayah, surah}])
//     en-al-jalalayn/{surah}.json
// Pin ke tag v1.2.1 (bukan @main) agar data tidak berubah diam-diam.
// Lisensi teks tafsir bukan otomatis MIT (itu milik kodenya); wajib
// cantumkan atribusi di layar tafsir EN untuk kepatuhan Play Store.
// Pola cache sama dengan terjemahan di atas: 7 hari via bigStore, dan
// saat offline jatuh ke cache basi ketimbang gagal total.
// Layar memanggil hook useSurahTafsirEn(surah, enabled); ayat yang
// tidak ditemukan di kedua sumber EN otomatis fallback ke tafsir ID.
// ============================================================

const TAFSIR_VERSION = 'v1.2.1';
const TAFSIR_PRIMARY = 'en-tafisr-ibn-kathir';   // Ibn Kathir (Abridged)
const TAFSIR_SECONDARY = 'en-al-jalalayn';        // Al-Jalalayn (EN)
const tafsirCacheKey = (nomor) => `cache:quran:tafsir_en:${nomor}`;

async function readTafsirCache(key, allowStale = false) {
  try {
    const raw = await bigGetItem(key);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (!obj || !Array.isArray(obj.payload)) return null;
    const expired = Date.now() - obj.ts > CACHE_TTL_MS;
    if (expired && !allowStale) return null;
    return obj.payload;
  } catch {
    return null;
  }
}

async function writeTafsirCache(key, payload) {
  try {
    await bigSetItem(key, JSON.stringify({ ts: Date.now(), payload }));
  } catch {}
}

// Teks spa5k kadang bermarkar markdown (**tebal**); bersihkan ringan.
function cleanTafsirText(text) {
  return String(text || '')
    .replace(/\*\*/g, '')
    .replace(/<[^>]+>/g, '')
    .trim();
}

async function fetchTafsirSource(nomor, source) {
  try {
    const { data } = await axios.get(
      `https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@${TAFSIR_VERSION}/tafsir/${source}/${nomor}.json`,
      { timeout: 15000 }
    );
    if (!Array.isArray(data)) throw new Error('format tidak dikenal');
    // Bentuk array per-ayah: {text, ayah, surah}. Ayat yang ber-cakupan
    // bisa menangani rentang (prefiks "(65) ... (66)"); tetap tampilkan.
    const map = {};
    for (const item of data) {
      const a = parseInt(item?.ayah, 10);
      const text = cleanTafsirText(item?.text);
      if (a >= 1 && a <= 200 && text && !map[a]) map[a] = text;
    }
    return map;
  } catch {
    return null; // sumber sekunder opsional: gagal = abaikan
  }
}

/**
 * Tafsir EN satu surah: array teks, index i = ayat nomor i+1.
 * Ayat tanpa EN (miskin) = string kosong — pemanggil fallback ke ID.
 * Melempar error jika kedua sumber gagal DAN tidak ada cache.
 */
export async function getSurahTafsirEn(nomor) {
  const n = parseInt(nomor, 10);
  if (!(n >= 1 && n <= 114)) throw new Error('nomor surah tidak valid');
  const key = tafsirCacheKey(n);
  const [primary, secondary] = await Promise.all([
    fetchTafsirSource(n, TAFSIR_PRIMARY),
    fetchTafsirSource(n, TAFSIR_SECONDARY),
  ]);
  if (!primary && !secondary) {
    const cached = await readTafsirCache(key, true);
    if (cached) return cached;
    throw new Error('tafsir EN tidak tersedia');
  }
  const p = primary || {};
  const s = secondary || {};
  const maxAyah = Math.max(...Object.keys({ ...p, ...s }).map(Number), 0);
  const out = [];
  for (let a = 1; a <= maxAyah; a++) out.push(p[a] || s[a] || '');
  if (!out.length) {
    const cached = await readTafsirCache(key, true);
    if (cached) return cached;
    throw new Error('tafsir EN tidak tersedia');
  }
  await writeTafsirCache(key, out);
  return out;
}

/**
 * Hook layar: tafsir EN untuk satu surah, hanya saat `enabled`
 * (bahasa efektif = English). Return null saat belum termuat / dimatikan
 * / gagal — pemanggil harus tetap punya fallback tafsir ID.
 */
export function useSurahTafsirEn(surahNumber, enabled) {
  const [texts, setTexts] = useState(null);
  useEffect(() => {
    if (!enabled) { setTexts(null); return; }
    let alive = true;
    getSurahTafsirEn(surahNumber)
      .then((t) => { if (alive) setTexts(t); })
      .catch(() => { if (alive) setTexts(null); });
    return () => { alive = false; };
  }, [surahNumber, enabled]);
  return texts;
}
