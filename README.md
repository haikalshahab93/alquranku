# ALQURANKU

Aplikasi Al-Qur'an berbasis Expo (React Native) untuk membaca daftar surat, detail surat, pemutaran audio per ayat, pemilihan Qari, serta tampilan Tafsir per ayat yang rapi dan mudah dinavigasi.

## Fitur Utama
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

### Build AAB (untuk Play Store)
```bash
npx eas build -p android --profile android-production --non-interactive
```

File artefak akan tersedia di dashboard Expo (EAS) dan diunduh ke folder `dist/` oleh skrip otomatis.

### Catatan Rilis (1.0.0)
- Rilis awal ALQURANKU dengan fitur utama Qur'an, Doa, Hadits, dan Kalender Hijriyah
- Perbaikan tampilan logo di HomeScreen (fallback otomatis)
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