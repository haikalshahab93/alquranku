# Listing Play Store — Alquranku

Semua teks di bawah siap copy-paste ke Play Console. Batas karakter sudah diperhitungkan.

---

## Judul aplikasi (maks. 30 karakter)

```
Alquranku: Al-Qur'an & Ibadah
```

## Deskripsi singkat (maks. 80 karakter)

```
Baca Al-Qur'an lengkap: terjemahan, tafsir, audio, doa, hadits & jadwal sholat.
```

## Deskripsi lengkap (maks. 4.000 karakter)

```
Alquranku — Pendamping baca Al-Qur'an harian yang ringkas dan nyaman. Baca dengan terjemahan dan tafsir, dengarkan murottal, latih bacaan dengan Mode Karaoke, dan lengkapi ibadah harianmu: doa, hadits, jadwal sholat, kiblat, dan kalender Hijriyah — semua dalam satu aplikasi.

📖 AL-QUR'AN LENGKAP
• 114 surah dengan teks Arab, latin, dan terjemahan bahasa Indonesia
• Terjemahan bahasa Inggris (Abdel Haleem) untuk belajar dari dua bahasa
• Tafsir per ayat untuk memperdalam pemahaman
• Ukuran teks bisa diperbesar/diperkecil, nyaman untuk mata
• Terakhir dibaca otomatis tersimpan — lanjutkan kapan saja

🔊 MUROTTAL & MODE KARAOKE
• Pilih qari favorit untuk memutar per ayat; ganti qari cukup lewat satu baris dropdown yang rapi
• Mode Karaoke: satu klik memutar satu surah penuh sementara ayat yang sedang dibaca tersorot — cocok untuk melatih tilawah
• 14 pilihan qari untuk mode Karaoke, termasuk Mishary Al-Afasy

📥 BACA TANPA INTERNET
• Unduh surah favorit (teks, terjemahan, tafsir) sekali, buka kapan saja
• Unduh audio semua 114 surah per qari dengan progres per-surah — dengarkan tanpa kuota
• Lihat berapa ruang penyimpanan yang dipakai audio, dan bersihkan dengan satu ketukan
• Opsi "Siapkan Offline" mengunduh seluruh Al-Qur'an sekaligus

📚 DOA & HADITS
• Kumpulan doa harian lengkap dengan teks Arab, latin, dan artinya
• Koleksi hadits dari perawi terpercaya untuk dibaca kapan saja

🕌 PENDUKUNG IBADAH HARIAN
• Jadwal sholat akurat sesuai lokasi, dengan metode perhitungan pilihan
• Notifikasi pengingat waktu sholat dengan bunyi adzan, getar, atau senyap
• Opsi Alarm Tepat & panduan hemat baterai agar pengingat tetap berbunyi di HP Android
• Arah kiblat dengan kompas
• Kalender Hijriyah

✨ JELAJAHI ULAMA & RANTAI SANAD
• Profil ribuan ulama dari zaman Nabi ﷺ hingga generasi berikutnya
• Ketuk nama guru atau murid untuk menjelajah antar ulama
• Visualisasi rantai sanad: telusuri garis guru ulama favoritmu hingga ke sumbernya

🌙 TAMPILAN & BAHASA
• Mode gelap yang segera berlaku di seluruh aplikasi
• Pratinjau jadwal sholat kapan pengingatmu berbunyi
• Tersedia dua bahasa: Indonesia dan English (atau ikuti setelan bahasa HP)

🔖 BOOKMARK
• Simpan ayat favorit ke koleksi (favorit pribadi, rutinitas harian, dll.)
• Ketuk bookmark untuk langsung melompat ke ayatnya
• Tab Para (Juz) untuk membaca per juz

Yang baru:
• Mode gelap, dua bahasa, unduh audio per qari dengan statistik penyimpanan
• Pengaturan dirapikan agar mudah dipahami dan tersusun per kelompok

Alquranku dibuat sederhana agar siapa pun bisa langsung membaca tanpa bingung. Unduh sekarang dan jadikan setiap hari lebih dekat dengan Al-Qur'an.
```

---

## Catatan rilis (What's new) — untuk diisi di Play Console

```
Pembaruan 1.1.0:
• Mode gelap untuk seluruh aplikasi
• Terjemahan bahasa Inggris di samping terjemahan Indonesia
• Unduh audio 114 surah per qari dengan progres dan statistik penyimpanan
• Pilihan qari kini lebih ringkas dan mudah dilihat di HP
• Pengaturan tersusun lebih rapi per kelompok, lebih mudah dicari
• Pengingat sholat: opsi Alarm Tepat & panduan hemat baterai Android
• Perbaikan tampilan dan stabilitas di banyak layar
```

## Status build untuk rilis ini

| Item | Nilai |
|---|---|
| Versi | **1.1.0** (versionCode **11**) |
| AAB | `android/app/build/outputs/bundle/release/app-release.aab` — salinan siap-upload di `playstore/Alquranku-v1.1.0.aab` |
| Penandatangan | Keystore produksi `alquranku-release.jks` (CN=AlQuranku) — fingerprint di [docs/RELEASE-SIGNING.md](../docs/RELEASE-SIGNING.md) |

## Aset yang sudah disiapkan (folder `playstore/`)

| File | Ukuran | Fungsi |
|---|---|---|
| `screenshots/01-home.png` … `09-settings.png` | 1080×1920 | Screenshot listing (minimal 2, disarankan 4–8) |
| `feature-graphic.png` | 1024×500 | Banner promo di Play Store |
| `icon-512.png` | 512×512 | Ikon Play Store |

## Checklist sebelum upload

1. **AAB sudah siap**: `playstore/Alquranku-v1.1.0.aab` (versi 1.1.0, versionCode 11, ditandatangani keystore produksi).
2. **Play Console** → Buat aplikasi → isi judul + deskripsi di atas.
3. Upload **9 screenshot** ke tab "Setelan utama listing"; pilih 4 terbaik bila ingin ringkas: 01, 02, 04, 06.
4. Upload **feature-graphic.png** dan **icon-512.png**.
5. **Klasifikasi konten**: isi kuesioner (tidak ada konten dewasa/kekerasan) → rating Everyone.
6. **Kebijakan privasi**: wajib berupa URL. Data yang dipakai: lokasi (jadwal sholat/kiblat), penyimpanan (unduhan offline), tidak ada data yang dibagikan ke pihak ketiga untuk iklan. Contoh host gratis: GitHub Pages / Notion publik.
7. **Target audiens**: 13+ (atau pilih sesuai kebijakan).
8. **Data safety form**: deklarasikan lokasi (dipakai untuk jadwal sholat, tidak dibagikan), AsyncStorage lokal (tidak dikumpulkan).
9. Saat pertama upload, Play akan menawarkan **Play App Signing**: ikuti (Play yang memakai kunci untuk keamanan; keystore `alquranku-release.jks` Anda tetap jadi upload key) — pelajari dua file backup di [docs/RELEASE-SIGNING.md](../docs/RELEASE-SIGNING.md).
10. Upload AAB ke **Produksi / Internal testing**, isi catatan rilis di atas, lalu kirim untuk ditinjau.

## Tips agar disetujui cepat

- Jangan gunakan kata "Al-Qur'an terbaik #1" dsb (klaim berlebihan bisa ditolak).
- Deskripsi di atas tidak memakai klaim pemeringkatan — aman.
- Pastikan nama paket di `app.json` (`android.package`) sudah final sebelum build pertama; **tidak bisa diganti** setelah upload.
- Account Google Play yang sama harus dipakai terus-menerus (nama developer + aplikasi ikut membatasi jalan keluar di masa depan).
