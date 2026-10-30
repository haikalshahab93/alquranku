import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAladhanBulananCoords, getAladhanBulananCity, readLastSholatSnapshot, getAladhanHarianCoords, getAladhanHarianCity } from './aladhan';
import { tNow } from './i18n';

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

// Pengingat waktu sholat: notifikasi lokal (Android + iOS)
// Sumber jadwal: Aladhan (jadwal harian/bulanan) yang sudah dimuat HomeScreen.

const ID_PREFIX = 'prayer-';

// Empat channel Android supaya SUARA/getar per-waktu sholat bisa diatur
// masing-masing: Android menerapkan suara & getar lewat channel (bukan per
// notifikasi). Notifikasi masuk channel sesuai modenya:
// default = bunyi sistem, adhan = suara adzan, getar = hanya bergetar,
// silent = tanpa suara & tanpa getar (muncul visual saja).
// NAMA channel dwibahasa: dihitung saat channel dibuat ulang (tiap penjadwalan
// dijalankan lewat ensureAndroidChannels), mengikuti bahasa aplikasi aktif.
const CHANNELS = {
  default: { id: 'prayer-default', nameKey: 'notif.channelDefault', sound: null, vibration: [0, 250, 250, 250] },
  adhan: { id: 'prayer-adhan', nameKey: 'notif.channelAdhan', sound: 'adhan.mp3', vibration: [0, 250, 250, 250] },
  getar: { id: 'prayer-getar', nameKey: 'notif.channelGetar', sound: null, vibration: [0, 400, 250, 400] },
  silent: { id: 'prayer-silent', nameKey: 'notif.channelSilent', sound: null, vibration: null },
};
// Channel lama era sebelum per-waktu; dibuang agar tidak menumpuk
const LEGACY_CHANNEL_ID = 'prayer-reminders';

// CATATAN PENTING: Android TIDAK bisa mengubah sound/vibration suatu channel
// setelah dibuat. Kalau kita hanya "skip bila channel sudah ada", perangkat
// akan selamanya memakai konfigurasi lama — inilah penyebab adzan/getar tidak
// bersuara walau kode sudah mengaturnya. Solusinya: HAPUS lalu BUAT ULANG
// setiap kali penjadwalan berjalan, sehingga channel di perangkat selalu
// sesuai konfigurasi terkini.
export async function ensureAndroidChannels() {
  if (Platform.OS !== 'android') return;
  try {
    const legacy = await Notifications.getNotificationChannelAsync(LEGACY_CHANNEL_ID);
    if (legacy) await Notifications.deleteNotificationChannelAsync(LEGACY_CHANNEL_ID);
  } catch {}
  for (const c of [CHANNELS.default, CHANNELS.adhan, CHANNELS.getar, CHANNELS.silent]) {
    try {
      await Notifications.deleteNotificationChannelAsync(c.id);
    } catch {}
    try {
      await Notifications.setNotificationChannelAsync(c.id, {
        name: tNow(c.nameKey),
        importance: Notifications.AndroidImportance.HIGH,
        sound: c.sound || undefined,
        vibrationPattern: c.vibration || undefined,
        lightColor: '#8b5cf6',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });
    } catch {}
  }
}

// Waktu sholat yang mendapat pengingat (Terbit & Imsak tidak termasuk)
export const PRAYER_KEYS = ['subuh', 'dzuhur', 'ashar', 'maghrib', 'isya'];
export const PRAYER_LABELS = {
  subuh: () => tNow('prayer.subuh'),
  dzuhur: () => tNow('prayer.dzuhur'),
  ashar: () => tNow('prayer.ashar'),
  maghrib: () => tNow('prayer.maghrib'),
  isya: () => tNow('prayer.isya'),
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

// Pilihan mod notifikasi: 'default' (bunyi sistem), 'adhan' (suara adzan custom,
// dibundel via plugin), 'getar' (hanya bergetar), 'silent' (sunyi — visual saja)
export const VALID_SOUND_CHOICES = ['default', 'adhan', 'getar', 'silent'];
export const SOUND_CHOICES = {
  default: { labelKey: 'notif.lblDefault', channelSound: null, contentSound: null },
  adhan: { labelKey: 'notif.lblAdhan', channelSound: 'adhan.mp3', contentSound: 'adhan.mp3' },
  getar: { labelKey: 'notif.lblGetar', channelSound: null, contentSound: null },
  silent: { labelKey: 'notif.lblSunyi', channelSound: null, contentSound: null },
};

// Nilai suara valid untuk normalisasi input (dipakai semua layar)
export const isKnownSound = (v) => VALID_SOUND_CHOICES.includes(v);

// Konversi nilai suara (global atau per-waktu) ke channel Android tujuan.
// 'off' artinya tanpa notifikasi sama sekali → dipakai untuk skip scheduling.
export function resolveEffectiveSound(key, globalSound, perKeySounds) {
  const v = perKeySounds?.[key];
  if (v === 'adhan' || v === 'getar' || v === 'silent' || v === 'off') return v;
  return VALID_SOUND_CHOICES.slice(1).includes(globalSound) ? globalSound : 'default';
}

// Pembaca reusable (dipakai Home, Pengaturan, dan layar Jadwal Sholat supaya
// logika baca setelan tidak berulang-ulang di tiap layar).
// Return: { enabled, offsetMinutes, sound, perKeySounds }
export async function readNotifPrefs() {
  try {
    const [eRaw, oRaw, sRaw] = await Promise.all([
      AsyncStorage.getItem('notif_prayer_enabled'),
      AsyncStorage.getItem('notif_prayer_offset'),
      AsyncStorage.getItem('notif_prayer_sound'),
    ]);
    const offset = Number.isFinite(parseInt(oRaw, 10)) ? parseInt(oRaw, 10) : 0;
    const sound = VALID_SOUND_CHOICES.includes(sRaw) ? sRaw : 'default';
    return { enabled: eRaw !== '0', offsetMinutes: offset, sound, perKeySounds: await readPerKeySounds() };
  } catch {
    return { enabled: true, offsetMinutes: 0, sound: 'default', perKeySounds: {} };
  }
}

// Salin pengaturan suara per-waktu dari AsyncStorage: { subuh: 'adhan', ... }
export async function readPerKeySounds() {
  try {
    const raw = await AsyncStorage.getItem('notif_prayer_perkey');
    const obj = raw ? JSON.parse(raw) : null;
    return (obj && typeof obj === 'object') ? obj : {};
  } catch { return {}; }
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

/* ============================================================
 * KERANGKA REUSABLE: satu lapisan penjadwalan untuk semua mode
 * ============================================================
 * Semua penjadwal (harian berulang "daily", eksak multi-hari "date", fallback
 * offline) memakai kerangka yang sama:
 *   1. prepareScheduling()  → melegitimasi + bersihkan + izin + channel
 *   2. parsePrayerTime()    → "HH:MM (±03)" / "5:53 AM" → { h, m }
 *   3. buildReminderContent() → judul/isi notifikasi untuk satu waktu
 *   4. schedulePrayerNotification() → satu notifikasi terjadwal (channel sesuai
 *      mod suara efektif; 'off' → dilewati)
 * Penjadwal spesifik hanya menyusun daftar waktu & tipenya — tidak menyalin
 * logika notifikasi lagi.
 * ============================================================ */

// Langkah awal bersama: bersihkan jadwal lama, siapkan izin + channel Android.
export async function prepareScheduling() {
  await cancelAllPrayerReminders();
  try { await ensureAndroidChannels(); } catch {}
  const granted = await ensureNotificationPermission();
  return granted;
}

// "HH:MM", "HH:MM (+03)", "H:MM AM/PM" → { h, m } | null
export function parsePrayerTime(t) {
  const s = String(t || '').replace(/\s*\(.*?\)\s*/g, '').trim();
  let m = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (m) {
    let h = parseInt(m[1], 10); const min = parseInt(m[2], 10); const ap = m[3].toUpperCase();
    if (ap === 'PM' && h !== 12) h += 12; if (ap === 'AM' && h === 12) h = 0;
    return { h, m: min };
  }
  m = s.match(/^(\d{1,2}):(\d{2})$/);
  if (m) return { h: parseInt(m[1], 10), m: parseInt(m[2], 10) };
  return null;
}

// Satukan isi notifikasi untuk satu waktu sholat (dipakai semua penjadwal).
// offsetMinutes > 0 berarti pengingat "menjelang" (mis. 5 menit sebelum).
export function buildReminderContent({ key, timeStr, offsetMinutes = 0 }) {
  const label = (typeof PRAYER_LABELS[key] === 'function' ? PRAYER_LABELS[key]() : PRAYER_LABELS[key]) || key;
  const isEarly = (offsetMinutes || 0) > 0;
  const cleanTime = String(timeStr || '').replace(/\s*\(.*?\)\s*/g, '').trim();
  return {
    title: isEarly ? tNow('notif.titleMenjelang', { sholat: label }) : tNow('notif.titleWaktu', { sholat: label }),
    body: isEarly
      ? tNow('notif.bodySebelum', { sholat: label, w: cleanTime, n: offsetMinutes })
      : tNow('notif.bodyTepat', { sholat: label, w: cleanTime }),
  };
}

// SATU notifikasi terjadwal untuk satu waktu sholat — kerangka utama.
// mode:
//   - daily : { daily: true, hour, minute } → berulang otomatis tiap hari
//   - exact : { when: Date }                → eksak pada satu momen
// Suara efektif ditentukan di luar (resolveEffectiveSound) lalu notifikasi
// masuk channel Android yang cocok. 'off' → dilewati (return false).
export async function schedulePrayerNotification({ identifier, key, timeStr, eff, offsetMinutes = 0, daily = false, hour, minute, when, }) {
  if (!daily && !(when instanceof Date)) return false;
  const content = buildReminderContent({ key, timeStr, offsetMinutes });
  try {
    const trigger = daily
      ? { type: 'daily', hour, minute, channelId: CHANNELS[eff]?.id || CHANNELS.default.id }
      : { type: 'date', date: when, channelId: CHANNELS[eff]?.id || CHANNELS.default.id };
    await Notifications.scheduleNotificationAsync({
      identifier,
      content: { ...content, sound: SOUND_CHOICES[eff]?.contentSound || undefined, color: '#8b5cf6' },
      trigger,
    });
    return true;
  } catch (e) {
    return false; // lanjut ke waktu berikutnya; penelepon menghitung sukseanya
  }
}

// Jadwalkan pengingat berulang harian untuk setiap waktu sholat (iOS &
// fallback Android). offsetMinutes: berapa menit SEBELUM waktu sholat
// notifikasi muncul (0 = tepat waktu).
export async function schedulePrayerReminders({ jadwal, offsetMinutes = 0, enabled = true, soundChoice = 'default', perKeySounds = {} }) {
  if (Platform.OS === 'web') return { scheduled: 0, reason: 'web' };
  if (!enabled) { await cancelAllPrayerReminders(); return { scheduled: 0, reason: 'disabled' }; }

  const granted = await prepareScheduling();
  if (!granted) return { scheduled: 0, reason: 'permission' };

  let count = 0;
  for (const key of PRAYER_KEYS) {
    const timeStr = jadwal?.[key];
    if (!timeStr) continue;
    const hm = parsePrayerTime(timeStr);
    if (!hm) continue;

    // Terapkan offset "menit sebelum" lalu normalisasi ke 0..1439
    const total = (((hm.h * 60 + hm.m) - (offsetMinutes || 0)) % 1440 + 1440) % 1440;
    const hour = Math.floor(total / 60);
    const minute = total % 60;

    // Suara per-waktu (ikut setelan global bila tak ada override); 'off' ditimpa
    const eff = resolveEffectiveSound(key, soundChoice, perKeySounds);
    if (eff === 'off') continue;
    const ok = await schedulePrayerNotification({
      identifier: `${ID_PREFIX}${key}`,
      key, timeStr, eff, offsetMinutes,
      daily: true, hour, minute,
    });
    if (ok) count += 1;
  }
  return { scheduled: count };
}

/* ===================== JADWAL MULTI-HARI EKSAK (Android) =====================
 * Keterbatasan jadwal harian berulang (type 'daily'): waktunya terkunci di jam
 * hari penjadwalan, padahal waktu sholat bergeser tiap hari. Android bisa
 * menjadwalkan banyak notifikasi EKSAK (± 5 waktu × N hari, masih di bawah
 * batas ~500 alarm per aplikasi) dan kita membatalkannya + menjadwalkan ulang
 * setiap aplikasi dibuka — semuanya lewat kerangka reusable di atas.
 * NOTE: iOS membatasi 64 notifikasi terjadwal; karena itu di iOS jangan pakai
 * ini — pakai "daily" repeat (lihat schedulePrayerReminders).
 * ================================ */

// ISO lokal "YYYY-MM-DD" dari Date (zona waktu perangkat)
export function localIso(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Jadwalkan notifikasi EKSAK per hari (trigger "date"). days: [{ iso, jadwal }]
// di mana jadwal sudah berformat kolom harian API (subuh/dzuhur/ashar/maghrib/isya).
export async function schedulePrayerRemindersMultiDay({ days, offsetMinutes = 0, enabled = true, soundChoice = 'default', perKeySounds = {} }) {
  if (Platform.OS === 'web') return { scheduled: 0, reason: 'web' };
  if (!enabled) { await cancelAllPrayerReminders(); return { scheduled: 0, reason: 'disabled' }; }

  const granted = await prepareScheduling();
  if (!granted) return { scheduled: 0, reason: 'permission' };

  const nowMs = Date.now();
  let count = 0;
  for (const day of days || []) {
    const iso = String(day?.iso || '');
    const jm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    if (!jm || !day?.jadwal) continue;
    const yyyy = parseInt(jm[1], 10), mo = parseInt(jm[2], 10), dd = parseInt(jm[3], 10);
    for (const key of PRAYER_KEYS) {
      const hm = parsePrayerTime(day.jadwal[key]);
      const timeStr = String(day.jadwal[key] || '').replace(/\s*\(.*?\)\s*/g, '').trim();
      if (!hm || !timeStr) continue;
      const when = new Date(yyyy, mo - 1, dd, hm.h, hm.m, 0, 0);
      when.setMinutes(when.getMinutes() - (offsetMinutes || 0));
      if (when.getTime() <= nowMs) continue; // hanya masa depan

      const eff = resolveEffectiveSound(key, soundChoice, perKeySounds);
      if (eff === 'off') continue;
      const ok = await schedulePrayerNotification({
        identifier: `${ID_PREFIX}${key}-${iso}`,
        key, timeStr, eff, offsetMinutes,
        when,
      });
      if (ok) count += 1;
    }
  }
  try { await AsyncStorage.setItem('notif:prayer:lastRefresh', String(Date.now())); } catch {}
  return { scheduled: count };
}

/* ========= PERHARAHALAN OTOMATIS: pengingat dari jadwal bulanan ========== */
export async function refreshPrayerReminderSchedule({ lat, lon, city, country, options = {}, offsetMinutes = 0, enabled = true, soundChoice = 'default', daysAhead = 40 }) {
  // Web: tidak ada notifikasi lokal API
  if (Platform.OS === 'web') return { scheduled: 0, reason: 'web' };

  // Saat dimatikan: cukup cancel semua
  if (!enabled) {
    try { await schedulePrayerReminders({ enabled: false }); } catch {}
    return { scheduled: 0, reason: 'disabled' };
  }

  try {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysAhead);
    // Bulan yang perlu diambil untuk mencakup rentang yang diminta
    const months = [];
    const first = new Date(start.getFullYear(), start.getMonth(), 1);
    months.push({ y: first.getFullYear(), m: first.getMonth() + 1 });
    if (end.getMonth() !== start.getMonth() || end.getFullYear() !== start.getFullYear()) {
      months.push({ y: end.getFullYear(), m: end.getMonth() + 1 });
    }

    // Ambil jadwal bulanan (fallback harian bila yang bulanan kosong/gagal)
    const byIso = {};
    for (const month of months) {
      try {
        const res = (lat != null && lon != null)
          ? await getAladhanBulananCoords(lat, lon, month.y, month.m, options)
          : await getAladhanBulananCity(String(city || ''), String(country || ''), month.y, month.m, options);
        for (const item of res?.data || []) {
          let iso = String(item?.masihi || '').replace(/\u0000/g, '');
          const dmy = /^(\d{2})-(\d{2})-(\d{4})$/.exec(iso);
          if (dmy) iso = `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
          if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) continue;
          const jadwal = {
            imsak: item.imsak, subuh: item.subuh, terbit: item.terbit,
            dzuhur: item.dzuhur, ashar: item.ashar, maghrib: item.maghrib,
            isya: item.isya, sunset: item.sunset,
          };
          if (jadwal.subuh || jadwal.dzuhur) byIso[iso] = { iso, jadwal };
        }
      } catch (e2) { /* bulan gagal, lanjut bulan lain */ }
    }

    if (Platform.OS === 'android') {
      const days = [];
      for (let i = 0; i <= daysAhead; i++) {
        const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
        const iso = localIso(d);
        if (byIso[iso]) days.push(byIso[iso]);
      }
      if (days.length > 1) {
        const r = await schedulePrayerRemindersMultiDay({ days, offsetMinutes, enabled, soundChoice, perKeySounds });
        if (r?.scheduled > 0) return r;
      }
    }

    // iOS / tidak cukup data bulanan: pengulangan harian dari jadwal hari ini
    const todayIso = localIso(start);
    let todayJadwal = byIso[todayIso]?.jadwal || null;
    if (!todayJadwal && lat != null && lon != null) {
      try { todayJadwal = (await getAladhanHarianCoords(lat, lon, todayIso, options))?.data?.jadwal || null; } catch {}
    } else if (!todayJadwal && city && country) {
      try { todayJadwal = (await getAladhanHarianCity(city, country, todayIso, options))?.data?.jadwal || null; } catch {}
    }
    if (!todayJadwal) {
      try { todayJadwal = (await readLastSholatSnapshot())?.jadwal || null; } catch {}
    }
    if (!todayJadwal) return { scheduled: 0, reason: 'no-data' };
    const day = await schedulePrayerReminders({ jadwal: todayJadwal, offsetMinutes, enabled, soundChoice, perKeySounds });
    return day;
  } catch (e) {
    // Fallback: pakai snapshot terakhir yang tersimpan
    try {
      const snap = await readLastSholatSnapshot();
      return await schedulePrayerReminders({ jadwal: snap?.jadwal, offsetMinutes, enabled, soundChoice, perKeySounds });
    } catch { return { scheduled: 0, reason: 'no-data' }; }
  }
}
