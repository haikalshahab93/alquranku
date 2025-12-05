import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { theme } from '../../ui';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getAladhanHarianCity, getAladhanHarianCoords } from '../../api/aladhan';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

export default function SholatJadwalScreen() {
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [data, setData] = useState(null);
  const [now, setNow] = useState(new Date());
  const [lat, setLat] = useState(null);
  const [lon, setLon] = useState(null);

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

  // Fallback lokasi berbasis IP jika geolocation tidak tersedia/ditolak
  const fetchIpLocation = async () => {
    try {
      const resp = await fetch('https://ipapi.co/json');
      const json = await resp.json();
      const ipLat = json?.latitude; const ipLon = json?.longitude;
      if (ipLat && ipLon) { setLat(ipLat); setLon(ipLon); }
      setCity(json?.city || json?.region || json?.region_code || '');
      setCountry(json?.country_name || json?.country || '');
    } catch {}
  };

  // Tick time every second for countdown
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(id); }, []);

  // Detect location (GPS or browser) and fill city/country
  useEffect(() => { (async () => { try {
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
      } catch { await fetchIpLocation(); }
    } else {
      if ('geolocation' in navigator) {
        const pos = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 }));
        const { latitude, longitude } = pos.coords; setLat(latitude); setLon(longitude);
        try {
          const url = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=jsonv2`;
          const resp = await fetch(url); const json = await resp.json(); const addr = json?.address || {};
          setCity(addr.city || addr.town || addr.village || addr.state_district || addr.state || addr.county || '');
          setCountry(addr.country || '');
        } catch { await fetchIpLocation(); }
      } else {
        await fetchIpLocation();
      }
    }
  } catch (e) { console.warn(e); await fetchIpLocation(); } })(); }, []);

  // Mulai "watch" posisi agar lat/lon otomatis ikut bergerak saat pengguna pindah lokasi (web & native)
  useEffect(() => {
    let sub; // expo-location subscription (native)
    let watchId; // geolocation watch id (web)
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
            (err) => { /* silent */ },
            { enableHighAccuracy: true, maximumAge: 10000 }
          );
        }
      } catch (e) {
        // ignore
      }
    })();
    return () => {
      try { if (sub && typeof sub.remove === 'function') sub.remove(); } catch {}
      try { if (watchId != null && 'geolocation' in navigator) navigator.geolocation.clearWatch(watchId); } catch {}
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

  const readableDate = useMemo(() => {
    const s = data?.date;
    let dObj = now;
    if (typeof s === 'string' && /^\d{1,2}-\d{1,2}-\d{4}$/.test(s)) {
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
    <ScrollView style={{ flex: 1, backgroundColor: '#f4f4f4' }}>
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

      <View style={{ backgroundColor: '#fff', marginTop: -18, marginHorizontal: 12, borderRadius: 16, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 }}>
        <View style={{ padding: 16, borderBottomWidth: 1, borderColor: '#eee' }}>
          <Text style={{ textAlign: 'center', fontWeight: '600' }}>{readableDate}</Text>
          <Text style={{ textAlign: 'center', color: '#666', marginTop: 4 }}>{hijri}</Text>
          {tzNow ? <Text style={{ textAlign: 'center', color: '#999', marginTop: 4, fontSize: 12 }}>Zona waktu (sekarang): {tzNow}</Text> : null}
          {tzApi ? <Text style={{ textAlign: 'center', color: '#999', marginTop: 2, fontSize: 12 }}>Zona waktu (API): {tzApi}</Text> : null}
          {coordText ? <Text style={{ textAlign: 'center', color: '#999', marginTop: 2, fontSize: 12 }}>Coords: {coordText}</Text> : null}
          {methodName ? <Text style={{ textAlign: 'center', color: '#999', marginTop: 2, fontSize: 12 }}>Method: {methodName}</Text> : null}
        </View>
        {timesFull.map(t => {
          const active = curNext.cur?.key === t.key; return (
            <View key={t.key} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderColor: '#f0f0f0' }}>
              <Text style={{ fontSize: 16, color: '#222' }}>{t.label}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 18, borderWidth: active ? 2 : 1, borderColor: active ? theme.colors.primary : '#ddd' }}>
                  <Text style={{ fontWeight: '600', color: active ? theme.colors.primary : '#333' }}>{t.display || displayFromApi(t.raw)}</Text>
                </View>
                <Ionicons name={active ? 'volume-high' : 'volume-mute'} size={18} color={active ? theme.colors.primary : '#bbb'} style={{ marginLeft: 8 }} />
              </View>
            </View>
          );
        })}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 14 }}>
          <TouchableOpacity style={{ backgroundColor: theme.colors.primary, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14 }}>
            <Text style={{ color: '#fff', fontWeight: '600' }}>{curNext.cur?.label ? 'Prayers' : 'Loading'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ borderColor: '#ddd', borderWidth: 1, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14 }}>
            <Text style={{ color: '#333' }}>{hijri ? 'Hijri' : '—'}</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}