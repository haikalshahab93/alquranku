import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Platform, Modal } from 'react-native';
import { theme, getPalette } from '../../ui';
import { useAppearance } from '../../api/appearance';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getAladhanHarianCity, getAladhanHarianCoords, readLastSholatSnapshot } from '../../api/aladhan';
import { refreshPrayerReminderSchedule } from '../../api/notifications';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { onSettingsChanged } from '../../api/settingsEvents';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Suara adzan custom (dibundel via plugin) — dipakai popup "masuk waktu"
const ADHAN_SOURCE = require('../../../assets/sounds/adhan.mp3');

const keys = ['imsak', 'subuh', 'terbit', 'dzuhur', 'ashar', 'maghrib', 'sunset', 'isya', 'midnight'];
const keysActive = ['imsak', 'subuh', 'terbit', 'dzuhur', 'ashar', 'maghrib', 'sunset', 'isya'];
const keysFull = ['imsak', 'subuh', 'terbit', 'dzuhur', 'ashar', 'maghrib', 'sunset', 'isya', 'midnight', 'firstthird', 'lastthird'];
const labels = { imsak: 'Imsak', subuh: 'Fajr', terbit: 'Shuruq', dzuhur: 'Dhuhr', ashar: 'Asr', maghrib: 'Maghrib', sunset: 'Sunset', isya: 'Isha', midnight: 'Qiyam', firstthird: 'First Third', lastthird: 'Last Third' };
const displayFromApi = (t) => String(t || '').replace(/\s*\(.*?\)\s*/g, '').trim();
const parse = (t, base) => {
  if (!t) return null;
  const s = displayFromApi(t); // remove any (XX) suffix
  // supports formats like "05:53", "05:53 AM", "17:30", etc.
  const m12 = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  const m24 = s.match(/^(\d{1,2}):(\d{2})$/);
  const d = new Date(base);
  if (m12) {
    let h = parseInt(m12[1], 10); const min = parseInt(m12[2], 10); const ap = m12[3].toUpperCase();
    if (ap === 'PM' && h !== 12) h += 12; if (ap === 'AM' && h === 12) h = 0;
    d.setHours(h, min, 0, 0); return d;
  } else if (m24) {
    const h = parseInt(m24[1], 10); const min = parseInt(m24[2], 10);
    d.setHours(h, min, 0, 0); return d;
  }
  return null;
};
const fmtTime = d => {
  try {
    const opts = Intl.DateTimeFormat(undefined, { hour: 'numeric' }).resolvedOptions();
    const hour12 = typeof opts.hour12 === 'boolean' ? opts.hour12 : false;
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12 });
  } catch (e) {
    const h = ('0' + d.getHours()).slice(-2);
    const m = ('0' + d.getMinutes()).slice(-2);
    return `${h}:${m}`;
  }
};

const SHOLAT_SETTINGS = {
  method: 'settings:sholat:method',
  tz: 'settings:sholat:timezonestring',
  tune: 'settings:sholat:tune',
};

// Kunci penyimpanan lokasi terakhir + masa berlaku (6 jam)
const LAST_LOCATION_KEY = 'last_known_location';
const LAST_LOCATION_MAX_AGE_MS = 6 * 60 * 60 * 1000;

// Lokasi cadangan terakhir jika GPS ditolak DAN fallback IP gagal. Ubah sesuai kebutuhan.
const DEFAULT_LOCATION = { city: 'Jakarta', country: 'Indonesia' };

// Geolocation web yang tidak melempar error saat ditolak/timeout (hasilnya null)
const getWebPosition = () => new Promise((resolve) => {
  if (typeof navigator === 'undefined' || !('geolocation' in navigator)) return resolve(null);
  navigator.geolocation.getCurrentPosition(
    resolve,
    () => resolve(null), // ditolak / timeout / tidak tersedia
    { enableHighAccuracy: true, timeout: 10000 }
  );
});

export default function SholatJadwalScreen() {
  const { darkMode } = useAppearance();
  const pal = getPalette(darkMode);

  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [data, setData] = useState(null);
  const [now, setNow] = useState(new Date());
  const [lat, setLat] = useState(null);
  const [lon, setLon] = useState(null);
  // Popup "masuk waktu sholat" + pemutar adzan
  const [popup, setPopup] = useState(null); // { key, label, display }
  const [notifSound, setNotifSound] = useState('default');
  const [notifEnabled, setNotifEnabled] = useState(true);

  // Suara per-waktu sholat: { subuh: 'adhan'|'silent'|'off' } (tanpa kunci =
  // ikut pilihan global di Pengaturan). Disetel lewat ikon 🔊 di tiap baris.
  const [perKeySounds, setPerKeySounds] = useState({});
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('notif_prayer_perkey');
        const obj = raw ? JSON.parse(raw) : null;
        if (obj && typeof obj === 'object') setPerKeySounds(obj);
      } catch {}
    })();
  }, []);

  // Nilai suara efektif untuk satu waktu sholat: override per-waktu, atau global
  const resolveKeySound = (key) => {
    const v = perKeySounds?.[key];
    if (v === 'adhan' || v === 'getar' || v === 'silent' || v === 'off') return v;
    return ['adhan', 'getar', 'silent'].includes(notifSound) ? notifSound : 'default';
  };

  // Siklus: (ikut global) → adzan → bunyi biasa → getar → sunyi → mati → kembali
  const CYCLE = [null, 'adhan', 'default', 'getar', 'silent', 'off'];
  const cycleKeySound = (key) => {
    const cur = perKeySounds?.[key] || null;
    const next = CYCLE[(CYCLE.indexOf(cur) + 1) % CYCLE.length];
    const obj = { ...(perKeySounds || {}) };
    if (next == null) delete obj[key]; else obj[key] = next;
    setPerKeySounds(obj);
    try { AsyncStorage.setItem('notif_prayer_perkey', JSON.stringify(obj)); } catch {}
  };

  // Settings
  const [method, setMethod] = useState(3);
  const [tzString, setTzString] = useState('');
  const [tune, setTune] = useState('');
  const [school, setSchool] = useState('');
  const [midnightMode, setMidnightMode] = useState('');
  const [latitudeAdjustmentMethod, setLatitudeAdjustmentMethod] = useState('');
  const [calendarMethod, setCalendarMethod] = useState('');
  const [shafaq, setShafaq] = useState('');

  const loadSettings = async () => {
    try {
      const [m1, tz1, tn1, sc1, mm1, lam1, cm1, sf1] = await Promise.all([
        AsyncStorage.getItem('aladhan_method'),
        AsyncStorage.getItem('aladhan_timezonestring'),
        AsyncStorage.getItem('aladhan_tune'),
        AsyncStorage.getItem('aladhan_school'),
        AsyncStorage.getItem('aladhan_midnightMode'),
        AsyncStorage.getItem('aladhan_latitudeAdjustmentMethod'),
        AsyncStorage.getItem('aladhan_calendarMethod'),
        AsyncStorage.getItem('aladhan_shafaq'),
      ]);
      const [m2, tz2, tn2] = await Promise.all([
        AsyncStorage.getItem(SHOLAT_SETTINGS.method),
        AsyncStorage.getItem(SHOLAT_SETTINGS.tz),
        AsyncStorage.getItem(SHOLAT_SETTINGS.tune),
      ]);
      const m = m1 ?? m2; const tz = tz1 ?? tz2; const tn = tn1 ?? tn2;
      if (m != null) setMethod(Number(m));
      if (tz != null) setTzString(tz);
      if (tn != null) setTune(tn);
      if (sc1 != null) setSchool(sc1);
      if (mm1 != null) setMidnightMode(mm1);
      if (lam1 != null) setLatitudeAdjustmentMethod(lam1);
      if (cm1 != null) setCalendarMethod(cm1);
      if (sf1 != null) setShafaq(sf1);
    } catch {}
  };

  useEffect(() => { loadSettings(); }, []);

  // Fallback lokasi berbasis IP jika geolocation tidak tersedia/ditolak.
  // Jika IP juga gagal, pakai DEFAULT_LOCATION supaya jadwal tetap tampil.
  const fetchIpLocation = async () => {
    try {
      const resp = await fetch('https://ipapi.co/json');
      if (!resp.ok) throw new Error('IP lookup failed: ' + resp.status);
      const json = await resp.json();
      const ipLat = json?.latitude; const ipLon = json?.longitude;
      const ipCity = json?.city || json?.region || json?.region_code || '';
      const ipCountry = json?.country_name || json?.country || '';
      if (typeof ipLat === 'number' && typeof ipLon === 'number') { setLat(ipLat); setLon(ipLon); }
      if (ipCity) setCity(ipCity);
      if (ipCountry) setCountry(ipCountry);
      if (!(typeof ipLat === 'number' && typeof ipLon === 'number') && !(ipCity && ipCountry)) {
        throw new Error('IP lookup returned no usable location');
      }
    } catch (e) {
      setCity(DEFAULT_LOCATION.city);
      setCountry(DEFAULT_LOCATION.country);
    }
  };

  // Tick time every second for countdown
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(id); }, []);

  // ---- Pop-up "masuk waktu" + adzan saat jam sholat ----
  const adhanPlayer = useAudioPlayer(ADHAN_SOURCE);
  const firedRef = useRef({}); // { [key]: dateKey } agar tidak dobel dalam satu hari

  // Instant paint: tampilkan jadwal terakhir dari snapshot tanpa menunggu network
  useEffect(() => {
    (async () => {
      try {
        if (data) return; // sudah ada data, jangan menimpa
        const snap = await readLastSholatSnapshot();
        if (snap?.jadwal) setData({ ...snap, __fromCache: true });
      } catch {}
    })();
  }, []);

  // Muat pengaturan pengingat + suara, dan ikuti perubahan live dari Pengaturan
  // (saklar "Aktifkan pengingat" & suara adzan tersinkron dengan layar ini)
  useEffect(() => {
    const reloadNotify = async () => {
      try {
        const [eRaw, sRaw] = await Promise.all([
          AsyncStorage.getItem('notif_prayer_enabled'),
          AsyncStorage.getItem('notif_prayer_sound'),
        ]);
        setNotifEnabled(eRaw !== '0');
        setNotifSound(sRaw === 'adhan' ? 'adhan' : 'default');
      } catch {}
    };
    reloadNotify();
    const off = onSettingsChanged(reloadNotify);
    return () => { off(); };
  }, []);

  // Detect location (GPS or browser) and fill city/country
  useEffect(() => { (async () => { try {
    // 1) Pakai lokasi tersimpan jika masih baru (< 6 jam)
    const saved = await AsyncStorage.getItem(LAST_LOCATION_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const fresh = typeof parsed?.ts === 'number' && (Date.now() - parsed.ts) < LAST_LOCATION_MAX_AGE_MS;
        if (fresh && typeof parsed.lat === 'number' && typeof parsed.lon === 'number') {
          setLat(parsed.lat); setLon(parsed.lon);
          if (parsed.city) setCity(parsed.city);
          if (parsed.country) setCountry(parsed.country);
          return; // lokasi cukup, jangan request GPS/geolocation lagi
        }
      } catch {}
    }
    // 2) Jika tidak ada lokasi tersimpan yang masih baru, minta lokasi
    if (Platform.OS !== 'web') {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { await fetchIpLocation(); return; }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLat(pos.coords.latitude); setLon(pos.coords.longitude);
      try {
        const rg = await Location.reverseGeocodeAsync({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        const addr = rg?.[0] || {};
        setCity(addr.city || addr.region || addr.district || addr.name || '');
        setCountry(addr.country || '');
      } catch { /* koordinat sudah ada, nama kota tidak wajib */ }
    } else {
      const pos = await getWebPosition(); // null jika ditolak / tidak tersedia
      if (!pos) { await fetchIpLocation(); return; }
      const { latitude, longitude } = pos.coords;
      setLat(latitude); setLon(longitude);
      try {
        const url = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=jsonv2`;
        const resp = await fetch(url); const json = await resp.json(); const addr = json?.address || {};
        setCity(addr.city || addr.town || addr.village || addr.state_district || addr.state || addr.county || '');
        setCountry(addr.country || '');
      } catch { /* koordinat sudah ada, nama kota tidak wajib */ }
    }
  } catch (e) { console.warn(e); await fetchIpLocation(); } })(); }, []);

  // Simpan lokasi terakhir supaya kunjungan berikutnya tidak perlu minta izin lagi
  useEffect(() => {
    if (lat == null || lon == null) return;
    AsyncStorage.setItem(
      LAST_LOCATION_KEY,
      JSON.stringify({ lat, lon, city, country, ts: Date.now() })
    ).catch(() => {});
  }, [lat, lon, city, country]);

  // Mulai "watch" posisi hanya jika izin SUDAH diberikan (tidak memicu popup izin lagi)
  useEffect(() => {
    let sub; // expo-location subscription (native)
    let watchId; // geolocation watch id (web)
    let cancelled = false;
    (async () => {
      try {
        if (Platform.OS !== 'web') {
          const { status } = await Location.getForegroundPermissionsAsync();
          if (status === 'granted' && !cancelled) {
            sub = await Location.watchPositionAsync(
              { accuracy: Location.Accuracy.Balanced, distanceInterval: 200 },
              (pos) => {
                setLat(pos.coords.latitude);
                setLon(pos.coords.longitude);
              }
            );
          }
        } else if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
          // Cek status izin dulu; jika tidak bisa dicek / belum granted, jangan watch
          let granted = false;
          try {
            if (navigator.permissions?.query) {
              const st = await navigator.permissions.query({ name: 'geolocation' });
              granted = st.state === 'granted';
            }
          } catch {}
          if (granted && !cancelled) {
            watchId = navigator.geolocation.watchPosition(
              (pos) => {
                setLat(pos.coords.latitude);
                setLon(pos.coords.longitude);
              },
              () => { /* silent */ },
              { enableHighAccuracy: true, maximumAge: 10000 }
            );
          }
        }
      } catch (e) {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
      try { if (sub && typeof sub.remove === 'function') sub.remove(); } catch {}
      try { if (watchId != null && typeof navigator !== 'undefined' && 'geolocation' in navigator) navigator.geolocation.clearWatch(watchId); } catch {}
    };
  }, []);

  // Fetch schedule: prefer coords (lat/lon) then fallback to city/country
  useEffect(() => { (async () => { try {
    const iso = new Date().toISOString().slice(0, 10);
    const toNum = (v) => { const n = Number(v); return Number.isFinite(n) ? n : undefined; };
    const options = {
      method,
      timezonestring: tzString || undefined,
      tune: tune || undefined,
      school: toNum(school),
      midnightMode: toNum(midnightMode),
      latitudeAdjustmentMethod: toNum(latitudeAdjustmentMethod),
      calendarMethod: toNum(calendarMethod),
      shafaq: (shafaq || '').trim() || undefined,
    };
    if (lat != null && lon != null) {
      const res = await getAladhanHarianCoords(lat, lon, iso, options);
      setData(res?.data);
    } else if (city && country) {
      const res = await getAladhanHarianCity(city, country, iso, options);
      setData(res?.data);
    }
  } catch (e) { console.warn(e); } })(); }, [lat, lon, city, country, method, tzString, tune, school, midnightMode, latitudeAdjustmentMethod, calendarMethod, shafaq]);

  // Pastikan notifikasi pengingat & izin sudah beres setiap layar ini dibuka
  // — walau Home belum sempat menjadwalkan. refreshPrayerReminderSchedule
  // memakai jadwal bulanan multi-hari eksak di Android (auto-refresh tiap
  // app dibuka, sehingga waktunya tak bergeser) / repeat harian di iOS.
  useEffect(() => {
    (async () => {
      try {
        const jadwal = data?.jadwal;
        if (!jadwal || !(jadwal.subuh || jadwal.dzuhur)) return;
        const [enabledRaw, offsetRaw, soundRaw] = await Promise.all([
          AsyncStorage.getItem('notif_prayer_enabled'),
          AsyncStorage.getItem('notif_prayer_offset'),
          AsyncStorage.getItem('notif_prayer_sound'),
        ]);
        const toNum = (v) => { const n = Number(v); return Number.isFinite(n) ? n : undefined; };
        await refreshPrayerReminderSchedule({
          lat,
          lon,
          city,
          country,
          options: {
            method,
            timezonestring: tzString || undefined,
            tune: tune || undefined,
            school: toNum(school),
            midnightMode: toNum(midnightMode),
            latitudeAdjustmentMethod: toNum(latitudeAdjustmentMethod),
            calendarMethod: toNum(calendarMethod),
            shafaq: (shafaq || '').trim() || undefined,
          },
          offsetMinutes: Number.isFinite(parseInt(offsetRaw, 10)) ? parseInt(offsetRaw, 10) : 0,
          enabled: notifEnabled && enabledRaw !== '0',
          soundChoice: (['adhan', 'getar', 'silent'].includes(soundRaw)
            ? soundRaw
            : (['adhan', 'getar', 'silent'].includes(notifSound) ? notifSound : 'default')),
        });
      } catch {}
    })();
  }, [data?.date, data?.jadwal?.dzuhur, notifEnabled, notifSound, perKeySounds, lat, lon, city, country]);

  const times = useMemo(() => {
    const base = new Date();
    const j = data?.jadwal || {};
    return keys.map(k => ({ key: k, label: labels[k], raw: j[k], display: displayFromApi(j[k]), time: parse(j[k], base) })).filter(x => !!x.time);
  }, [data]);

  const timesFull = useMemo(() => {
    const base = new Date();
    const j = data?.jadwal || {};
    return keysFull.map(k => ({ key: k, label: labels[k], raw: j[k], display: displayFromApi(j[k]), time: parse(j[k], base) })).filter(x => !!x.time);
  }, [data]);

  const timesActive = useMemo(() => {
    const base = new Date();
    const j = data?.jadwal || {};
    return keysActive.map(k => ({ key: k, label: labels[k], raw: j[k], display: displayFromApi(j[k]), time: parse(j[k], base) })).filter(x => !!x.time);
  }, [data]);

  const curNext = useMemo(() => {
    if (!timesActive.length) return { cur: null, next: null };
    for (let i = 0; i < timesActive.length; i++) {
      const t = timesActive[i].time; const n = timesActive[i + 1]?.time || null;
      if (now >= t && (!n || now < n)) return { cur: timesActive[i], next: timesActive[i + 1] || null };
      if (now < t) return { cur: timesActive[Math.max(i - 1, 0)], next: timesActive[i] };
    }
    return { cur: timesActive[timesActive.length - 1], next: null };
  }, [timesActive, now]);

  const leftLabel = useMemo(() => {
    const n = curNext.next?.time; if (!n) return '—'; const ms = n - now; if (ms <= 0) return 'Now';
    const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000);
    return `${h > 0 ? h + ' hours ' : ''}${m} min left`;
  }, [curNext, now]);

  // Deteksi momen "tepat saat jam sholat": munculkan popup & mainkan adzan.
  // De-dup: satu kali per waktu sholat per hari (firedRef), meski waktu
  // berulang terdeteksi dalam jendela 15 detik (bekerja saat aplikasi terbuka).
  useEffect(() => {
    if (!timesActive.length) return;
    if (!notifEnabled) return; // hormati saklar "Aktifkan pengingat" di Pengaturan
    const dateKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
    for (const t of timesActive) {
      const firedKey = `popup:${dateKey}:${t.key}`;
      const msSince = now - t.time;
      if (msSince >= 0 && msSince < 15000 && firedRef.current[firedKey] !== true) {
        firedRef.current[firedKey] = true;
        setPopup({ key: t.key, label: t.label, display: t.display || displayFromApi(t.raw) });
        // Suara mengikuti setelan per-waktu; 'silent'/'off' tidak memutar adzan
        if (resolveKeySound(t.key) === 'adhan' && !adhanPlayer?.playing) {
          try { adhanPlayer.seekTo(0); adhanPlayer.play(); } catch {}
        }
        break;
      }
    }
  }, [now, timesActive, notifSound, notifEnabled, perKeySounds]);

  // Hentikan adzan saat popup ditutup
  const closePopup = () => {
    try { adhanPlayer.pause(); } catch {}
    setPopup(null);
  };

  // Toggle suara adzan di popup: klik untuk mematikan, klik lagi memutar.
  // Memakai status live pemain (bukan state manual) agar selalu sinkron.
  const adhanStatus = useAudioPlayerStatus(adhanPlayer);
  const adhanPlaying = !!adhanStatus?.playing;
  const togglePopupSound = () => {
    try {
      if (adhanPlaying) {
        adhanPlayer.pause();
      } else {
        adhanPlayer.seekTo(0);
        adhanPlayer.play();
      }
    } catch {}
  };

  const readableDate = useMemo(() => {
    const s = data?.date;
    let dObj = now;
    if (typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s)) {
      // ISO (YYYY-MM-DD) dari lapisan API setelah normalisasi
      const [yyyy, mm, dd] = s.split('-').map(v => parseInt(v, 10));
      dObj = new Date(yyyy, mm - 1, dd);
    } else if (typeof s === 'string' && /^\d{1,2}-\d{1,2}-\d{4}$/.test(s)) {
      const [dd, mm, yyyy] = s.split('-').map(v => parseInt(v, 10));
      dObj = new Date(yyyy, mm - 1, dd);
    }
    return dObj.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }, [data, now]);

  const hijri = useMemo(() => {
    const h = data?.hijri;
    if (!h) return '';
    const hdate = typeof h?.date === 'string' ? h.date : '';
    const hday = /^\d{1,2}-\d{1,2}-\d{4}$/.test(hdate) ? hdate.split('-')[0] : (h?.day || '');
    const monthName = h?.month?.en || h?.month?.ar || '';
    const year = h?.year || (/^\d{1,2}-\d{1,2}-\d{4}$/.test(hdate) ? hdate.split('-')[2] : '');
    return `${monthName} ${hday}${year ? ', ' + year : ''}`;
  }, [data]);

  // Meta & method info from API
  const meta = data?.meta || {};
  const methodId = meta?.method;
  const methodNames = {
    0: 'Shia Ithna-Ashari',
    1: 'University of Islamic Sciences, Karachi',
    2: 'Islamic Society of North America',
    3: 'Muslim World League',
    4: 'Umm al-Qura, Makkah',
    5: 'Egyptian General Authority of Survey',
    7: 'Institute of Geophysics, University of Tehran',
    8: 'Gulf Region',
    9: 'Kuwait',
    10: 'Qatar',
    11: 'Majlis Ugama Islam Singapore',
    12: 'Union of Islamic Organizations of France',
    13: 'Diyanet İşleri Başkanlığı, Turkey',
    14: 'Spiritual Administration of Muslims of Russia'
  };
  const methodName = methodNames[methodId] || (methodId != null ? `Method ${methodId}` : '');
  const coordText = (meta?.latitude != null && meta?.longitude != null)
    ? `${Number(meta.latitude).toFixed(4)}, ${Number(meta.longitude).toFixed(4)}`
    : ((lat != null && lon != null) ? `${lat.toFixed(4)}, ${lon.toFixed(4)}` : '');

  // Timezone dari meta API (dinamis) + Timezone sekarang (perangkat)
  const tzApi = data?.meta?.timezone || '';
  const deviceTzName = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch { return ''; } })();
  const tzOffsetMin = -new Date().getTimezoneOffset(); // positif untuk GMT+
  const tzAbs = Math.abs(tzOffsetMin);
  const tzH = String(Math.floor(tzAbs / 60)).padStart(2, '0');
  const tzM = String(tzAbs % 60).padStart(2, '0');
  const tzSign = tzOffsetMin >= 0 ? '+' : '-';
  const tzOffsetStr = `GMT${tzSign}${tzH}:${tzM}`;
  const tzNow = deviceTzName ? `${deviceTzName} (${tzOffsetStr})` : tzOffsetStr;

  const locationHeader = useMemo(() => {
    return data?.lokasi || city || ((lat != null && lon != null) ? `${lat.toFixed(3)}, ${lon.toFixed(3)}` : 'Mendeteksi lokasi…');
  }, [data, city, lat, lon]);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: pal.colors.bg }}>
      <LinearGradient colors={[theme.colors.primary, theme.colors.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 20, paddingBottom: 28, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '600' }}>{locationHeader} <Ionicons name="chevron-down" size={18} color="#fff" /></Text>
          <Ionicons name="settings-outline" size={22} color="#fff" />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#fff', opacity: 0.9, letterSpacing: 1 }}>{(curNext.cur?.label || '–').toUpperCase()}</Text>
            <Text style={{ color: '#fff', fontSize: 40, fontWeight: '700', marginTop: 2 }}>{curNext.cur ? (curNext.cur.display || displayFromApi(curNext.cur.raw)) : '—'}</Text>
            <Text style={{ color: '#e6e6e6', marginTop: 6 }}>{leftLabel}</Text>
          </View>
          <Ionicons name="moon" size={64} color="#ffffffaa" />
        </View>
      </LinearGradient>

      <View style={{ backgroundColor: pal.colors.surface, borderWidth: 1, borderColor: pal.colors.surfaceBorder, marginTop: -18, marginHorizontal: 12, borderRadius: 16, boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.08)', elevation: 3 }}>
        <View style={{ padding: 16, borderBottomWidth: 1, borderColor: pal.colors.surfaceBorder }}>
          <Text style={{ textAlign: 'center', fontWeight: '600', color: pal.colors.text }}>{readableDate}</Text>
          <Text style={{ textAlign: 'center', color: pal.colors.muted, marginTop: 4 }}>{hijri}</Text>
          {data?.__fromCache ? (
            <Text style={{ textAlign: 'center', color: pal.colors.muted, marginTop: 4, fontSize: 11, fontStyle: 'italic' }}>
              Menampilkan jadwal terakhir (perangkat offline / internet belum aktif)
            </Text>
          ) : null}
          {tzNow ? <Text style={{ textAlign: 'center', color: pal.colors.muted, marginTop: 4, fontSize: 12 }}>Zona waktu (sekarang): {tzNow}</Text> : null}
          {tzApi ? <Text style={{ textAlign: 'center', color: pal.colors.muted, marginTop: 2, fontSize: 12 }}>Zona waktu (API): {tzApi}</Text> : null}
          {coordText ? <Text style={{ textAlign: 'center', color: pal.colors.muted, marginTop: 2, fontSize: 12 }}>Coords: {coordText}</Text> : null}
          {methodName ? <Text style={{ textAlign: 'center', color: pal.colors.muted, marginTop: 2, fontSize: 12 }}>Method: {methodName}</Text> : null}
        </View>
        {/* Petunjuk: ikon suara di tiap baris bisa diketuk untuk setelan khusus */}
        <Text style={{ color: pal.colors.muted, fontSize: 11, fontStyle: 'italic', paddingHorizontal: 16, paddingTop: 10 }}>
          Ketuk ikon suara untuk mengatur tiap waktu: ikut Pengaturan → adzan → bunyi biasa → getar → sunyi → matikan notifikasi.
        </Text>
        {timesFull.map(t => {
          const active = curNext.cur?.key === t.key;
          const soundState = resolveKeySound(t.key);
          const ICONS = { adhan: 'volume-high', default: 'volume-medium', getar: 'pulse-outline', silent: 'volume-mute', off: 'notifications-off-outline' };
          const LABELS = { adhan: 'Suara adzan', default: 'Bunyi biasa (suara sistem)', getar: 'Getar saja', silent: 'Sunyi (tanpa suara & getar)', off: 'Notifikasi mati' };
          return (
            <View key={t.key} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderColor: pal.colors.surfaceBorder }}>
              <Text style={{ fontSize: 16, color: pal.colors.text }}>{t.label}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 18, borderWidth: active ? 2 : 1, borderColor: active ? pal.colors.primary : pal.colors.surfaceBorder }}>
                  <Text style={{ fontWeight: '600', color: active ? pal.colors.primary : pal.colors.text }}>{t.display || displayFromApi(t.raw)}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => cycleKeySound(t.key)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessible
                  accessibilityLabel={`${t.label}: ${LABELS[soundState]}`}
                  style={{ marginLeft: 8, padding: 4 }}
                >
                  <Ionicons
                    name={ICONS[soundState]}
                    size={20}
                    color={soundState === 'adhan' ? pal.colors.primary : (soundState === 'off' || soundState === 'silent') ? pal.colors.muted : pal.colors.text}
                  />
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 14 }}>
          <TouchableOpacity style={{ backgroundColor: theme.colors.primary, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14 }}>
            <Text style={{ color: '#fff', fontWeight: '600' }}>{curNext.cur?.label ? 'Prayers' : 'Loading'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ borderColor: pal.colors.surfaceBorder, borderWidth: 1, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14 }}>
            <Text style={{ color: pal.colors.text }}>{hijri ? 'Hijri' : '—'}</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={{ height: 24 }} />

      {/* Pop-up "masuk waktu sholat" — muncul otomatis tepat saat jam sholat */}
      <Modal visible={!!popup} transparent animationType="fade" onRequestClose={closePopup}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <View style={{ backgroundColor: pal.colors.surface, borderRadius: 18, borderWidth: 1, borderColor: pal.colors.surfaceBorder, padding: 20, width: '100%', maxWidth: 420 }}>
            <Text style={{ color: pal.colors.muted, fontWeight: '700', letterSpacing: 1, fontSize: 12 }}>SEKARANG</Text>
            <Text style={{ color: pal.colors.primary, fontSize: 26, fontWeight: '800', marginTop: 6 }}>Masuk waktu {popup?.label || ''}</Text>
            <Text style={{ color: pal.colors.text, marginTop: 4 }}>Pukul {popup?.display || ''} — mari salat tepat waktu.</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
              {resolveKeySound(popup?.key) === 'adhan' && (
                <TouchableOpacity
                  onPress={togglePopupSound}
                  style={{ borderColor: pal.colors.surfaceBorder, borderWidth: 1, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14 }}
                >
                  <Text style={{ color: pal.colors.primary, fontWeight: '700' }}>{adhanPlaying ? 'Matikan Suara' : 'Putar Adzan'}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={closePopup}
                style={{ backgroundColor: theme.colors.primary, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 20, alignItems: 'center' }}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>Tutup</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}