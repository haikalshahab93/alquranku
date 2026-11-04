// Tautan unduh app di Google Play.
// Ditambahkan di bagian bawah setiap konten "Bagikan" (ayat, doa, hadits,
// kalender, dst.) agar penerima yang belum memasang app bisa langsung
// mengunduhnya dari toko.
export const APP_PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.alfarisy.infoalquran';

// Sisipkan tautan di bawah isi. Bila isi kosong, hasilnya tautan saja.
export function withAppLink(text) {
  const s = String(text ?? '');
  const sep = s.trim() ? '\n\n' : '';
  return `${s}${sep}${APP_PLAY_STORE_URL}`;
}

// Kontak untuk kartu "Kontak Kami" di Pengaturan — masih logo default:
// ganti nilai placeholder ini saat akun kontaknya sudah tersedia.
export const CONTACT_LINKS = {
  instagram: 'https://www.instagram.com/USERNAME_GANTI',   // ganti saat akun sudah ada
  website: 'https://WEBSITE_GANTI.example.com',            // ganti saat sudah ada
  email: 'mailto:EMAIL_GANTI@example.com',                 // ganti saat sudah ada
};

// ID paket app, diambil dari tautan Play Store (com.alfarisy.infoalquran)
const APP_ID = APP_PLAY_STORE_URL.split('id=')[1] || '';

// Buka halaman rating app di Play Store: aplikasi Play Store dulu
// (market://details), jatuh ke https bila toko tidak terpasang
// (emulator/browser). showAllReviews agar langsung ke daftar rating & ulasan.
export async function openPlayStoreRating() {
  const { Platform, Linking } = require('react-native');
  const native = Platform.OS === 'android' ? `market://details?id=${APP_ID}&showAllReviews=true` : '';
  try {
    if (native) {
      try { await Linking.openURL(native); return; } catch {}
    }
    await Linking.openURL(`${APP_PLAY_STORE_URL}&showAllReviews=true`);
  } catch {}
}

// Kebijakan privasi. Kosong = layar Informasi & Privasi membuka salinan
// kebijakan yang DIBUNDEL di dalam app (playstore/privacy-policy.html).
// Isi dengan URL publik (GitHub Pages/Notion) setelah file di-hosting.
export const PRIVACY_POLICY_URL = '';
