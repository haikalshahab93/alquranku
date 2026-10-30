# Konfigurasi Build Android (versi otomatis + APK per-ABI)

> **PENTING**: folder `android/` hasil prebuild Expo dan tidak di-git. Jika Anda menjalankan
> `npx expo prebuild --clean -p android`, terapkan kembali tiga penyesuaian di bawah (versi auto-sync,
> splits ABI, dan signing produksi — [docs/RELEASE-SIGNING.md](RELEASE-SIGNING.md)). Semuanya sudah
> diterapkan di `android/app/build.gradle` saat ini.

## 1. Versi otomatis dari `app.json` (jangan edit build.gradle lagi!)

Di dalam blok `android { ... }` — sebelum `defaultConfig`:

```gradle
// versionCode & versionName selalu dibaca dari app.json (sumber kebenaran tunggal).
def appJson = null
try {
    appJson = new groovy.json.JsonSlurper().parseText(file('../../app.json').text)
} catch (Exception e) {
    println "PERINGATAN: app.json tidak ter-baca untuk sync versi ($e.message)"
}
def appJsonVersion      = appJson?.expo?.version
def appJsonVersionCode  = appJson?.expo?.android?.versionCode

namespace 'com.alfarisy.infoalquran'

defaultConfig {
    ...
    versionCode (appJsonVersionCode ?: 1)
    versionName  (appJsonVersion    ?: '1.0.0')
}
```

Lalu, saat kamu merilis: cukup naikkan `expo.version` + `expo.android.versionCode` di `app.json`,
commit, jalankan gradle. Gradle langsung membaca — tidak ada lagi jebakan "APK dibangun dari versi lama".

## 2. APK per-ABI (unduhan lebih kecil ±50%)

```gradle
splits {
    abi {
        enable true
        reset()
        include "armeabi-v7a", "arm64-v8a", "x86_64", "x86"
        universalApk true
    }
}
```

Hasil di `android/app/build/outputs/apk/release/`:

| File | Ukuran | Untuk |
|---|---|---|
| `app-universal-release.apk` | ±127 MB | dibagikan umum (aman semua HP) |
| `app-arm64-v8a-release.apk` | **±66 MB** | HP modern (2016+) |
| `app-armeabi-v7a-release.apk` | ±60 MB | HP tua / low-end |

Semua APK diproduksi dengan keystore yang sama (signing `alquranku`) — bisa saling update
langsung, tinggal pilih yang cocok dengan arsitekturnya. Catatan: jika suatu saat mengunggah APK
per-ABI ke Play Console, versionCode-nya wajib dibedakan per ABI. Untuk Play, pilihan terbaik tetap
AAB (`eas build --profile android-production`) — Play yang memilih pasangan perangkat otomatis.
