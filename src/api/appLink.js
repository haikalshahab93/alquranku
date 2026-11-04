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

// Kontak developer — ditampilkan di kartu "Kontak Kami" pada Pengaturan.
// GANTI nilai placeholder berikut dengan akun milik Anda sendiri.
export const CONTACT_LINKS = {
  instagram: 'https://www.instagram.com/USERNAME_GANTI', // akun Instagram Anda
  website: 'https://WEBSITE_GANTI.example.com',          // situs / blog Anda
  email: 'mailto:EMAIL_GANTI@example.com',                // email Anda
};
