import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Platform, Share, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { GradientCard, PurpleButton, OutlineLightButton, FeatureTile, theme, getPalette } from '../ui';
import { useAppearance } from '../api/appearance';
import { getSurahDetail } from '../api/quran';
import { getAladhanHarianCity, getAladhanHarianCoords } from '../api/aladhan';
import { schedulePrayerReminders, refreshPrayerReminderSchedule } from '../api/notifications';
import { readLastSholatSnapshot } from '../api/aladhan';
import { onSettingsChanged } from '../api/settingsEvents';
import * as Location from 'expo-location';

function Card({ title, desc, onPress }) {
  return (
    <GradientCard title={title} desc={desc} onPress={onPress} />
  );
}

// Warna aksen untuk setiap tile menu agar grid lebih hidup
const TILE_COLORS = {
  Surat: '#7c3aed',
  Doa: '#0ea5e9',
  Hadits: '#f59e0b',
  Sholat: '#10b981',
  Kiblat: '#ef4444',
  Hijriyah: '#6366f1',
  Ulama: '#ec4899',
  Bookmark: '#14b8a6',
};

export default function HomeScreen({ navigation }) {
  const [logoSource, setLogoSource] = useState(require('../../assets/icon.png'));
  const [lastRead, setLastRead] = useState(null);

  // === Tampilan (dark mode) ===
  const { darkMode } = useAppearance();
  const pal = getPalette(darkMode);
  // Tanggal hari ini (yyyy-mm-dd) — diprefix ke depan karena dipakai efek Ayat Hari Ini
  const [dateString] = useState(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  });

  // === Ayat Hari Ini: rotasi harian dari API equran (surah acak dari seed tanggal) ===
  const [dailyAyah, setDailyAyah] = useState(null);
  const [dailyLoading, setDailyLoading] = useState(false);

  const shareDailyAyah = useCallback(async () => {
    if (!dailyAyah) return;
    const ayLabel = `${dailyAyah.surahLatin} : ${dailyAyah.ayahNumber}`;
    const msg = `Ayat Hari Ini • ${ayLabel}\n\n${dailyAyah.arab}\n\n${dailyAyah.latin}\n\n${dailyAyah.indo}\n\n— dibagikan dari Alquranku`;
    try {
      if (Platform.OS === 'web') {
        if (typeof navigator !== 'undefined' && navigator.share) {
          await navigator.share({ title: 'Ayat Hari Ini', text: msg });
        } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
          await navigator.clipboard.writeText(msg);
          alert('Teks ayat dikopi ke clipboard.');
        } else {
          alert(msg);
        }
      } else {
        await Share.share({ title: 'Ayat Hari Ini', message: msg });
      }
    } catch {}
  }, [dailyAyah]);

  useEffect(() => {
    let cancelled = false;
    const loadDailyAyah = async () => {
      // Sudah ada untuk hari ini? (di-cache supaya tidak hit API setiap buka Home)
      try {
        const raw = await AsyncStorage.getItem('daily_ayah');
        const obj = raw ? JSON.parse(raw) : null;
        if (obj && obj.date === dateString && obj.arab) {
          setDailyAyah(obj);
          return;
        }
      } catch {}
      setDailyLoading(true);
      try {
        // Seed deterministik dari tanggal: semua perangkat di tanggal yang sama
        // menampilkan ayat yang sama, dan tetap konsisten saat layar di-refresh.
        let seed = 0;
        for (const ch of String(dateString)) seed = (seed * 31 + ch.charCodeAt(0)) % 1000000;
        const surahNo = (seed % 114) + 1;
        const detail = await getSurahDetail(surahNo);
        const ayat = detail?.ayat || [];
        if (!ayat.length) return;
        const ayIndex = seed % ayat.length;
        const a = ayat[ayIndex];
        const next = {
          date: dateString,
          surahNo,
          surahLatin: detail?.surat?.namaLatin ?? detail?.surat?.nama_latin ?? detail?.namaLatin ?? '',
          ayahNumber: a?.nomorAyat ?? a?.nomor ?? (ayIndex + 1),
          arab: a?.teksArab ?? a?.teks_arab ?? '',
          latin: a?.teksLatin ?? a?.teks_latin ?? '',
          indo: a?.teksIndonesia ?? a?.teks_terjemahan ?? '',
        };
        try { await AsyncStorage.setItem('daily_ayah', JSON.stringify(next)); } catch {}
        if (!cancelled) setDailyAyah(next);
      } catch (e) {
        // Offline / gagal: kartu tetap hilang rapi (tidak memblokir Home)
      } finally {
        if (!cancelled) setDailyLoading(false);
      }
    };
    loadDailyAyah();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateString]);

  const [city, setCity] = useState('Kuala Lumpur');
  const [country, setCountry] = useState('Malaysia');
  const [lat, setLat] = useState(null);
  const [lon, setLon] = useState(null);
  // Pengaturan kalkulasi (dibaca dari AsyncStorage)
  const [method, setMethod] = useState(3);
  const [tzString, setTzString] = useState('');
  const [tune, setTune] = useState('');
  const [school, setSchool] = useState('');
  const [midnightMode, setMidnightMode] = useState('');
  const [latitudeAdjustmentMethod, setLatitudeAdjustmentMethod] = useState('');
  const [calendarMethod, setCalendarMethod] = useState('');
  const [shafaq, setShafaq] = useState('');
  const [loadingPrayer, setLoadingPrayer] = useState(false);
  const [errorPrayer, setErrorPrayer] = useState(null);
  const [prayerData, setPrayerData] = useState(null);
  const [statusInfo, setStatusInfo] = useState(null);
  const [localTime, setLocalTime] = useState('');
  const [localTz, setLocalTz] = useState('');
  // Sapaan sesuai waktu (pagi/siang/sore/malam)
  const [greeting, setGreeting] = useState('');
  // Tandai selesai resolve lokasi (cache/geolocation) agar jadwal hanya di-fetch
  // SEKALI dengan koordinat final — bukan dua kali (default dulu, lalu lokasi asli).
  const [locationReady, setLocationReady] = useState(false);

  const parseTimeOnDate = (dateIso, hhmm) => {
    if (!dateIso || !hhmm) return null;
    const [hh, mm] = String(hhmm).split(':').map((x) => parseInt(x, 10));
    if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
    const d = new Date(dateIso + 'T00:00:00');
    d.setHours(hh);
    d.setMinutes(mm);
    d.setSeconds(0);
    d.setMilliseconds(0);
    return d;
  };
  // Hitung sapaan sesuai jam lokal perangkat
  useEffect(() => {
    const update = () => {
      const h = new Date().getHours();
      if (h >= 4 && h < 11) setGreeting('Selamat pagi');
      else if (h >= 11 && h < 15) setGreeting('Selamat siang');
      else if (h >= 15 && h < 18) setGreeting('Selamat sore');
      else setGreeting('Selamat malam');
    };
    update();
    const id = setInterval(update, 60000);
    return () => clearInterval(id);
  }, []);

  const labelForKey = (k) => {
    switch (k) {
      case 'imsak': return 'Imsak';
      case 'subuh': return 'Subuh';
      case 'terbit': return 'Terbit';
      case 'dzuhur': return 'Dzuhur';
      case 'ashar': return 'Ashar';
      case 'maghrib': return 'Maghrib';
      case 'isya': return 'Isya';
      default: return k;
    }
  };
  const computeStatusFromJadwal = (dateIso, jadwal) => {
    const ORDER = ['imsak', 'subuh', 'terbit', 'dzuhur', 'ashar', 'maghrib', 'isya'];
    const now = new Date();
    let times = ORDER
      .map((k) => ({ key: k, at: parseTimeOnDate(dateIso, jadwal?.[k]) }))
      .filter((x) => x.at instanceof Date && !Number.isNaN(x.at.getTime()));
    if (times.length === 0) return null;
    // Pengaman: jika selisih waktu tidak wajar (> ±48 jam, biasanya tanggal
    // dari API salah tahun), perlakukan jadwal sebagai hari ini supaya
    // hitungan "menuju/sudah lewat" tetap masuk akal.
    const implausible = times.some((t) => Math.abs(t.at.getTime() - now.getTime()) > 48 * 60 * 60 * 1000);
    if (implausible) {
      const nowD = new Date();
      const todayIso = `${nowD.getFullYear()}-${String(nowD.getMonth() + 1).padStart(2, '0')}-${String(nowD.getDate()).padStart(2, '0')}`;
      const fixed = ORDER
        .map((k) => ({ key: k, at: parseTimeOnDate(todayIso, jadwal?.[k]) }))
        .filter((x) => x.at instanceof Date && !Number.isNaN(x.at.getTime()));
      if (fixed.length) times = fixed;
    }
    const upcoming = times.find((t) => t.at.getTime() > now.getTime());
    if (upcoming) {
      const diffMin = Math.round((upcoming.at.getTime() - now.getTime()) / 60000);
      const label = labelForKey(upcoming.key);
      return { nextKey: upcoming.key, headerText: `Menuju ${label} dalam ± ${diffMin} menit`, type: 'upcoming', diffMin };
    }
    const last = times[times.length - 1];
    const diffMin = Math.round((now.getTime() - last.at.getTime()) / 60000);
    const label = labelForKey(last.key);
    return { headerText: `Waktu ${label} sudah lewat ± ${diffMin} menit yang lalu`, type: 'passed', diffMin, lastKey: last.key };
  };
  const computeStatusDisplay = (info) => {
    if (!info) return { main: '', sub: '' };
    if (info.type === 'upcoming') {
      const label = labelForKey(info.nextKey);
      return { main: `MENUJU ${label}`, sub: `dalam ± ${info.diffMin} menit` };
    }
    if (info.type === 'passed') {
      const label = labelForKey(info.lastKey || '');
      return { main: `WAKTU ${label} SUDAH LEWAT`, sub: `± ${info.diffMin} menit yang lalu` };
    }
    return { main: '', sub: '' };
  };
  const MONTH_NAMES = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const formatMasehiDisplay = (iso) => {
    if (!iso) return '';
    const d = new Date(`${iso}T00:00:00`);
    if (Number.isNaN(d.getTime())) return iso;
    const day = d.getDate();
    const monthName = MONTH_NAMES[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${monthName} ${year}`;
  };
  const formatHijriDisplay = (hijri) => {
    if (!hijri) return '';
    const dateStr = hijri?.date; // dd-mm-yyyy
    const parts = String(dateStr || '').split('-');
    const day = parts[0] || '';
    const year = parts[2] || hijri?.year || '';
    const monthName = hijri?.month?.en || hijri?.month?.ar || '';
    return `${day} ${monthName} ${year} H`;
  };
  const computeProgress = (dateIso, jadwal) => {
    const ORDER = ['imsak', 'subuh', 'terbit', 'dzuhur', 'ashar', 'maghrib', 'isya'];
    const now = new Date();
    const times = ORDER
      .map((k) => ({ key: k, at: parseTimeOnDate(dateIso, jadwal?.[k]) }))
      .filter((x) => x.at instanceof Date && !Number.isNaN(x.at.getTime()));
    if (times.length < 2) return null;
    let idx = times.findIndex((t) => t.at.getTime() > now.getTime());
    if (idx === -1) idx = times.length - 1;
    const next = times[idx];
    const prev = times[idx - 1] || null;
    if (!prev || !next) return null;
    const totalMs = next.at.getTime() - prev.at.getTime();
    const elapsedMs = now.getTime() - prev.at.getTime();
    const pct = Math.max(0, Math.min(100, Math.round((elapsedMs / totalMs) * 100)));
    return { percent: pct, prevLabel: labelForKey(prev.key), nextLabel: labelForKey(next.key) };
  };

  const formatLocationLabel = () => {
    const name = `${city || ''}${country ? (city ? ', ' : '') + country : ''}`.trim();
    if (lat != null && lon != null) {
      const latStr = Number.isFinite(lat) ? lat.toFixed(5) : String(lat);
      const lonStr = Number.isFinite(lon) ? lon.toFixed(5) : String(lon);
      return `${name}${name ? ' • ' : ''}${latStr}, ${lonStr}`;
    }
    return (prayerData?.data?.lokasi || name);
  };
  // Muat pengaturan kalkulasi sholat tersimpan. CATATAN: dulu fungsi ini dipanggil
  // tapi tidak pernah didefinisikan, dan state pengaturan tidak pernah dibaca dari
  // AsyncStorage — sehingga perubahan di Pengaturan tidak pernah berpengaruh ke Home.
  const loadSettings = async () => {
    try {
      const [m, tz, tn, sc, mm, lam, cm, sf] = await Promise.all([
        AsyncStorage.getItem('aladhan_method'),
        AsyncStorage.getItem('aladhan_timezonestring'),
        AsyncStorage.getItem('aladhan_tune'),
        AsyncStorage.getItem('aladhan_school'),
        AsyncStorage.getItem('aladhan_midnightMode'),
        AsyncStorage.getItem('aladhan_latitudeAdjustmentMethod'),
        AsyncStorage.getItem('aladhan_calendarMethod'),
        AsyncStorage.getItem('aladhan_shafaq'),
      ]);
      if (m) setMethod(parseInt(m, 10) || 3);
      setTzString(tz || '');
      setTune(tn || '');
      setSchool(sc || '');
      setMidnightMode(mm || '');
      setLatitudeAdjustmentMethod(lam || '');
      setCalendarMethod(cm || '');
      setShafaq(sf || '');
    } catch (e) {}
  };

  const fetchHarian = async (_city, _country) => {
    try {
      setLoadingPrayer(true);
      setErrorPrayer(null);
      // JANGAN wipe prayerData di sini: bila internet mati, jadwal terakhir
      // dari cache harus tetap tampil (API layer otomatis mengembalikan cache).
      const cityParam = (_city ?? city).trim();
      const countryParam = (_country ?? country).trim();
      let res;
      const toNum = (v) => { const n = Number(v); return Number.isFinite(n) ? n : undefined; };
      const options = {
        method: method ?? 3,
        timezonestring: tzString || undefined,
        tune: tune || undefined,
        school: toNum(school),
        midnightMode: toNum(midnightMode),
        latitudeAdjustmentMethod: toNum(latitudeAdjustmentMethod),
        calendarMethod: toNum(calendarMethod),
        shafaq: (shafaq || '').trim() || undefined,
      };
      if (lat != null && lon != null) {
        res = await getAladhanHarianCoords(lat, lon, dateString.trim(), options);
      } else {
        res = await getAladhanHarianCity(cityParam, countryParam, dateString.trim(), options);
      }
      const payload = res?.data ? res : { data: res };
      setPrayerData(payload);
      const jadwal = payload?.data?.jadwal || {};
      const iso = payload?.data?.date || dateString.trim();
      setStatusInfo(computeStatusFromJadwal(iso, jadwal));
      // Sinkronkan notifikasi pengingat waktu sholat dengan jadwal terbaru.
      // Di Android memakai jadwal bulanan multi-hari eksak (auto-refresh tiap
      // app dibuka); di iOS pakai repeat harian.
      try {
        const enabledRaw = await AsyncStorage.getItem('notif_prayer_enabled');
        const offsetRaw = await AsyncStorage.getItem('notif_prayer_offset');
        const soundRaw = await AsyncStorage.getItem('notif_prayer_sound');
        await refreshPrayerReminderSchedule({
          lat: (lat != null ? lat : null),
          lon: (lon != null ? lon : null),
          city: cityParam,
          country: countryParam,
          options,
          offsetMinutes: Number.isFinite(parseInt(offsetRaw, 10)) ? parseInt(offsetRaw, 10) : 0,
          enabled: enabledRaw !== '0', // default aktif
          soundChoice: ['adhan', 'getar', 'silent'].includes(soundRaw) ? soundRaw : 'default',
        });
      } catch (e) {}
    } catch (e) {
      setErrorPrayer(e?.message || 'Gagal memuat jadwal sholat');
    } finally {
      setLoadingPrayer(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // 1) Pulihkan lokasi terakhir dari cache — UI langsung benar, tanpa kedip
      try {
        const raw = await AsyncStorage.getItem('home:loc');
        if (raw && !cancelled) {
          const c = JSON.parse(raw);
          if (Number.isFinite(c?.lat) && Number.isFinite(c?.lon)) {
            setLat(c.lat);
            setLon(c.lon);
            if (c.city) setCity(c.city);
            if (c.country) setCountry(c.country);
          }
        }
      } catch {}
      // 2) Muat pengaturan sholat tersimpan sebelum fetch pertama
      try { await loadSettings(); } catch {}
      // 3) Perbarui lokasi presisi via geolocation (silent jika ditolak)
      try {
        if (Platform.OS !== 'web') {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            if (!cancelled) {
              setLat(pos.coords.latitude);
              setLon(pos.coords.longitude);
              try {
                const rg = await Location.reverseGeocodeAsync({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
                const addr = rg?.[0] || {};
                setCity(addr.city || addr.region || addr.district || addr.name || city);
                setCountry(addr.country || country);
              } catch {}
            }
          }
        } else if ('geolocation' in navigator) {
          const pos = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 }));
          const { latitude, longitude } = pos.coords;
          if (!cancelled) {
            setLat(latitude);
            setLon(longitude);
            try {
              const url = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=jsonv2`;
              const resp = await fetch(url);
              const json = await resp.json();
              const addr = json?.address || {};
              setCity(addr.city || addr.town || addr.village || addr.state_district || addr.state || addr.county || city);
              setCountry(addr.country || country);
            } catch {}
          }
        }
      } catch {}
      // 4) Selesai resolve lokasi: efek dependensi yang mengambil jadwal aktif
      if (!cancelled) setLocationReady(true);
    })();
    return () => { cancelled = true; };
  }, []);

  // Instant paint: tampilkan jadwal sholat terakhir dari snapshot cache
  // sebelum network selesai — saat internet mati jadwal tetap tampil.
  useEffect(() => {
    (async () => {
      try {
        if (prayerData) return;
        const snap = await readLastSholatSnapshot();
        if (snap?.jadwal) {
          setPrayerData({ data: { ...snap, __fromCache: true } });
          setStatusInfo(computeStatusFromJadwal(snap.date || dateString.trim(), snap.jadwal));
        }
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Simpan lokasi terakhir agar kembali ke Home tidak kedip & hemat geolocation
  useEffect(() => {
    if (lat != null && lon != null) {
      AsyncStorage.setItem('home:loc', JSON.stringify({ lat, lon, city, country })).catch(() => {});
    }
  }, [lat, lon, city, country]);

  useEffect(() => {
    (async () => {
      try {
        const s = await AsyncStorage.getItem('last_read');
        if (s) {
          const obj = JSON.parse(s);
          // Terima hanya format valid { nomor, namaLatin, lastAyah } — format lama
          // yang tanpa nomor menyebabkan judul "Surah undefined".
          if (Number.isFinite(Number(obj?.nomor))) {
            setLastRead(obj);
          }
        }
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  useEffect(() => {
    let sub;
    let watchId;
    (async () => {
      try {
        if (Platform.OS !== 'web') {
          const { status } = await Location.getForegroundPermissionsAsync();
          if (status === 'granted') {
            sub = await Location.watchPositionAsync(
              { accuracy: Location.Accuracy.Balanced, distanceInterval: 200 },
              (pos) => {
                setLat(pos.coords.latitude);
                setLon(pos.coords.longitude);
              }
            );
          }
        } else if ('geolocation' in navigator) {
          watchId = navigator.geolocation.watchPosition(
            (pos) => {
              setLat(pos.coords.latitude);
              setLon(pos.coords.longitude);
            },
            () => {},
            { enableHighAccuracy: true, maximumAge: 10000 }
          );
        }
      } catch {}
    })();
    return () => {
      try { if (sub && typeof sub.remove === 'function') sub.remove(); } catch {}
      try { if (watchId != null && 'geolocation' in navigator) navigator.geolocation.clearWatch(watchId); } catch {}
    };
  }, []);
  // Reverse geocoding ketika lat/lon berubah untuk memperbarui city/country
  useEffect(() => {
    (async () => {
      try {
        if (lat != null && lon != null) {
          if (Platform.OS !== 'web') {
            try {
              const rg = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
              const addr = rg?.[0] || {};
              setCity(addr.city || addr.region || addr.district || addr.name || city);
              setCountry(addr.country || country);
            } catch {}
          } else {
            try {
              const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=jsonv2`;
              const resp = await fetch(url);
              const json = await resp.json();
              const addr = json?.address || {};
              setCity(addr.city || addr.town || addr.village || addr.state_district || addr.state || addr.county || city);
              setCountry(addr.country || country);
            } catch {}
          }
        }
      } catch {}
    })();
  }, [lat, lon]);
  // Refresh jadwal saat lokasi/pengaturan berubah — berjalan SEKALI setelah lokasi
  // siap (tanpa kedip lokasi default), lalu hanya saat dependensi benar-benar berubah.
  useEffect(() => {
    if (!locationReady) return;
    (async () => {
      try {
        await fetchHarian(city, country);
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationReady, lat, lon, dateString, method, tzString, tune, school, midnightMode, latitudeAdjustmentMethod, calendarMethod, shafaq]);

  // Perubahan pengaturan: muat ulang state pengaturan via EVENT (bukan polling
  // AsyncStorage tiap 2 detik yang boros baterai). Setelah state ter-load,
  // refresh jadwal mengikuti otomatis lewat efek dependensi (method, tune, dll.).
  useEffect(() => {
    return onSettingsChanged(() => {
      (async () => {
        try { await loadSettings(); } catch {}
      })();
    });
  }, []);

  // Jam lokal sesuai lokasi (timezone dari settings/meta)
  useEffect(() => {
    let id;
    const update = () => {
      try {
        const tz = (tzString || prayerData?.data?.meta?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || '').trim();
        if (tz) setLocalTz(tz);
        const now = new Date();
        try {
          const fmt = new Intl.DateTimeFormat('id-ID', { timeZone: tz || undefined, hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
          setLocalTime(fmt.format(now));
        } catch (e) {
          setLocalTime(now.toLocaleTimeString('id-ID', { hour12: false }));
        }
      } catch {}
    };
    update();
    id = setInterval(update, 1000);
    return () => { try { if (id) clearInterval(id); } catch {} };
  }, [tzString, prayerData]);
  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: pal.colors.bg }]} showsVerticalScrollIndicator={false}>
      <View style={styles.greetingRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.greeting, { color: pal.colors.text }]}>{greeting ? `${greeting} 👋` : 'Assalamualaikum 👋'}</Text>
          <Text style={[styles.greetingSub, { color: pal.colors.muted }]}>Semoga harimu penuh berkah</Text>
        </View>
        <Image
          source={logoSource}
          style={styles.logo}
          resizeMode="contain"
          onError={() => setLogoSource(require('../../assets/adaptive-icon.png'))}
        />
      </View>

      <LinearGradient colors={[theme.colors.primary, theme.colors.primaryDark]} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.prayerCard}>
        <View style={styles.prayerHeaderRow}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.prayerTitle}>Jadwal Sholat Hari Ini</Text>
            <Text style={styles.prayerLoc} numberOfLines={1}>{formatLocationLabel()}</Text>
            <Text style={styles.prayerDate}>{formatMasehiDisplay(prayerData?.data?.date || dateString)}{!!prayerData?.data?.hijri && ` • ${formatHijriDisplay(prayerData?.data?.hijri)}`}</Text>
          </View>
          {!!localTime && (
            <View style={styles.clockChip}>
              <Ionicons name="time-outline" size={13} color="#ffffff" />
              <Text style={styles.clockChipText}>{localTime}</Text>
            </View>
          )}
        </View>
        <View style={styles.nextPrayerRow}>
          {(() => {
            const d = computeStatusDisplay(statusInfo);
            return (
              <>
                <Text style={styles.prayerStatusMain} numberOfLines={1}>{d.main || 'JADWAL SHOLAT'}</Text>
                {!!d.sub && <Text style={styles.prayerStatusSub}>{d.sub}</Text>}
              </>
            );
          })()}
        </View>
        {loadingPrayer && (<Text style={styles.prayerLoading}>Memuat jadwal...</Text>)}
        {errorPrayer && (<Text style={styles.prayerError}>{String(errorPrayer)}</Text>)}
        {!loadingPrayer && !errorPrayer && (
          <>
            {(() => {
              const jadwal = prayerData?.data?.jadwal || {};
              const iso = prayerData?.data?.date || dateString;
              const prog = computeProgress(iso, jadwal);
              if (!prog) return null;
              return (
                <View style={{ marginTop: 6 }}>
                  <View style={styles.prayerProgressBar}>
                    <View style={[styles.prayerProgressFill, { width: `${prog.percent}%` }]} />
                  </View>
                  <Text style={styles.prayerProgressCaption}>{prog.prevLabel} → {prog.nextLabel}</Text>
                </View>
              );
            })()}
            <View style={styles.prayerTimeGrid}>
              {(() => {
                const jadwal = prayerData?.data?.jadwal || {};
                const iso = prayerData?.data?.date || dateString;
                const ORDER = ['imsak','subuh','terbit','dzuhur','ashar','maghrib','isya'];
                const now = new Date();
                const times = ORDER
                  .map((k) => ({ key: k, at: parseTimeOnDate(iso, jadwal?.[k]) }))
                  .filter((x) => x.at instanceof Date && !Number.isNaN(x.at.getTime()));
                let idx = times.findIndex((t) => t.at.getTime() > now.getTime());
                if (idx === -1) idx = times.length - 1;
                const activeKey = (times[idx] ? times[idx].key : null) || (statusInfo?.lastKey || null);
                const items = [
                  { label: 'Imsak', key: 'imsak' },
                  { label: 'Subuh', key: 'subuh' },
                  { label: 'Terbit', key: 'terbit' },
                  { label: 'Dzuhur', key: 'dzuhur' },
                  { label: 'Ashar', key: 'ashar' },
                  { label: 'Maghrib', key: 'maghrib' },
                  { label: 'Isya', key: 'isya' },
                ];
                return items.map(({ label, key }) => (
                  <View key={key} style={[styles.prayerChip, activeKey === key && styles.prayerChipActive]}>
                    <Text style={[styles.prayerChipLabel, activeKey === key && styles.prayerChipLabelActive]}>{label}</Text>
                    <Text style={[styles.prayerChipVal, activeKey === key && styles.prayerChipValActive]}>{jadwal?.[key] || '-'}</Text>
                  </View>
                ));
              })()}
            </View>
          </>
        )}
      </LinearGradient>

      {/* ============ AYAT HARI INI ============ */}
      <View style={[styles.dailyCard, { backgroundColor: pal.colors.surface, borderColor: pal.colors.surfaceBorder }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <Ionicons name="sparkles-outline" size={15} color={pal.colors.primary} />
          <Text style={[styles.dailyLabel, { color: pal.colors.primaryLight }]}>Ayat Hari Ini</Text>
        </View>
        {dailyLoading && !dailyAyah ? (
          <ActivityIndicator size="small" color={pal.colors.primary} />
        ) : dailyAyah ? (
          <>
            <Text style={[styles.dailySurah, { color: pal.colors.text }]}>QS {dailyAyah.surahLatin} : {dailyAyah.ayahNumber}</Text>
            {!!dailyAyah.arab && <Text style={[styles.dailyArab, { color: pal.colors.text }]}>{dailyAyah.arab}</Text>}
            {!!dailyAyah.latin && <Text style={[styles.dailyLatin, { color: pal.colors.muted }]}>{dailyAyah.latin}</Text>}
            {!!dailyAyah.indo && <Text style={[styles.dailyIndo, { color: pal.colors.text }]}>“{dailyAyah.indo}”</Text>}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
              <TouchableOpacity
                onPress={() => navigation.navigate('SurahDetail', { nomor: dailyAyah.surahNo, nama_latin: dailyAyah.surahLatin, namaLatin: dailyAyah.surahLatin })}
                style={styles.dailyReadBtn}
                activeOpacity={0.8}
              >
                <Text style={styles.dailyReadText}>Baca Surah</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={shareDailyAyah} style={[styles.dailyShareBtn, { borderColor: pal.colors.surfaceBorder }]} activeOpacity={0.8}>
                <Ionicons name="share-social-outline" size={14} color={pal.colors.primaryLight} />
                <Text style={[styles.dailyShareText, { color: pal.colors.primaryLight }]}>Bagikan</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : null}
      </View>
      {lastRead && (
        <LinearGradient colors={[theme.colors.primary, theme.colors.primaryDark]} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.lastReadCard}>
          <Text style={styles.lastReadLabel}>Terakhir dibaca</Text>
          <Text style={styles.lastReadTitle}>{lastRead?.namaLatin || `Surah ${lastRead?.nomor}`}</Text>
          {!!lastRead?.lastAyah && (
            <Text style={styles.lastReadMeta}>Ayat {lastRead.lastAyah}</Text>
          )}
          <View style={{ flexDirection: 'row', marginTop: 10 }}>
            <PurpleButton
              label="Lanjutkan"
              onPress={() => navigation.navigate('SurahDetail', {
                surah: { nomor: lastRead?.nomor, namaLatin: lastRead?.namaLatin },
                lastAyah: lastRead?.lastAyah,
              })}
            />
            <OutlineLightButton label="Reset" onPress={async () => { await AsyncStorage.removeItem('last_read'); setLastRead(null); }} />
          </View>
        </LinearGradient>
      )}

      <View style={styles.list}>
        <FeatureTile title="Surat" icon="book-outline" iconColor={TILE_COLORS.Surat} onPress={() => navigation.navigate('SurahList')} />
        <FeatureTile title="Doa" icon="hand-left-outline" iconColor={TILE_COLORS.Doa} onPress={() => navigation.navigate('DoaList')} />
        <FeatureTile title="Hadits" icon="list-circle-outline" iconColor={TILE_COLORS.Hadits} onPress={() => navigation.navigate('HaditsMenu')} />
        <FeatureTile title="Sholat" icon="time-outline" iconColor={TILE_COLORS.Sholat} onPress={() => navigation.navigate('SholatJadwal')} />
        <FeatureTile title="Kiblat" icon="compass-outline" iconColor={TILE_COLORS.Kiblat} onPress={() => navigation.navigate('Qibla')} />
        <FeatureTile title="Hijriyah" icon="calendar-outline" iconColor={TILE_COLORS.Hijriyah} onPress={() => navigation.navigate('HijriCalendar')} />
        <FeatureTile title="Ulama" icon="people-outline" iconColor={TILE_COLORS.Ulama} onPress={() => navigation.navigate('UlamaList')} />
      </View>

      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: pal.colors.muted }]}>© {new Date().getFullYear()} Alquranku</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, flexGrow: 1 },
  // Kartu Ayat Hari Ini
  dailyCard: { borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1 },
  dailyLabel: { fontWeight: '800', fontSize: 13, marginLeft: 8, letterSpacing: 0.3 },
  dailySurah: { fontWeight: '700', fontSize: 12.5, color: '#6b7280', marginBottom: 6 },
  dailyArab: { fontFamily: 'NotoNaskhArabic', fontSize: 21, lineHeight: 36, textAlign: 'right' },
  dailyLatin: { marginTop: 8, fontSize: 13, fontStyle: 'italic' },
  dailyIndo: { marginTop: 6, fontSize: 13, lineHeight: 19 },
  dailyReadBtn: { backgroundColor: theme.colors.primaryDark, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1, borderColor: theme.colors.primaryLight, marginRight: 10 },
  dailyReadText: { color: '#fff', fontWeight: '700' },
  dailyShareBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1, backgroundColor: 'transparent' },
  dailyShareText: { fontWeight: '700' },
  // Header sapaan
  greetingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  greeting: { fontSize: 22, fontWeight: '800', color: theme.colors.text },
  greetingSub: { color: theme.colors.muted, marginTop: 2 },
  logo: { width: 44, height: 44, borderRadius: 12 },
  list: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: { padding: 16, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fff', borderRadius: 14, elevation: 2, boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.08)', marginBottom: 14 },
  cardBg: { padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#e9d5ff' },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#1f2937' },
  cardDesc: { color: '#6b7280', marginTop: 6 },
  footer: { marginTop: 24, alignItems: 'center' },
  footerText: { color: '#94a3b8', fontSize: 12 },
  lastReadCard: { borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#a78bfa' },
  lastReadLabel: { color: '#ffffff', fontWeight: '700' },
  lastReadTitle: { color: '#fff', fontSize: 18, fontWeight: '800', marginTop: 4 },
  lastReadMeta: { color: 'rgba(255,255,255,0.9)', marginTop: 6 },
  continueBtn: { backgroundColor: '#7c3aed', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12, marginRight: 8, borderWidth: 1, borderColor: '#a78bfa' },
  continueText: { color: '#fff', fontWeight: '700' },
  resetBtn: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)' },
  resetText: { color: '#fff', fontWeight: '700' },
  // tambahan gaya untuk kartu sholat di Home
  prayerCard: { borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#a78bfa' },
  prayerHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  prayerTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  prayerLoc: { color: 'rgba(255,255,255,0.9)', marginTop: 6 },
  prayerDate: { color: 'rgba(255,255,255,0.9)', marginTop: 2, marginBottom: 4 },
  prayerMethod: { color: 'rgba(255,255,255,0.8)', marginBottom: 8, fontSize: 12 },
  prayerLocalTime: { color: 'rgba(255,255,255,0.95)', marginBottom: 6 },
  prayerLoading: { color: '#fff', marginTop: 6 },
  prayerError: { color: '#fee2e2', marginTop: 6 },
  prayerStatusRow: { marginTop: 6 },
  // Baris "waktu sholat berikutnya" yang menonjol
  nextPrayerRow: { marginTop: 10, marginBottom: 2 },
  prayerStatusMain: { color: '#fff', fontWeight: '800', fontSize: 17, letterSpacing: 0.3 },
  prayerStatusSub: { color: 'rgba(255,255,255,0.9)', marginTop: 2 },
  // Chip jam lokal
  clockChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)', borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10 },
  clockChipText: { color: '#fff', fontWeight: '800', fontSize: 12, fontVariant: ['tabular-nums'] },
  prayerProgressBar: { height: 6, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden' },
  prayerProgressFill: { height: 6, backgroundColor: '#d1b892' },
  prayerProgressCaption: { color: 'rgba(255,255,255,0.9)', marginTop: 4, fontSize: 12 },
  prayerTimeGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  prayerChip: { backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.35)', borderWidth: 1, borderRadius: 10, paddingVertical: 6, paddingHorizontal: 10, marginRight: 8, marginBottom: 8 },
  prayerChipActive: { backgroundColor: 'rgba(255,255,255,0.25)', borderColor: '#d1b892' },
  prayerChipLabel: { color: 'rgba(255,255,255,0.9)', fontSize: 12 },
  prayerChipLabelActive: { color: '#fff' },
  prayerChipVal: { color: '#fff', fontWeight: '800' },
  prayerChipValActive: { color: '#fff' },
});