// Pengelompokan 30 juz (para) berdasarkan batas awal klasik mushaf.
// Setiap juz didefinisikan oleh surah+ayat pertama di dalamnya; satu surah
// boleh membentang di beberapa juz (contoh: Ali 'Imran menyentuh Juz 3-5).
export const JUZ_STARTS = [
  { juz: 1, surah: 1, ayat: 1, name: 'Al-Fatihah' },
  { juz: 2, surah: 2, ayat: 142, name: 'Al-Baqarah' },
  { juz: 3, surah: 2, ayat: 253, name: 'Al-Baqarah' },
  { juz: 4, surah: 3, ayat: 93, name: "Ali 'Imran" },
  { juz: 5, surah: 4, ayat: 24, name: "An-Nisa'" },
  { juz: 6, surah: 4, ayat: 148, name: "An-Nisa'" },
  { juz: 7, surah: 5, ayat: 82, name: "Al-Ma'idah" },
  { juz: 8, surah: 6, ayat: 111, name: "Al-An'am" },
  { juz: 9, surah: 7, ayat: 88, name: "Al-A'raf" },
  { juz: 10, surah: 8, ayat: 41, name: 'Al-Anfal' },
  { juz: 11, surah: 9, ayat: 93, name: 'At-Taubah' },
  { juz: 12, surah: 11, ayat: 6, name: 'Hud' },
  { juz: 13, surah: 12, ayat: 53, name: 'Yusuf' },
  { juz: 14, surah: 15, ayat: 1, name: 'Al-Hijr' },
  { juz: 15, surah: 17, ayat: 1, name: "Al-Isra'" },
  { juz: 16, surah: 18, ayat: 75, name: 'Al-Kahf' },
  { juz: 17, surah: 21, ayat: 1, name: 'Al-Anbiya' },
  { juz: 18, surah: 23, ayat: 1, name: "Al-Mu'minun" },
  { juz: 19, surah: 25, ayat: 21, name: 'Al-Furqan' },
  { juz: 20, surah: 27, ayat: 56, name: 'An-Naml' },
  { juz: 21, surah: 29, ayat: 46, name: 'Al-Ankabut' },
  { juz: 22, surah: 33, ayat: 31, name: 'Al-Ahzab' },
  { juz: 23, surah: 36, ayat: 28, name: 'Ya-Sin' },
  { juz: 24, surah: 39, ayat: 32, name: 'Az-Zumar' },
  { juz: 25, surah: 41, ayat: 47, name: 'Fussilat' },
  { juz: 26, surah: 46, ayat: 1, name: 'Al-Ahqaf' },
  { juz: 27, surah: 51, ayat: 31, name: 'Adh-Dhariyat' },
  { juz: 28, surah: 58, ayat: 1, name: 'Al-Mujadila' },
  { juz: 29, surah: 67, ayat: 1, name: 'Al-Mulk' },
  { juz: 30, surah: 78, ayat: 1, name: "An-Naba'" },
];

// Daftar 114 surah (nomor -> jumlah ayat). Sumber: jumlah ayat standar mushaf.
// Dipakai bila daftar surah dari API belum termuat sehingga tab Para tetap berfungsi.
export const SURAH_AYAH_COUNTS = [
  7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99, 128, 111, 110, 98, 135,
  112, 78, 118, 64, 77, 227, 93, 88, 69, 60, 34, 30, 73, 54, 45, 83, 182, 88, 75, 85, 54, 53,
  89, 59, 37, 35, 38, 29, 18, 45, 60, 49, 62, 55, 78, 96, 29, 22, 24, 13, 14, 11, 11, 18, 12,
  12, 30, 52, 52, 44, 28, 28, 20, 56, 40, 31, 50, 40, 46, 42, 29, 19, 36, 25, 22, 17, 19, 26,
  30, 20, 15, 21, 11, 8, 8, 19, 5, 8, 8, 11, 11, 8, 3, 9, 5, 4, 7, 3, 6, 3, 5, 4, 5, 6,
];

// Surah ke-N dimulai pada ayat global ke berapa (kumulatif)
export function globalAyahStart(surahNumber, counts = SURAH_AYAH_COUNTS) {
  let total = 0;
  for (let i = 0; i < surahNumber - 1; i++) total += counts[i];
  return total + 1;
}

// Juz untuk satu "nomor ayat global" (1..6236) — dipakai info halaman mushaf.
export function juzFromGlobalAyah(globalAyah, counts = SURAH_AYAH_COUNTS) {
  const b = juzBoundaries(counts);
  let cur = 1;
  for (const x of b) {
    if (globalAyah >= x.global) cur = x.juz;
    else break;
  }
  return cur;
}

// Batas juz dalam "nomor ayat global" agar perbandingan mudah
function juzBoundaries(counts) {
  return JUZ_STARTS.map((j) => ({
    ...j,
    global: globalAyahStart(j.surah, counts) + (j.ayat - 1),
  }));
}

// Surah-surah yang menyentuh sebuah juz, dengan rentang ayat di juz itu.
// counts: array jumlah ayat per surah (1-indexed posisi) — default ke SURAH_AYAH_COUNTS.
export function surahsInJuz(juzNumber, counts = SURAH_AYAH_COUNTS) {
  const bounds = juzBoundaries(counts);
  const idx = bounds.findIndex((b) => b.juz === Number(juzNumber));
  if (idx === -1) return [];
  const start = bounds[idx].global;
  const end = (idx + 1 < bounds.length ? bounds[idx + 1].global : totalAyahs(counts)) - 1;

  const result = [];
  for (let s = 1; s <= 114; s++) {
    const sStart = globalAyahStart(s, counts);
    const sEnd = sStart + counts[s - 1] - 1;
    if (sEnd < start || sStart > end) continue;
    // Rentang ayat surah ini yang jatuh di dalam juz:
    const rangeStart = Math.max(sStart, start);
    const rangeEnd = Math.min(sEnd, end);
    result.push({
      surah: s,
      fromAyat: rangeStart - sStart + 1,
      toAyat: rangeEnd - sStart + 1,
      jumlahAyat: counts[s - 1],
    });
  }
  return result;
}

function totalAyahs(counts) {
  return counts.reduce((a, b) => a + b, 0) + 1; // +1 penanda batas akhir (eksklusif)
}

// Juz mana saja yang menyentuh sebuah surah (untuk meta di tab Surah)
export function juzsOfSurah(surahNumber, counts = SURAH_AYAH_COUNTS) {
  const n = Number(surahNumber);
  if (!n || n < 1 || n > 114) return [];
  const bounds = juzBoundaries(counts);
  const sStart = globalAyahStart(n, counts);
  const sEnd = sStart + counts[n - 1] - 1;
  const out = [];
  for (let i = 0; i < bounds.length; i++) {
    const start = bounds[i].global;
    const end = (i + 1 < bounds.length ? bounds[i + 1].global : totalAyahs(counts)) - 1;
    if (sEnd >= start && sStart <= end) out.push(bounds[i].juz);
  }
  return out;
}

// Label ringkas "Juz 2 • Al-Baqarah 142" untuk header kartu juz
export function juzStartLabel(juzNumber) {
  const b = JUZ_STARTS.find((x) => x.juz === Number(juzNumber));
  return b ? `${b.name} ${b.ayat}` : '';
}
