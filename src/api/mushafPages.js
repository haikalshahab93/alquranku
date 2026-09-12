// Data & akses halaman mushaf (604 halaman standar Madani).
// Meta per halaman ada di mushafPages.json (statis, kecil): daftar pasangan
// [surah, ayat] yang tepat berada di halaman itu. Isi ayat diambil dari
// equran.id per surah (sudah ter-cache 7 hari di api/quran.js), lalu hasil
// per halaman disimpan lagi via bigStore (file) agar buka ulang instan & tetap
// bisa dibuka offline.
import pagesMeta from './mushafPages.json';
import { getSuratDetail } from './quran';
import { bigGetItem, bigSetItem } from './bigStore';

// pagesMeta.pages: [ [[surah, ayat], ...], ... ] untuk halaman 1..604
export const TOTAL_PAGES = pagesMeta.count || 604;

/** Pasangan [surah, ayat] terurut untuk satu halaman mushaf. */
export function getPagePairs(page) {
  const p = Number(page);
  if (!Number.isFinite(p) || p < 1 || p > TOTAL_PAGES) return [];
  return pagesMeta.pages[p - 1] || [];
}

// v2: cache lama menyimpan indo kosong (field terjemahan keliru) — naikkan versi agar di-fetch ulang
const pageCacheKey = (page) => `cache:quran:mushaf_page_v2:${page}`;

// Hindari fetch ganda untuk halaman yang sama
const inFlight = new Map();

async function readPageCache(page) {
  try {
    const raw = await bigGetItem(pageCacheKey(page));
    if (!raw) return null;
    const arr = JSON.parse(raw);
    return Array.isArray(arr) && arr.length ? arr : null;
  } catch {
    return null;
  }
}

async function writePageCache(page, verses) {
  try {
    await bigSetItem(pageCacheKey(page), JSON.stringify(verses));
  } catch {}
}

/**
 * Ambil isi satu halaman mushaf: array { surah, ayat, surahName, arab, latin, indo }.
 * Terurut sesuai urutan baca mushaf. Hasil di-cache permanen (teks Quran tidak berubah).
 */
export async function getPageVerses(page) {
  const cached = await readPageCache(page);
  if (cached) return cached;
  if (inFlight.has(page)) return inFlight.get(page);

  const job = (async () => {
    const pairs = getPagePairs(page);
    if (!pairs.length) return [];
    const surahsNeeded = [...new Set(pairs.map(([s]) => s))];
    const details = await Promise.all(
      surahsNeeded.map((n) => getSuratDetail(n).catch(() => null))
    );
    const bySurah = new Map(surahsNeeded.map((n, i) => [n, details[i]]));
    const verses = pairs
      .map(([s, a]) => {
        const det = bySurah.get(s);
        const ayat = Array.isArray(det?.ayat)
          ? det.ayat.find(
              (x) => Number(x?.nomorAyat ?? x?.nomor ?? x?.nomor_ayat) === a
            )
          : null;
        return {
          surah: s,
          ayat: a,
          surahName: det?.namaLatin ?? det?.nama_latin ?? `Surah ${s}`,
          arab: ayat?.teksArab ?? ayat?.teks_arab ?? '',
          latin: ayat?.teksLatin ?? ayat?.teks_latin ?? '',
          indo: ayat?.teksIndonesia ?? ayat?.teksTerjemahan ?? ayat?.teks_terjemahan ?? '',
        };
      })
      .filter((v) => v.arab || v.indo);
    if (verses.length) await writePageCache(page, verses);
    return verses;
  })();

  inFlight.set(page, job);
  try {
    return await job;
  } finally {
    inFlight.delete(page);
  }
}
