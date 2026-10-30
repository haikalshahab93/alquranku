# Signing Produksi Android (AlQuranku)

Dokumen ini menjelaskan cara identity release aplikasi bekerja dan **cara memulihkan bila hilang**.
Baca penting: keystore produksi = identitas permanen aplikasi. **Hilang kunci = tidak bisa update
di atas versi lama**, dan Play Console menuntut kunci yang sama seumur hidup. Lakkukan backup sebelum
melanjutkan apa pun.

## Lokasi file (di komputer pengembang)

| File | Isi | Di-git? |
|---|---|---|
| `android/app/alquranku-release.jks` | Keystore RSA 4096 bit, alias `alquranku`, masa berlaku 10.000 hari | ❌ (di-gitignore `*.jks`) |
| `android/app/keystore.properties` | Password + alias keystore (plaintext) | ❌ (di-gitignore `keystore.properties`) |

> Password & alias TIDAK boleh di-commit dan TIDAK boleh muncul di chat/issue. Mereka sudah
> dituliskan di `keystore.properties` di mesin pembuat kunci. **Salin kedua file di atas ke
> penyimpanan aman (cloud drive ber-password / password manager) lalu simpan salinan kedua di
> tempat terpisah.** Hilang = permanen.

## Integrasi build

`android/app/build.gradle` mengonfigurasi `signingConfigs.release` dengan membaca
`app/keystore.properties`:

```gradle
def keystorePropertiesFile = rootProject.file("app/keystore.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystorePropertiesFile.withInputStream { keystoreProperties.load(it) }
    println "Signing: memakai keystore produksi '${keystoreProperties['keyAlias']}'"
} else {
    println "PERINGATAN: app/keystore.properties tidak ada - APK release akan memakai DEBUG keystore!"
}
// ...
signingConfigs {
    debug { ... }
    if (keystorePropertiesFile.exists()) {
        release {
            storeFile file(keystoreProperties['storeFile'])
            storePassword keystoreProperties['storePassword']
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
        }
    }
}
buildTypes {
    release {
        signingConfig keystorePropertiesFile.exists() ? signingConfigs.release : signingConfigs.debug
        // ...
    }
}
```

Catatan: folder `android/` di-gitignore (hasil prebuild Expo). Bila suatu saat Anda menjalankan
`npx expo prebuild --clean -p android`, terapkan ulang blok di atas di `build.gradle` yang digenerate,
lalu salin kembali `.jks` + `keystore.properties` di folder yang sama.

## Sidik jari sertifikat release (untuk Play Console / Google OAuth)

Dari `apksigner verify --print-certs` atas APK `1.0.8 (10)`:

```
Signer #1 certificate DN: CN=AlQuranku, OU=Mobile, O=Al-Farisy, L=Jakarta, ST=Jakarta, C=ID
SHA-256: 5C:72:93:0B... (lihat perintah ulang di bawah)
```

Ambil nilai setiap kali dibutuhkan (aman, bukan rahasia):

```bash
BT="$(ls -d $LOCALAPPDATA/Android/Sdk/build-tools/* | tail -1)"
"$BT/apksigner" verify --print-certs android/app/build/outputs/apk/release/app-release.apk
```

- **Play Console → App signing**: saat pertama upload AAB, Play menawarkan "Use signing key from
  app bundle / reference". Pemegang key identity tetap .jks ini; Play menyimpan catatan.
- **Google OAuth (Android client)** di `app.config.js`: masukkan SHA-1/SHA-256 di atas sebagai akhir
  dari atas ClientID yang dipakai agar login Google di build Android terverifikasi.

## Cara kerja release (permintaan update aman)

1. Pastikan versi & versionCode sesuai pada `android/app/build.gradle` & `app.json` (lihat bagian
   versi di README).
2. Build APK instalasi langsung: `$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"; cd android; ./gradlew assembleRelease`
3. Konfirmasi baris "Signing: memakai keystore produksi 'alquranku'" pada output. **Jika memunculkan
   `PERINGATAN ... DEBUG keystore`, berhenti dan siapkan file properties dulu.**
4. Apakah sedilikat taksu? Sebelum sebar APK di luar pengembang: uji instalin di atas versi lama di HP
   seharusnya berhasil (signature match).

## Reset bila file properties hilang tapi .jks ada

Password tidak bisa dipulihkan (disimpan hanya di `keystore.properties` dan backup Anda). Jika Anda
masih ingat: tuliskan ulang ke file properties di atas.

## Checklist rilis cepat

- [ ] Backup 2 file kunci ke 2 lokasi berbeda (cloud + fisik).
- [ ] `keystore.properties` TIDAK muncul di `git status` / `git ls-files`.
- [ ] Output gradle mencantumkan "keystore produksi 'alquranku'".
- [ ] `apksigner verify --print-certs`ampilkan kartu CN=AlQuranku, bukan Android Debug.
- [ ] versionCode naik & `app.json` sinkron.
