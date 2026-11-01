// Kata bijak hadits pengiring notifikasi waktu sholat.
// Kumpulan hadits terpilih yang relevan masing-masing waktu sholat; teks di bawah
// adalah parafrasa terjemahan Indonesia/Inggris yang umum dipakai, lengkap dengan
// perawi agar pengguna tahu sumbernya. Teks Arab sengaja tidak disalin agar tidak
// berisiko salah menuliskan lafaz nabi — cukup terjemahan + keterangan perawi.
//
// Dipakai oleh src/api/notifications.js: setiap notifikasi adzan/pengingat
// menyertakan satu hadits sesuai waktunya, berganti setiap hari (rotasi harian).

import { getLangNow } from './i18n';

const MUTIARA_UMUM = [
  {
    id: 'Perumpamaan shalat lima waktu bagaikan sungai jernih di depan pintumu; bila engkau mandi lima kali sehari di dalamnya, tidak akan tersisa kotoran.',
    en: 'The five daily prayers are like a river at your door; if you bathed in it five times a day, no dirt would remain.',
    sumber: 'HR. Bukhari & Muslim',
  },
  {
    id: 'Andai orang mengetahui (keutamaan) adzan dan shaf pertama, niscaya mereka berlomba — bahkan mengundi — untuk mendapatkannya.',
    en: 'If people knew the virtue of the adhan and the first row, they would compete for it by drawing lots.',
    sumber: 'HR. Bukhari',
  },
  {
    id: 'Doa di antara adzan dan iqamah tidak akan ditolak.',
    en: 'A supplication between the adhan and the iqamah is not rejected.',
    sumber: 'HR. Abu Dawud & Tirmidzi',
  },
  {
    id: 'Amal yang paling Allah cintai adalah sholat tepat pada waktunya.',
    en: 'The deed most beloved to Allah is prayer offered at its proper time.',
    sumber: 'HR. Bukhari & Muslim',
  },
];

const MUTIARA_SHOLAT = {
  subuh: [
    {
      id: 'Sholat subuh dalam keadaan berjamaah lebih utama daripada sholat (sunah) dunia dan seisinya.',
      en: 'Praying Fajr in congregation is better than praying (voluntarily) the whole night and the entire world.',
      sumber: 'HR. Muslim',
    },
    {
      id: 'Siapa sholat subuh berjamaah lalu berdzikir sampai matahari terbit, maka baginyalah (pahala) haji dan umrah yang penuh pahalanya.',
      en: 'Whoever prays Fajr in congregation, then sits remembering Allah until sunrise, will have a reward of complete Hajj and Umrah.',
      sumber: 'HR. Tirmidzi',
    },
    {
      id: 'Para malaikat pengjaga malam dan para malaikat pengjaga siang bertemu (bersaksi) pada waktu sholat subuh.',
      en: 'The angels of the night and the angels of the day gather at the time of the Fajr prayer.',
      sumber: 'HR. Muslim',
    },
  ],
  dzuhur: [
    {
      id: 'Apabila terik matahari dasyat (waktu dzuhur), tunggulah hingga dingin; sesungguhnya tiupan panas itu berasal dari tiupan neraka jahannam.',
      en: 'When the heat is intense (at Dhuhr), delay the prayer until it cools; excessive heat is from the breath of Hell.',
      sumber: 'HR. Bukhari & Muslim',
    },
    {
      id: 'Sholat lima waktu, dari Jumat ke Jumat, serta Ramadan ke Ramadan, adalah penebus antaranya, selama dosa besar dijauhi.',
      en: 'The five prayers, one Friday to the next, and Ramadan to Ramadan, expiate the sins between them, as long as major sins are avoided.',
      sumber: 'HR. Muslim',
    },
  ],
  ashar: [
    {
      id: 'Siapa meninggalkan sholat ashar, maka hancurlah amalnya.',
      en: 'Whoever misses the Asr prayer, his deeds will be lost.',
      sumber: 'HR. Bukhari',
    },
    {
      id: 'Bagi yang menjaga sholat lima waktunya, ia itu (pada hari kiamat) berupa cahaya, bukti yang jelas, dan keselamatan.',
      en: 'For the one who guards the five prayers, it will be a light, a clear proof, and salvation on the Day of Resurrection.',
      sumber: 'HR. Muslim',
    },
  ],
  maghrib: [
    {
      id: 'Rosulullah ﷺ menjaga sholat dua rakaat (sunah) yang ringan sebelum maghrib; dan beliau melembutkannya agar menjadi kebiasaan.',
      en: 'The Prophet ﷺ used to offer two light rak‘ahs (sunnah) before the Maghrib prayer.',
      sumber: 'HR. Bukhari',
    },
    {
      id: 'Siapa mengerjakan sholat maghrib dalam keadaan berjamaah, maka ia berada dalam perlindungan Allah.',
      en: 'Whoever prays Maghrib in congregation is under the protection of Allah.',
      sumber: 'HR. Malik (Muwatta)',
    },
  ],
  isya: [
    {
      id: 'Siapa sholat isya dalam keadaan berjamaah, maka ia seperti orang beribadah setengah malam.',
      en: 'Whoever prays Isha in congregation, it is as if he prayed half the night.',
      sumber: 'HR. Muslim',
    },
    {
      id: 'Waktu sholat yang paling ramai (dengan para malaikat) adalah sholat isya dan sholat subuh.',
      en: 'The most heavily attended prayer times are Isha and Fajr.',
      sumber: 'HR. Muslim',
    },
  ],
};

// Hari ke-n dalam tahun (0..365) untuk rotasi harian.
function dayOfYear(d) {
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d - start) / 86400000);
}

function hashString(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

// Alias key yang mungkin dipakai penyimpan jadwal.
const KEY_ALIASES = {
  subuh: 'subuh', fajr: 'subuh', fajri: 'subuh',
  dzuhur: 'dzuhur', zuhur: 'dzuhur', dhuhr: 'dzuhur', lohor: 'dzuhur',
  ashar: 'ashar', asar: 'ashar', asr: 'ashar',
  maghrib: 'maghrib', magrib: 'maghrib',
  isya: 'isya', isha: 'isya', 'isya-hafuna': 'isya',
  imsak: 'subuh', terbit: 'subuh', sunrise: 'subuh', dhuha: 'subuh',
};

// Ambil satu hadits untuk waktu sholat tertentu pada tanggal tertentu.
// key : 'subuh'/'dzuhur'/'ashar'/'maghrib'/'isya' (atau alias seperti 'fajr')
// lang: 'id' | 'en' (default: ikut getLangNow())
export function getMutiaraSholat(key, date = new Date(), lang = null) {
  let lng = lang;
  if (!lng) {
    try { lng = getLangNow(); } catch { lng = 'id'; }
  }
  const norm = String(key || '').toLowerCase().trim();
  const uniq = KEY_ALIASES[norm] || norm;
  const listSpesifik = MUTIARA_SHOLAT[uniq] || [];
  const pool = [...listSpesifik, ...MUTIARA_UMUM];
  const item = pool[(dayOfYear(date) * 3 + hashString(uniq)) % pool.length];
  if (!item) return null;
  const teks = lng === 'en' ? item.en : item.id;
  return { teks, sumber: item.sumber };
}

// Baris teks siap tambatan ke isi notifikasi (dengan batas panjang).
export function formatMutiaraBaris(key, date = new Date(), lang = null) {
  const m = getMutiaraSholat(key, date, lang);
  if (!m || !m.teks) return '';
  const teks = m.teks.length > 140 ? `${m.teks.slice(0, 137)}…` : m.teks;
  return `${teks}\n— Hadits: ${m.sumber}`;
}
