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
