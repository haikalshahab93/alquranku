# ALQURANKU

Aplikasi Al-Qur'an berbasis Expo (React Native) untuk membaca daftar surat, detail surat, pemutaran audio per ayat, pemilihan Qari, serta tampilan Tafsir per ayat yang rapi dan mudah dinavigasi.

## Fitur Utama
- Navigasi bawah (Bottom Bar): Home, Surah, Bookmark, Pengaturan
- Layar Bookmark Quran:
  - Koleksi bookmark (mis. My Favorite, Daily) dengan jumlah item
  - Tambah koleksi baru
  - Ketuk bookmark untuk langsung membuka SurahDetail dan auto-scroll ke ayat target
- Daftar Surat lengkap
- Detail Surat:
  - Teks Arab, Latin, dan Terjemahan Indonesia per ayat
  - Pemutar audio per ayat dengan kontrol:
    - Putar Surat (mulai dari ayat pertama)
    - Sebelumnya / Berikutnya (navigasi ayat aktif)
    - Hentikan
  - Pemilihan Qari melalui dropdown, menyimpan preferensi secara lokal
  - Lihat Tafsir per ayat:
    - Konten dibatasi tinggi layar (agar tidak memicu scroll panjang)
    - Paginasi dengan tombol "Halaman Sebelumnya" / "Halaman Berikutnya"
    - Navigasi antar ayat dari area Tafsir: "Sebelumnya" / "Berikutnya"

## Teknologi
- Expo (React Native)
- JavaScript (ES6+)

## Fitur Tambahan: Direktori Ulama

Direktori Ulama ditambahkan dengan pengalaman yang responsif dan nyaman:
- Responsif: grid 3 kolom (≥1200px), 2 kolom (≥768px), dan 1 kolom di mobile.
- Paginasi eksplisit dengan tombol "Sebelumnya" dan "Sesudahnya" untuk membatasi konten yang tampil per halaman.
- Ukuran halaman saat ini: 30 item per halaman (dapat diubah).
- Pencarian mengembalikan ke halaman pertama.
- Detail Ulama menangani seluruh nilai teks/empty dengan aman untuk menghindari error "Unexpected text node".

Lokasi terkait:
- Layar daftar: `src/screens/ulama/UlamaListScreen.js`
- Layar detail: `src/screens/ulama/UlamaDetailScreen.js`
- Dataset: `src/data/ulama.json`
- ETL/alat bantu dataset: `scripts/etl_ulama.py`

## Kalender Hijriah (MyQuran API)

Aplikasi menampilkan kalender Hijriah bulanan menggunakan API MyQuran dan dilengkapi penanganan CORS khusus untuk mode web:
- Endpoint dasar: `https://api.myquran.com/v2/kalender/hijriah/{tahun}/{bulan}`.
- Penanganan CORS: mencoba beberapa proxy yang umumnya menyertakan `Access-Control-Allow-Origin: *`.
  - Primary: `https://api.allorigins.win/raw?url=`
  - Fallback: `https://corsproxy.io/?`, `https://api.codetabs.com/v1/proxy?quest=`
- Caching: respons disimpan di `AsyncStorage` selama ±7 hari untuk ketahanan jaringan.
- Timeout & header: permintaan menetapkan `Accept: application/json` dan timeout hingga 15 detik.

Lokasi terkait:
- API kalender: `src/api/kalender.js`
- Layar kalender: `src/screens/calendar/HijriCalendarScreen.js`

Tips uji web (Expo web):
- Jalankan dev server: `npx expo start --web --port 8084`
- Buka: `http://localhost:8084/` lalu navigasi ke halaman Kalender Hijriah.
- Jika ada error jaringan/CORS, klik "Coba lagi"; aplikasi akan mencoba proxy fallback.

## Masalah umum & Solusi

- Error "Unexpected text node: -" pada detail Ulama: sudah diperbaiki dengan memastikan semua nilai teks/empty dibungkus komponen `<Text>`.
- CORS error saat memanggil API MyQuran di web: ditangani dengan fallback proxy dan caching. Jika semua proxy gagal, gunakan aplikasi di mode native (Expo Go) atau sambungkan ke jaringan berbeda.

## Struktur Proyek (ringkas)

```
./
├── src/
│   ├── api/
│   │   ├── kalender.js        # Penanganan API kalender + proxy CORS, cache
│   │   ├── quran.js           # API Qur'an
│   │   └── ...
│   ├── screens/
│   │   ├── ulama/             # Daftar & Detail Ulama (responsif + paginasi)
│   │   ├── calendar/          # Kalender Hijriah
│   │   └── ...
│   └── ui/                    # Theme & komponen UI reusable
├── scripts/etl_ulama.py       # Alat bantu pengolahan dataset Ulama
└── ...
```

## Build & Preview

- Development (native): `npx expo start`
- Development (web): `npx expo start --web` atau dengan port khusus `--port 8084`
- Build Android APK/AAB: gunakan `eas.json` dan perintah `npx eas build -p android --profile <profil>` (lihat bagian Build dan Rilis di atas)

## Deploy ke GitHub

Langkah umum:
1. Inisialisasi (jika belum):
   ```bash
   git init
   git add -A
   git commit -m "chore: initial commit"
   ```
2. Buat repo kosong di GitHub (mis. `https://github.com/<username>/alquranku`).
3. Set remote & push:
   ```bash
   git branch -M main
   git remote add origin https://github.com/<username>/alquranku.git
   git push -u origin main
   ```

Catatan: pastikan Anda sudah login Git atau menyiapkan Personal Access Token (PAT) saat push via HTTPS.

## Lisensi & Dataset

- Dataset `src/data/ulama.json` berasal dari sumber internal proyek. Mohon pastikan lisensi penggunaan dan atribusi sumber sesuai sebelum rilis publik.
- Jika ukuran data besar, pertimbangkan pemecahan per abjad/era agar performa daftar lebih baik.
- Daftar Surat lengkap
- Detail Surat:
  - Teks Arab, Latin, dan Terjemahan Indonesia per ayat
  - Pemutar audio per ayat dengan kontrol:
    - Putar Surat (mulai dari ayat pertama)
    - Sebelumnya / Berikutnya (navigasi ayat aktif)
    - Hentikan
  - Pemilihan Qari melalui dropdown, menyimpan preferensi secara lokal
  - Lihat Tafsir per ayat:
    - Konten dibatasi tinggi layar (agar tidak memicu scroll panjang)
    - Paginasi dengan tombol "Halaman Sebelumnya" / "Halaman Berikutnya"
    - Navigasi antar ayat dari area Tafsir: "Sebelumnya" / "Berikutnya"

## Teknologi
- Expo (React Native)
- JavaScript (ES6+)

## Struktur Proyek
```
./
├── App.js
├── index.js
├── package.json
└── src/
    ├── api/equran.js
    └── screens/
        ├── SurahListScreen.js
        ├── SurahDetailScreen.js
        └── TafsirScreen.js
```

## Menjalankan Proyek
1. Instal dependensi:
   ```bash
   npm install
   ```
2. Jalankan pengembangan (native + web):
   - Jalankan Expo dev server (native):
     ```bash
     npx expo start
     ```
   - Jalankan mode web:
     ```bash
     npx expo start --web
     ```
   - Atau gunakan npm script jika tersedia:
     ```bash
     npm run web
     ```

## Catatan Penggunaan
- Gunakan bottom bar untuk navigasi cepat: Home, Surah, Bookmark, Pengaturan.
- Di layar Bookmark, ketuk sebuah item untuk langsung membuka SurahDetail dan aplikasi akan auto-scroll ke ayat target.
- Di halaman detail surat, pilih Qari melalui dropdown untuk mengubah sumber audio.
- Gunakan tombol kontrol audio (Putar Surat/Sebelumnya/Berikutnya/Hentikan) untuk kendali pemutaran.
- Tekan "Lihat Tafsir Ayat N" untuk membuka tafsir yang dipaginasi; gunakan tombol "Halaman Sebelumnya/Berikutnya" untuk navigasi konten, dan tombol "Sebelumnya/Berikutnya" untuk pindah ke ayat lain.

## Rencana Peningkatan (Rekomendasi)
1. Indikator halaman di kotak tafsir (mis. "Halaman 1/4").
2. Kontrol ukuran font (Perbesar/Perkecil) untuk tafsir dan ayat, serta menyimpan preferensi secara lokal.

## Build dan Rilis

### Build APK (untuk instalasi langsung)
```bash
npx eas build -p android --profile android-apk --non-interactive
```

## Panduan Update ke Play Store (AAB)

Langkah lengkap agar rilis ke Play Store konsisten dan mudah di-maintain:

1) Prasyarat
- Pastikan sudah login Expo: `npx expo login`
- EAS CLI terpasang: `npm i -g eas-cli` (opsional jika belum)
- Package Android sudah benar: `com.alfarisy.infoalquran` (lihat `app.json` > `android.package`)
- Ikon & splash sudah siap: `assets/icon.png`, `assets/adaptive-icon.png`, `assets/splash-icon.png`

2) Versioning aplikasi
- Buka `app.json` dan naikkan `expo.version` (mis. dari `1.0.0` ke `1.0.1`)
- (Opsional/Disarankan) Tambahkan `android.versionCode` jika Play Console meminta increment manual.
  Contoh:
  ```json
  {
    "expo": {
      "version": "1.0.1",
      "android": {
        "package": "com.alfarisy.infoalquran",
        "versionCode": 2
      }
    }
  }
  ```
- Simpan perubahan dan commit.

3) Build AAB (untuk Play Store)
- Jalankan: `npx eas build -p android --profile android-production --non-interactive`
- Setelah selesai, catat URL artefak AAB yang diberikan.

4) Uji & verifikasi
- Buka aplikasi di dev (Expo Go) atau web untuk sanity check fitur utama (Surah, Doa, Hadits, Ulama, Pengaturan).
- Pastikan perbaikan UI terbaru tampil rapi (badge, tombol, pager, dll.).

5) Upload ke Google Play Console
- Masuk ke Play Console > App Anda > Release > Production/Internal test.
- Upload berkas AAB dari hasil EAS Build.
- Isi catatan rilis (what’s new), versi, dan cek kebijakan (privacy policy sudah ada di `docs/Alquranku-Privacy-Policy-and-Terms.rtf`).
- Lanjutkan review dan publikasi.

6) Submit via EAS (opsional)
- Jika ingin submit langsung dari EAS: `npx eas submit -p android --profile production`
- Pastikan kredensial Play Console sudah dikonfigurasi di akun EAS Anda.

7) Penandaan rilis
- Setelah rilis, buat tag git: `git tag v1.0.1 && git push --tags`
- Tambahkan catatan rilis di GitHub (Release Notes) untuk dokumentasi.

## Panduan Push ke GitHub (ringkas)

1) Cek status perubahan: `git status`
2) Tambahkan semua perubahan: `git add -A`
3) Commit dengan pesan yang jelas: `git commit -m "docs: Play Store guide; fix UI & Ionicons in Doa; hadits pager"`
4) Push ke remote: `git push`

Tips:
- Gunakan pesan commit yang informatif (prefix seperti `feat:`, `fix:`, `docs:`) agar riwayat mudah ditelusuri.
- Simpan link artefak AAB di README atau di Release Notes GitHub untuk rujukan cepat.
File artefak akan tersedia di dashboard Expo (EAS) dan diunduh ke folder `dist/` oleh skrip otomatis.

### Catatan Rilis (1.1.0)
- Bottom bar diperbarui: Home, Surah, Bookmark, Pengaturan (Doa & Hadits tidak lagi ditempatkan di bottom bar)
- Penambahan layar Bookmark Quran dan integrasi navigasi dari SurahList serta Settings
- Fitur auto-scroll ke ayat saat membuka dari bookmark
- Perbaikan error: penutupan fungsi komponen SurahDetail (brace) dan infinite re-render pada status player
- Peningkatan stabilitas

## UI Kit (Atomic Design)
Kami menambahkan UI Kit sederhana untuk konsistensi tema ungu dan reusable components.

### Theme
Lokasi: `src/ui/index.js`

```js
export const theme = {
  colors: {
    primary: '#8b5cf6',
    primaryDark: '#6d28d9',
    primaryLight: '#a78bfa',
    bg: '#f8fafc',
    text: '#1f2937',
    muted: '#6b7280',
    white: '#ffffff',
  },
  radii: { md: 12, lg: 16 },
  shadow: {
    card: {
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 3,
    },
  },
};
```

### Komponen Reusable
- `GradientCard({ title, desc, onPress })`
- `PurpleButton({ label, onPress })`
- `OutlineLightButton({ label, onPress })`
- `SectionTitle`
- `SecondaryText`

Contoh penggunaan:
```jsx
import { GradientCard, PurpleButton, OutlineLightButton, SectionTitle, SecondaryText, theme } from '../ui';

<GradientCard title="Terakhir dibaca" desc="Al-Fatihah ayat 3" onPress={() => {}} />
<PurpleButton label="Lanjutkan" onPress={() => {}} />
<OutlineLightButton label="Reset" onPress={() => {}} />
<SectionTitle>Daftar Surat</SectionTitle>
<SecondaryText>Konten deskripsi yang lebih halus</SecondaryText>
```

### Pedoman Desain
- Aksen biru diganti menjadi ungu: gunakan `theme.colors.primary`, `primaryDark`, `primaryLight`.
- Shadow lembut dan rounded konsisten: gunakan `theme.shadow.card` dan `theme.radii`.
- Teks sekunder di atas gradient: gunakan `SecondaryText` atau `color: theme.colors.muted` untuk keterbacaan.

## Pratinjau & Pengembangan Web
Jalankan server pengembangan web:
```bash
npx expo start --web
```
Server akan terbuka di `http://localhost:19006/` secara default.

## Kontribusi
- Ikuti pola UI Kit untuk komponen baru agar konsisten.
- Hindari hardcode warna biru; gunakan `theme`.
- Pastikan tampilan mobile dan web diuji di pratinjau Expo.