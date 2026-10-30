// ============================================================
// LOADER KAMUS DWIBAHASA (ID/EN) — sumber: i18nDb.json
// ============================================================
// Semua teks dwibahasa aplikasi kini disimpan di SATU database JSON:
//   src/api/i18nDb.json   — format: { "kunci": { "id": "...", "en": "..." } }
// Kerangkanya tetap di i18n.js dan TIDAK berubah. Tambah materi baru =
// tambah entri di i18nDb.json saja — bagus juga sebagai basis bila nanti
// teks-teks ini ingin dipindah ke backend sendiri (API milik Anda).
// Kunci tanpa 'en' otomatis jatuh ke teks Indonesia.
// ============================================================

import DB from './i18nDb.json';

export const PLATFORM_LANG_VALUE = ['system', 'id', 'en'];

// Database dwibahasa. Dibekap salinan agar gaya akses sama seperti dulu
// (TEXTS['kunci'].id / .en) — tanpa mengubah satu pun pemanggil.
export const TEXTS = Object.freeze({ ...DB });
