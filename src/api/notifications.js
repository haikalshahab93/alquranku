import { Platform } from 'react-native';

// PENTING: expo-notifications HANYA dievaluasi di native. Di web, modul itu
// mendaftarkan listener push token saat boot dan memicu warning
// "[expo-notifications] Listening to push token changes is not yet fully
// supported on web" — notifikasi lokal memang tidak didukung di browser.
// Stub di bawah menjaga API modul ini tetap aman dipanggil dari mana saja.
let Notifications;
if (Platform.OS !== 'web') {
  Notifications = require('expo-notifications');
} else {
  const noopAsync = async () => undefined;
  Notifications = {
    setNotificationHandler: () => {},
    getPermissionsAsync: noopAsync,
    requestPermissionsAsync: noopAsync,
    getAllScheduledNotificationsAsync: async () => [],
    cancelScheduledNotificationAsync: noopAsync,
    getNotificationChannelAsync: noopAsync,
    deleteNotificationChannelAsync: noopAsync,
    setNotificationChannelAsync: noopAsync,
    scheduleNotificationAsync: noopAsync,
    AndroidImportance: { HIGH: 4 },
    AndroidNotificationVisibility: { PUBLIC: 1 },
  };
}

// Pengingat waktu sholat: notifikasi lokal harian berulang (Android + iOS)
// Sumber jadwal: Aladhan (jadwal harian) yang sudah dimuat HomeScreen.

const CHANNEL_ID = 'prayer-reminders';
const ID_PREFIX = 'prayer-';

// Waktu sholat yang mendapat pengingat (Terbit & Imsak tidak termasuk)
export const PRAYER_KEYS = ['subuh', 'dzuhur', 'ashar', 'maghrib', 'isya'];
export const PRAYER_LABELS = {
  subuh: 'Subuh',
  dzuhur: 'Dzuhur',
  ashar: 'Ashar',
  maghrib: 'Maghrib',
  isya: 'Isya',
};

// Handler agar notifikasi tampil saat aplikasi sedang dibuka (foreground)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Pilihan suara pengingat: 'default' (bunyi sistem) atau 'adhan' (custom, dibundel via plugin)
export const SOUND_CHOICES = {
  default: { label: 'Bunyi Default', channelSound: 'default', contentSound: 'default' },
  adhan: { label: 'Adzan', channelSound: 'adhan.wav', contentSound: 'adhan.wav' },
};

async function ensureAndroidChannel(soundChoice = 'default') {
  if (Platform.OS !== 'android') return;
  const wantCustom = soundChoice === 'adhan';
  // Android hanya menerapkan perubahan channel yang sudah ada; buat ulang jika jenis suara berubah
  try {
    const existing = await Notifications.getNotificationChannelAsync(CHANNEL_ID);
    if (existing) {
      const matches = (existing.sound === 'custom') === wantCustom;
      if (matches) return;
      await Notifications.deleteNotificationChannelAsync(CHANNEL_ID);
    }
  } catch {}
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Pengingat Waktu Sholat',
    importance: Notifications.AndroidImportance.HIGH,
    sound: SOUND_CHOICES[soundChoice]?.channelSound || 'default',
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#8b5cf6',
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
}

export async function ensureNotificationPermission() {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current?.granted) return true;
    if (current?.canAskAgain) {
      const req = await Notifications.requestPermissionsAsync();
      return !!req?.granted;
    }
    return false;
  } catch (e) {
    return false;
  }
}

// Batalkan semua notifikasi pengingat yang pernah dijadwalkan
export async function cancelAllPrayerReminders() {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of scheduled || []) {
      const id = String(n?.identifier || '');
      if (id.startsWith(ID_PREFIX)) {
        try { await Notifications.cancelScheduledNotificationAsync(id); } catch {}
      }
    }
  } catch {}
}

// Jadwalkan pengingat harian berulang untuk setiap waktu sholat.
// offsetMinutes: berapa menit SEBELUM waktu sholat notifikasi muncul (0 = tepat waktu).
// soundChoice: 'default' (bunyi sistem) atau 'adhan' (suara adzan custom).
export async function schedulePrayerReminders({ jadwal, offsetMinutes = 0, enabled = true, soundChoice = 'default' }) {
  if (Platform.OS === 'web') return { scheduled: 0, reason: 'web' };

  // Selalu bersihkan jadwal lama agar tidak menumpuk/duplikat
  await cancelAllPrayerReminders();
  if (!enabled) return { scheduled: 0, reason: 'disabled' };

  try { await ensureAndroidChannel(soundChoice); } catch {}
  const contentSound = SOUND_CHOICES[soundChoice]?.contentSound || 'default';
  const granted = await ensureNotificationPermission();
  if (!granted) return { scheduled: 0, reason: 'permission' };

  let count = 0;
  for (const key of PRAYER_KEYS) {
    const timeStr = jadwal?.[key];
    if (!timeStr) continue;
    const parts = String(timeStr).split(':').map((x) => parseInt(x, 10));
    const hh = parts[0];
    const mm = parts[1];
    if (Number.isNaN(hh) || Number.isNaN(mm)) continue;

    // Terapkan offset "menit sebelum" lalu normalisasi ke 0..1439
    const total = (((hh * 60 + mm) - (offsetMinutes || 0)) % 1440 + 1440) % 1440;
    const hour = Math.floor(total / 60);
    const minute = total % 60;
    const label = PRAYER_LABELS[key] || key;
    const isEarly = (offsetMinutes || 0) > 0;

    try {
      await Notifications.scheduleNotificationAsync({
        identifier: `${ID_PREFIX}${key}`,
        content: {
          title: isEarly ? `Menjelang ${label}` : `Waktu ${label}`,
          body: isEarly
            ? `${label} pukul ${timeStr}. Tinggal ± ${offsetMinutes} menit lagi — mari bersiap.`
            : `Sudah masuk waktu ${label} (pukul ${timeStr}). Yuk salat!`,
          sound: contentSound,
          color: '#8b5cf6',
        },
        trigger: {
          type: 'calendar',
          hour,
          minute,
          second: 0,
          repeats: true,
          channelId: CHANNEL_ID,
        },
      });
      count += 1;
    } catch (e) {
      // lanjut ke waktu berikutnya
    }
  }
  return { scheduled: count };
}
