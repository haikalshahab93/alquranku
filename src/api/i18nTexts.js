// ============================================================
// KAMUS DWIBAHASA (ID/EN)
// ============================================================
// Format: { kunci: { id: '...', en: '...' } }
// Ketentuan penamaan kunci: kelompokAlasan.arti, mis. nav.home.
// Tambah materi baru = tambah entri di sini saja (kerangka di i18n.js
// tidak perlu disentuh). Kunci tanpa 'en' otomatis jatuh ke teks Indonesia.
// ============================================================

export const PLATFORM_LANG_VALUE = ['system', 'id', 'en'];

export const TEXTS = {
  // ---------- Navigasi bawah ----------
  'nav.home': { id: 'Home', en: 'Home' },
  'nav.quran': { id: "Al-Qur'an", en: "Al-Qur'an" },
  'nav.bookmark': { id: 'Bookmark', en: 'Bookmark' },
  'nav.profile': { id: 'Profil', en: 'Profile' },
  'nav.settings': { id: 'Pengaturan', en: 'Settings' },
  'nav.back': { id: 'Kembali', en: 'Back' },

  // ---------- App umum ----------
  'app.appName': { id: 'ALQURANKU', en: 'ALQURANKU' },
  'app.tagline': { id: "Pendamping baca Al-Qur'an harian", en: "Your daily Al-Qur'an reading companion" },
  'app.loginBypass': { id: 'Layar Login dibypass. Gunakan Home.', en: 'Login screen is bypassed. Use Home.' },
  'app.toHome': { id: 'Ke Home', en: 'To Home' },
  'app.screenError': { id: 'Terjadi kesalahan di layar ini', en: 'Something went wrong on this screen' },
  'app.tryAgain': { id: 'Coba Lagi', en: 'Try Again' },
  'app.backHome': { id: 'Kembali ke Home', en: 'Back to Home' },
  'app.pageNotAvailable': { id: 'Halaman belum tersedia.', en: 'This page is not available yet.' },
  'app.backToPrev': { id: 'Kembali', en: 'Back' },
  'app.llmHidden': { id: 'Fitur Asisten LLM disembunyikan sementara.', en: 'The AI assistant is temporarily hidden.' },

  // ---------- Home ----------
  'home.readNow': { id: 'Baca sekarang', en: 'Read now' },
  'home.continueReading': { id: 'Lanjutkan pembacaan', en: 'Continue reading' },
  'home.nextPrayer': { id: 'Waktu berikutnya', en: 'Next prayer' },
  'home.loading': { id: 'Memuat…', en: 'Loading…' },
  'home.todaySchedule': { id: 'Jadwal hari ini', en: "Today's schedule" },
  'home.refresh': { id: 'Muat ulang', en: 'Refresh' },
  'home.offlineNotice': { id: 'Perangkat offline — menampilkan jadwal terakhir', en: 'Offline — showing the last saved schedule' },

  // ---------- Jadwal Sholat ----------
  'sholat.title': { id: 'Jadwal Sholat', en: 'Prayer Schedule' },
  'sholat.now': { id: 'Sekarang', en: 'Now' },

  'sholat.minutesLeft': { id: '{m} menit lagi', en: '{m} min left' },
  'sholat.hoursLeft': { id: '{h} jam {m} menit lagi', en: '{h} h {m} min left' },
  'sholat.nowShort': { id: 'Now', en: 'Now' },
  'sholat.prayers': { id: 'Sholat', en: 'Prayers' },
  'sholat.hijri': { id: 'Hijri', en: 'Hijri' },
  'sholat.detectingLocation': { id: 'Mendeteksi lokasi…', en: 'Detecting location…' },
  'sholat.timezoneNow': { id: 'Zona waktu (sekarang)', en: 'Time zone (device)' },
  'sholat.timezoneApi': { id: 'Zona waktu (API)', en: 'Time zone (API)' },
  'sholat.coords': { id: 'Koordinat', en: 'Coordinates' },
  'sholat.method': { id: 'Metode', en: 'Method' },
  'sholat.offlineSchedule': { id: 'Menampilkan jadwal terakhir (perangkat offline / internet belum aktif)', en: "Showing the last schedule (device offline / internet not active)" },
  'sholat.soundTip': { id: 'Ketuk ikon suara untuk mengatur tiap waktu: ikut Pengaturan → adzan → bunyi biasa → getar → sunyi → matikan notifikasi.', en: 'Tap the sound icon to set each prayer time: follow Settings → adzan → normal sound → vibrate → silent → off.' },
  'sholat.offNotice': { id: 'Notifikasi mati', en: 'Notifications off' },
  'sholat.followSettings': { id: 'Ikut Pengaturan', en: 'Follow Settings' },
  'sholat.adhanSound': { id: 'Suara adzan', en: 'Adhan sound' },
  'sholat.defaultSound': { id: 'Bunyi biasa (suara sistem)', en: 'Normal sound (system)' },
  'sholat.vibrateOnly': { id: 'Getar saja', en: 'Vibrate only' },
  'sholat.silentMode': { id: 'Sunyi (tanpa suara & getar)', en: 'Silent (no sound & vibration)' },
  'sholat.popupEnterTime': { id: 'Masuk waktu', en: 'Prayer time' },
  'sholat.popupBody': { id: 'Pukul {time} — mari salat tepat waktu.', en: 'At {time} — let us pray on time.' },
  'sholat.muteSound': { id: 'Matikan Suara', en: 'Mute' },
  'sholat.playAdhan': { id: 'Putar Adzan', en: 'Play Adhan' },
  'sholat.outdatedSchedule': { id: 'Menampilkan jadwal terakhir (perangkat offline / internet belum aktif)', en: 'Showing the last schedule (device offline / internet not active)' },

  // ---------- Pengaturan ----------
  'settings.title': { id: 'Pengaturan', en: 'Settings' },
  'settings.language': { id: 'Bahasa aplikasi', en: 'App language' },
  'settings.langSystem': { id: 'Ikuti HP', en: 'Follow device' },
  'settings.langId': { id: 'Indonesia', en: 'Indonesia' },
  'settings.langEn': { id: 'English', en: 'English' },
  'settings.langDesc': { id: 'Bahasa awal mengikuti bahasa HP; pilih manual untuk menimpanya.', en: 'Starts with your device language; choose manually to override it.' },
  'settings.notifications': { id: 'Notifikasi', en: 'Notifications' },
  'settings.appearance': { id: 'Tampilan', en: 'Appearance' },
  'settings.appearanceDesc': { id: 'Mode terang/gelap dan skala font untuk ayat & tafsir.', en: 'Light/dark mode and font scale for verses & tafsir.' },
  'settings.storage': { id: 'Penyimpanan', en: 'Storage' },
  'settings.about': { id: 'Tentang', en: 'About' },

  // ---------- Bookmark / Al-Quran ----------
  'quran.bookmarks': { id: 'Bookmark', en: 'Bookmarks' },
  'quran.noBookmarks': { id: 'Belum ada bookmark', en: 'No bookmarks yet' },
  'quran.newCollection': { id: 'Koleksi Baru', en: 'New Collection' },
  'quran.favorite': { id: 'My Favorite', en: 'My Favorite' },
  'quran.clearAll': { id: 'Hapus Semua', en: 'Clear All' },
  'quran.collection': { id: 'Koleksi', en: 'Collection' },
  'quran.verse': { id: 'Ayat {n}', en: 'Verse {n}' },
  'quran.surahN': { id: 'Surah {n}', en: 'Surah {n}' },

  // ---------- Umum ----------
  'common.delete': { id: 'Hapus', en: 'Delete' },
  'common.save': { id: 'Simpan', en: 'Save' },
  'common.close': { id: 'Tutup', en: 'Close' },
  'common.cancel': { id: 'Batal', en: 'Cancel' },
  'common.error': { id: 'Terjadi kesalahan', en: 'Something went wrong' },
  'common.online': { id: 'Terhubung', en: 'Connected' },
  'common.offline': { id: 'Offline', en: 'Offline' },
  'common.fromCache': { id: 'Dari cache', en: 'From cache' },
};
