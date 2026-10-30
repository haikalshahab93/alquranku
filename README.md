# ALQURANKU

Aplikasi Al-Qur'an Islami berbasis **Expo (React Native)** — lintas platform Android / iOS / Web. Satu aplikasi untuk: baca Al-Qur'an lengkap 114 surat, terjemahan & tafsir, audio bacaan dengan Mode Karaoke, jadwal & pengingat sholat (adzan), doa harian, hadits, kiblat, kalender Hijriah, direktori ulama, dan tanya-jawab AI Islami.

## Fitur Utama

### Al-Qur'an
- Daftar 114 surat dengan pencarian + bookmark koleksi (My Favorite, Daily, dll.) — ketuk bookmark untuk langsung membuka ayatnya.
- Detail surat: teks **Arab, Latin, Terjemahan Indonesia**, plus terjemahan Inggris (Abdel Haleem via api.quran.com, cache offline).
- **Mode Karaoke**: audio per ayat, ayat aktif tersorot mengikuti bacaan; kontrol Putar Surat / Sebelumnya / Berikutnya / Hentikan.
- Pilihan qari lewat dropdown ringkas: baris ringkasan (nama + status unduhan) → ketuk untuk membuka daftar penuh → pilih → daftar auto-tutup.
- Tafsir per ayat: dipaginasi per halaman, navigasi antar ayat ("Sebelumnya/Berikutnya").

### Pengaturan (layar modular per kartu)
Render layar Setelan dipecah menjadi kartu-kartu kecil di `src/screens/settings/components/` supaya edit terisolasi per kartu:
- **Bahasa**: Indonesia / English / ikut setelan sistem (`useI18n`).
- **Tampilan**: Dark mode & skala font — berlaku ke semua layar lewat `settingsEvents` (pub/sub, tanpa polling).
- **Pengingat Sholat** + pratinjau suara adzan.
- **Qari Al-Qur'an** (dropdown) + **Unduh Semua Audio** (progres per-surah 114 surah).
- **Metode Perhitungan Sholat / Madzhab** (metode Aladhan).
- **Android**: Hemat Baterai & Alarm Tepat (izin `SCHEDULE_EXACT_ALARM`).
- **Penyimpanan**: statistik audio offline + konfirmasi hapus.
- **Setelan Teknis** (lanjutan).

### Layar lain
Home (dashboard + terakhir dibaca) · Hadits (menu, perawi, Bukhari-Muslim, detail) · Doa Harian · Kiblat (kompas) · Kalender Hijriah (bulanan, MyQuran API + fallback proxy CORS) · Direktori Ulama (grid responsif + paginasi) · LLM Chat (tanya AI) · Login/Onboarding (Google OAuth) · Profil Pengguna.

### Offline & Sinkronisasi
- Audio per qari diunduh ke storage HP, jadi bisa dibaca + didengar tanpa internet.
- Sinkron antar-HP lewat Supabase (bookmark, posisi baca, sebagian setelan) via `src/api/sync.js` dan `markDirty()`.
- Penyimpanan besar `bigStore.js` di atas AsyncStorage.

## Struktur Proyek

```
./
├── App.js                        # Root: navigasi + state bahasa/tema global
├── app.json / app.config.js      # Konfigurasi Expo (LLM & OAuth via env)
├── index.js                      # Entrypoint
├── eas.json                      # Profil build: android-apk / android-production
├── scripts/
│   ├── check-parse.js            # Sanity-test parse semua file JS app
│   ├── check-i18n.js             # Pemantau kunci i18n (duplikat / tak terpakai)
│   └── etl_ulama.py              # Alat bantu dataset ulama
├── playstore/                    # privacy-policy.html + deskripsi listing
└── src/
    ├── api/
    │   ├── i18n.js / i18nDb.json # Hook useI18n + database string dwibahasa
    │   ├── appearance.js         # Dark mode & skala font terpusat
    │   ├── settingsEvents.js     # Pub/sub perubahan setelan
    │   ├── notifications.js      # Penjadwalan adzan/getar/hening per waktu sholat
    │   ├── quran.js / quranEn.js # API surat/tafsir + cache offline
    │   ├── offlineAudio.js       # Unduh audio per qari + statistik
    │   ├── aladhan.js            # Metode waktu sholat
    │   ├── kalender.js           # MyQuran + proxy CORS + cache 7 hari
    │   ├── bigStore.js           # KV besar (audio offline)
    │   ├── sync.js               # Sinkronisasi Supabase
    │   └── doa.js
    ├── screens/
    │   ├── quran/                # SurahList, SurahDetail (karaoke), Tafsir, PageDetail, Bookmarks
    │   ├── settings/
    │   │   ├── SettingsScreen.js # Kerangka: state + aksi + susunan kartu
    │   │   └── components/       # 11 kartu + primitives.js
    │   ├── sholat/ hadits/ doa/ calendar/ qibla/ ulama/ auth/ llm/
    │   └── HomeScreen.js
    └── ui/index.js               # Palet tema light/dark + komponen reusable
```

Kaidah codebase: semua string lewat `useI18n().t()` (bukan hardcode) · palet lewat `getPalette(darkMode)` dari `src/ui` · network hanya di `src/api/` · dark mode & skala font reaktif via `settingsEvents`.

## Pengembangan

```bash
npm install
npm run android       # perangkat/emulator (butuh JDK & Android SDK)
npm run web           # web (Expo)
npx expo start        # pilih platform lewat menu

# Cek kualitas
npm run check:parse   # parse semua file JS app
npm run check:i18n    # kunci i18n duplikat / tak terpakai
```

## Konfigurasi Environment (opsional)

Aplikasi jalan tanpa key apa pun (LLM provider `builtin`). Untuk LLM/OpenAI & login Google, set sebelum restart dev server (lihat komentar di `app.config.js`):

```powershell
$env:EXPO_PUBLIC_LLM_PROVIDER     = "openai"   # atau "builtin" / "mock"
$env:EXPO_PUBLIC_OPENAI_API_KEY   = "<API_KEY>"
$env:EXPO_PUBLIC_GOOGLE_CLIENT_ID = "<WEB_CLIENT_ID>.apps.googleusercontent.com"
```

## Build APK Android (instalasi langsung)

### Jalur 1 — lokal dengan gradlew (gratis, pakai SDK di komputer)

```powershell
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
cd android
./gradlew assembleRelease
```

Hasil: `android/app/build/outputs/apk/release/app-release.apk` (APK universal, release-signed, ±127 MB).

### Jalur 2 — EAS Build (akun Expo)

```bash
npx eas build -p android --profile android-apk --non-interactive        # APK
npx eas build -p android --profile android-production --non-interactive # AAB utk Play Store
```

### Cara instal APK di HP
1. Salin `app-release.apk` ke HP (kabel USB / transfer).
2. Buka file → izinkan "Instal dari sumber tidak dikenal" bila diminta.
3. Update di atas versi lama tetap bisa, asal package sama (`com.alfarisy.infoalquran`) dan versionCode lebih tinggi.

> Niat rilis baru? Naikkan `expo.version` + `android.versionCode` di `app.json` (repo saat ini: versi `1.0.8`, versionCode 10), commit, baru build.

## Publish ke Play Store (AAB)

1. Naikkan versi di `app.json` → commit.
2. Build AAB: `npx eas build -p android --profile android-production --non-interactive`.
3. Upload ke Play Console (Release → Production/Internal test), isi catatan rilis.
4. Opsional: `npx eas submit -p android --profile production`.
5. Tandai di git: `git tag v1.0.8 && git push --tags`.

Aset listing: `playstore/privacy-policy.html`, `playstore/deskripsi-playstore.md`.

## Panduan Push ke GitHub (ringkas)

```bash
git status                         # file build (*.apk, *.aab, android/, ios/) sudah di-gitignore
git add <berkas berubah>
git commit -m "feat: ringkas perubahan"
git push origin main
```

Prefix commit yang dipakai repo ini: `feat(scope):`, `fix(scope):`, `chore:`, `docs:`.

## UI Kit (Atomic Design)

Tema ungu terpusat di `src/ui/index.js`:

```js
import { theme, getPalette, GradientCard, PurpleButton, SectionTitle, SecondaryText } from '../ui';
<GradientCard title="Terakhir dibaca" desc="Al-Fatihah ayat 3" onPress={() => {}} />
```

Pedoman: jangan hardcode warna biru/putih — pakai `palette.primary` / `palette.muted`; rounded & shadow konsisten via `theme.radii` & `theme.shadow.card`; grid responsif 3 kolom (≥1200px) / 2 (≥768px) / 1 (mobile).

## Masalah Umum & Solusi

| Gejala | Penyebab | Solusi |
|---|---|---|
| Notifikasi sholat tak bersuara di Android | Alarm tepat belum diizinkan / hemat baterai agresif | Setelan aplikasi → Hemat Baterai & Alarm Tepat, ikuti petunjuk izin sistem |
| Konten kosong di web (doa/hadits/kalender) | Semua proxy CORS gagal | Klik "Coba lagi"; di native tidak terkena restriksi CORS |
| Daftar qari gagal muat | Tidak ada internet | Pesan error tampil; sambungkan internet lalu buka lagi |
| "Unexpected text node" | Teks kosong/undefined di komponen Text | Sudah ditangani — nilai teks selalu dibungkus `<Text>`; jaga pola ini |
| Audio offline bermasalah | Cache rusak / storage penuh | Setelan → Penyimpanan → Hapus |

## Kontribusi & Lisensi Dataset

- Dataset `src/data/ulama.json` dari sumber internal proyek — cek lisensi/atribusi sebelum rilis publik.
- API pihak ketiga: equran/tadabbur (teks & tafsir), api.quran.com (terjemahan EN), MyQuran (kalender), Aladhan (waktu sholat), API audio qari.
- Sebelum push: `npm run check:parse && npm run check:i18n`.
