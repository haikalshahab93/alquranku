import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { GradientCard, PurpleButton, OutlineLightButton, FeatureTile, theme } from '../ui';
import { getAladhanHarianCity, getAladhanHarianCoords } from '../api/aladhan';
import * as Location from 'expo-location';

function Card({ title, desc, onPress }) {
  return (
    <GradientCard title={title} desc={desc} onPress={onPress} />
  );
}

export default function HomeScreen({ navigation }) {
  const [logoSource, setLogoSource] = useState(require('../../assets/icon.png'));
  const [lastRead, setLastRead] = useState(null);

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
  const [dateString] = useState(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  });
  const [loadingPrayer, setLoadingPrayer] = useState(false);
  const [errorPrayer, setErrorPrayer] = useState(null);
  const [prayerData, setPrayerData] = useState(null);
  const [statusInfo, setStatusInfo] = useState(null);
  const [localTime, setLocalTime] = useState('');
  const [localTz, setLocalTz] = useState('');

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
    const times = ORDER
      .map((k) => ({ key: k, at: parseTimeOnDate(dateIso, jadwal?.[k]) }))
      .filter((x) => x.at instanceof Date && !Number.isNaN(x.at.getTime()));
    if (times.length === 0) return null;
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
  const fetchHarian = async (_city, _country) => {
    try {
      setLoadingPrayer(true);
      setErrorPrayer(null);
      setPrayerData(null);
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
    } catch (e) {
      setErrorPrayer(e?.message || 'Gagal memuat jadwal sholat');
    } finally {
      setLoadingPrayer(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        if (Platform.OS !== 'web') {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            setLat(pos.coords.latitude);
            setLon(pos.coords.longitude);
            try {
              const rg = await Location.reverseGeocodeAsync({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
              const addr = rg?.[0] || {};
              setCity(addr.city || addr.region || addr.district || addr.name || city);
              setCountry(addr.country || country);
            } catch {}
          }
        } else if ('geolocation' in navigator) {
          const pos = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 }));
          const { latitude, longitude } = pos.coords;
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
      } catch {}
      try { await fetchHarian(city, country); } catch {}
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const s = await AsyncStorage.getItem('last_read');
        if (s) {
          const obj = JSON.parse(s);
          setLastRead(obj);
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
  // Refresh jadwal jika lokasi berubah (koordinat atau nama kota/negara)
  useEffect(() => {
    (async () => {
      try {
        await fetchHarian(city, country);
      } catch {}
    })();
  }, [lat, lon, city, country, dateString, method, tzString, tune, school, midnightMode, latitudeAdjustmentMethod, calendarMethod, shafaq]);

  // Poll perubahan pengaturan agar jadwal auto-refresh setelah disimpan dari Settings
  useEffect(() => {
    let prev = null; let id;
    (async () => {
      id = setInterval(async () => {
        try {
          const v = await AsyncStorage.getItem('settings:sholat:lastUpdated');
          if (v && v !== prev) { prev = v; await loadSettings(); await fetchHarian(city, country); }
        } catch {}
      }, 2000);
    })();
    return () => { try { if (id) clearInterval(id); } catch {} };
  }, [city, country]);

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
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.brandRow}>
        <Image
          source={logoSource}
          style={styles.logo}
          resizeMode="contain"
          onError={() => setLogoSource(require('../../assets/adaptive-icon.png'))}
        />
        <View style={{ marginLeft: 12 }}>
          <Text style={styles.title}>ALQURANKU</Text>
          <Text style={styles.subtitle}>Akses cepat: Quran, Doa, dan Hadits</Text>
        </View>
      </View>

      <LinearGradient colors={[theme.colors.primary, theme.colors.primaryDark]} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.prayerCard}>
        <View style={styles.prayerHeaderRow}>
          <Text style={styles.prayerTitle}>Jadwal Sholat Hari Ini</Text>
          <OutlineLightButton label="Lihat Jadwal" onPress={() => navigation.navigate('SholatJadwal')} />
        </View>
        <Text style={styles.prayerLoc}>{formatLocationLabel()}</Text>
        <Text style={styles.prayerDate}>{formatMasehiDisplay(prayerData?.data?.date || dateString)}{!!prayerData?.data?.hijri && ` • ${formatHijriDisplay(prayerData?.data?.hijri)}`}</Text>
        {!!localTime && (
          <Text style={styles.prayerLocalTime}>Waktu setempat: {localTime}{localTz ? ` (${localTz})` : ''}</Text>
        )}
        {!!prayerData?.data?.meta?.method && (
          <Text style={styles.prayerMethod}>Metode: {prayerData.data.meta.method}</Text>
        )}
        {loadingPrayer && (<Text style={styles.prayerLoading}>Memuat jadwal...</Text>)}
        {errorPrayer && (<Text style={styles.prayerError}>{String(errorPrayer)}</Text>)}
        {!loadingPrayer && !errorPrayer && (
          <>
            <View style={styles.prayerStatusRow}>
              {(() => { const d = computeStatusDisplay(statusInfo); return (<><Text style={styles.prayerStatusMain}>{d.main}</Text><Text style={styles.prayerStatusSub}>{d.sub}</Text></>); })()}
            </View>
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
        <FeatureTile title="Surat" desc="Baca Al-Quran per surat" onPress={() => navigation.navigate('SurahList')} />
        <FeatureTile title="Doa" desc="Doa harian dan dzikir" onPress={() => navigation.navigate('DoaList')} />
        <FeatureTile title="Hadits" desc="Kumpulan hadits pilihan" onPress={() => navigation.navigate('HaditsMenu')} />
        <FeatureTile title="Hijriyah" desc="Kalender hijriyah" onPress={() => navigation.navigate('HijriCalendar')} />
        <FeatureTile title="Kiblat" desc="Arah kiblat" onPress={() => navigation.navigate('Qibla')} />
        <FeatureTile title="Sholat" desc="Jadwal sholat" onPress={() => navigation.navigate('SholatJadwal')} />
        <FeatureTile title="Ulama" desc="Data ulama Islam" onPress={() => navigation.navigate('UlamaList')} />
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>© {new Date().getFullYear()} Alquranku</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#f8fafc' },
  brandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  logo: { width: 48, height: 48, marginRight: 8 },
  title: { fontSize: 24, fontWeight: '800', color: '#111', textAlign: 'center' },
  subtitle: { color: '#64748b', marginTop: 4, marginBottom: 16, textAlign: 'center' },
  list: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' },
  card: { padding: 16, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fff', borderRadius: 14, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, marginBottom: 14 },
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
  prayerStatusMain: { color: '#fff', fontWeight: '800' },
  prayerStatusSub: { color: 'rgba(255,255,255,0.9)', marginTop: 2 },
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