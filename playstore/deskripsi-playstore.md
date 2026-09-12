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
• Tafsir per ayat untuk memperdalam pemahaman
• Ukuran teks bisa disesuaikan, nyaman untuk mata
• Terakhir dibaca otomatis tersimpan — lanjutkan kapan saja

🔊 MUROTTAL & MODE KARAOKE
• Pilih qari favorit untuk memutar per ayat
• Mode Karaoke: satu klik memutar satu surah penuh sementara kata yang sedang dibaca tersorot — cocok untuk melatih tilawah
• 14 pilihan qari untuk mode Karaoke, termasuk Mishary Al-Afasy

📥 BACA TANPA INTERNET
• Unduh surah favorit (teks, terjemahan, tafsir) sekali, buka kapan saja
• Unduh audio per surah untuk mendengarkan tanpa kuota
• Opsi "Siapkan Offline" mengunduh seluruh Al-Qur'an sekaligus

📚 DOA & HADITS
• Kumpulan doa harian lengkap dengan teks Arab, latin, dan artinya
• Koleksi hadits dari perawi terpercaya untuk dibaca kapan saja

🕌 PENDUKUNG IBADAH HARIAN
• Jadwal sholat akurat sesuai lokasi, dengan metode perhitungan pilihan
• Notifikasi pengingat waktu sholat — tepat waktu atau beberapa menit sebelumnya, dengan bunyi adzan
• Arah kiblat
• Kalender Hijriyah

✨ JELAJAHI ULAMA & RANTAI SANAD
• Profil ribuan ulama dari zaman Nabi ﷺ hingga generasi berikutnya
• Ketuk nama guru atau murid untuk menjelajah antar ulama
• Visualisasi rantai sanad: telusuri garis guru ulama favoritmu hingga ke sumbernya

🔖 BOOKMARK
• Simpan ayat favorit ke koleksi
• Tab Para (Juz) untuk membaca per juz

Alquranku dibuat sederhana agar siapa pun bisa langsung membaca tanpa bingung. Unduh sekarang dan jadikan setiap hari lebih dekat dengan Al-Qur'an.
```

---

## Aset yang sudah disiapkan (folder `playstore/`)

| File | Ukuran | Fungsi |
|---|---|---|
| `screenshots/01-home.png` | 1080×1920 | Home dashboard (jadwal + menu) |
| `screenshots/02-surah-list.png` | 1080×1920 | Daftar 114 surah |
| `screenshots/03-para.png` | 1080×1920 | Tab Para / Juz |
| `screenshots/04-surah-detail.png` | 1080×1920 | Baca surah (Al-Kahf) |
| `screenshots/05-doa.png` | 1080×1920 | Kumpulan doa |
| `screenshots/06-sholat.png` | 1080×1920 | Jadwal sholat |
| `screenshots/07-ulama.png` | 1080×1920 | Daftar ulama |
| `screenshots/08-sanad.png` | 1080×1920 | Rantai sanad |
| `screenshots/09-settings.png` | 1080×1920 | Pengaturan |
| `feature-graphic.png` | 1024×500 | Banner promo di Play Store |
| `icon-512.png` | 512×512 | Ikon Play Store |

Play Store mengambil ikon dari AAB; `icon-512.png` dipakai saat mengisi listing secara manual.

## Checklist sebelum upload

1. **AAB sudah siap**: `playstore/Alquranku-v1.0.1.aab` (60,5 MB, versi 1.0.1, versionCode 2, tertandatangan release keystore).
2. **Play Console** → Buat aplikasi → isi judul + deskripsi di atas.
3. Upload **9 screenshot** ke tab "Setelan utama listing" (Play Store butuh minimal 2, disarankan 4–8 per kategori perangkat; pilih 4 terbaik: 01, 02, 04, 06 bila ingin ringkas).
4. Upload **feature-graphic.png** dan **icon-512.png**.
5. **Klasifikasi konten**: isi kuesioner (tidak ada konten dewasa/kekerasan) → rating Everyone.
6. **Kebijakan privasi**: wajib berupa URL. Data yang dipakai: lokasi (jadwal sholat/kiblat), penyimpanan (unduhan offline), tidak ada data yang dibagikan ke pihak ketiga untuk iklan. Contoh host gratis: GitHub Pages / Notion publik.
7. **Target audiens**: 13+ (atau pilih sesuai kebijakan).
8. **Data safety form**: deklarasikan lokasi (dipakai untuk jadwal sholat, tidak dibagikan), AsyncStorage lokal (tidak dikumpulkan).
9. Upload AAB ke **produksi / internal testing**, isi catatan rilis, lalu kirim untuk ditinjau.

## Tips agar disetujui cepat

- Jangan gunakan kata "Al-Qur'an terbaik #1" dsb (klaim berlebihan bisa ditolak).
- Deskripsi di atas tidak memakai klaim pemeringkatan — aman.
- Pastikan nama paket di `app.json` (`android.package`) sudah final sebelum build pertama; **tidak bisa diganti** setelah upload.
