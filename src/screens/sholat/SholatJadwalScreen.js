import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { getAladhanHarianCity, getAladhanBulananCity, getAladhanQibla } from '../../api/aladhan';

// Helper untuk mendapatkan tanggal hari ini dalam format yyyy-mm-dd (zona waktu lokal)
const getTodayISO = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export default function SholatJadwalScreen() {
  const [city, setCity] = useState('Kuala Lumpur');
  const [country, setCountry] = useState('Malaysia');
  const [method, setMethod] = useState('2'); // default ISNA

  const [dateString, setDateString] = useState(() => getTodayISO());
  const [tahun, setTahun] = useState(() => String(new Date().getFullYear()));
  const [bulan, setBulan] = useState(() => String(new Date().getMonth() + 1).padStart(2, '0'));

  const [loadingHarian, setLoadingHarian] = useState(false);
  const [loadingBulanan, setLoadingBulanan] = useState(false);
  const [errorHarian, setErrorHarian] = useState(null);
  const [errorBulanan, setErrorBulanan] = useState(null);
  const [dataHarian, setDataHarian] = useState(null);
  const [dataBulanan, setDataBulanan] = useState(null);
  const [statusInfo, setStatusInfo] = useState(null);
  const [qiblaDeg, setQiblaDeg] = useState(null);
  // removed unused alarms/hijriInfo
  // [removed] legacy zone auto-suggest dihapus setelah migrasi ke Aladhan API

  // Lokasi otomatis (web): gunakan Geolocation API + reverse geocoding (Nominatim)
  const [autoLocating, setAutoLocating] = useState(false);
  const [locError, setLocError] = useState(null);

  const fetchHarian = async (_city, _country) => {
    try {
      setLoadingHarian(true);
      setErrorHarian(null);
      setDataHarian(null);
      const cityParam = (_city ?? city).trim();
      const countryParam = (_country ?? country).trim();
      const res = await getAladhanHarianCity(cityParam, countryParam, dateString.trim(), parseInt(method, 10));
      const payload = res?.data ? res : { data: res };
      setDataHarian(payload);
      const jadwal = payload?.data?.jadwal || {};
      const iso = payload?.data?.date || dateString.trim();
      setStatusInfo(computeStatusFromJadwal(iso, jadwal));
      // Qibla dari koordinat meta
      const lat = payload?.data?.meta?.latitude;
      const lon = payload?.data?.meta?.longitude;
      if (typeof lat === 'number' && typeof lon === 'number') {
        try {
          const deg = await getAladhanQibla(lat, lon);
          setQiblaDeg(deg);
        } catch (_) { setQiblaDeg(null); }
      } else { setQiblaDeg(null); }
    } catch (e) {
      setErrorHarian(e?.message || 'Gagal memuat jadwal harian');
    } finally {
      setLoadingHarian(false);
    }
  };

  const fetchBulanan = async (_city, _country) => {
    try {
      setLoadingBulanan(true);
      setErrorBulanan(null);
      setDataBulanan(null);
      const cityParam = (_city ?? city).trim();
      const countryParam = (_country ?? country).trim();
      const res = await getAladhanBulananCity(cityParam, countryParam, tahun.trim(), bulan.trim(), parseInt(method, 10));
      const payload = res?.data ? res : { data: res };
      setDataBulanan(payload);
    } catch (e) {
      setErrorBulanan(e?.message || 'Gagal memuat jadwal bulanan');
    } finally {
      setLoadingBulanan(false);
    }
  };

  const attemptAutoLocate = async () => {
    try {
      setAutoLocating(true);
      setLocError(null);
      setErrorHarian(null);
      
      // Native (Android/iOS) via expo-location
      let coords = null;
      try {
        const isNative = typeof navigator === 'undefined';
        if (isNative) {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') {
            throw new Error('Izin lokasi ditolak');
          }
          const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        }
      } catch (e) {
        // Jika gagal native, akan lanjut coba web
      }
      
      // Web fallback via navigator.geolocation
      if (!coords) {
        if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
          setLocError('Geolocation tidak tersedia di perangkat ini');
          setAutoLocating(false);
          return;
        }
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000,
          });
        });
        coords = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      }
      
      const { latitude, longitude } = coords || {};
      if (typeof latitude !== 'number' || typeof longitude !== 'number') {
        setLocError('Koordinat tidak valid');
        setAutoLocating(false);
        return;
      }
      // Reverse geocoding ke OpenStreetMap Nominatim
      const url = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=jsonv2`;
      const resp = await fetch(url, { headers: { 'Accept': 'application/json' } });
      const json = await resp.json();
      const addr = json?.address || {};
      const resolvedCity = addr.city || addr.town || addr.village || addr.state_district || addr.state || addr.county;
      const resolvedCountry = addr.country || '';
      if (resolvedCity) setCity(resolvedCity);
      if (resolvedCountry) setCountry(resolvedCountry);
      // Setelah set city/country, ambil jadwal harian otomatis
      await fetchHarian(resolvedCity || city, resolvedCountry || country);
      // Ambil bulanan otomatis untuk tahun/bulan sekarang
      await fetchBulanan(resolvedCity || city, resolvedCountry || country);
    } catch (e) {
      setLocError(e?.message || 'Gagal mendeteksi lokasi otomatis');
    } finally {
      setAutoLocating(false);
    }
  };

  useEffect(() => {
    attemptAutoLocate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      return { nextKey: upcoming.key, nextAt: upcoming.at, headerText: `Menuju ${label} dalam ± ${diffMin} menit`, type: 'upcoming', diffMin };
    }
    const last = times[times.length - 1];
    const diffMin = Math.round((now.getTime() - last.at.getTime()) / 60000);
    const label = labelForKey(last.key);
    return { nextKey: null, nextAt: null, headerText: `Waktu ${label} sudah lewat ± ${diffMin} menit yang lalu`, type: 'passed', diffMin, lastKey: last.key };
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
      case 'sunset': return 'Terbenam';
      case 'midnight': return 'Tengah Malam';
      default: return k;
    }
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

  const formatHijriDisplay = (hijri) => {
    if (!hijri) return '';
    const dateStr = hijri?.date; // dd-mm-yyyy
    const parts = String(dateStr || '').split('-');
    const day = parts[0] || '';
    const year = parts[2] || hijri?.year || '';
    const monthName = hijri?.month?.en || hijri?.month?.ar || '';
    return `${day} ${monthName} ${year} H`;
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

  // Tambahan helper untuk tampilan bulanan lebih menarik
  const normalizeToISO = (s) => {
    const str = String(s || '');
    const parts = str.split('-');
    if (parts.length === 3) {
      // yyyy-mm-dd atau dd-mm-yyyy
      if (parts[0].length === 4) return `${parts[0]}-${parts[1].padStart(2,'0')}-${parts[2].padStart(2,'0')}`;
      return `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
    }
    return str;
  };
  const DOW = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
  const getDayNameShort = (iso) => {
    if (!iso) return '';
    const d = new Date(`${iso}T00:00:00`);
    if (Number.isNaN(d.getTime())) return '';
    return DOW[d.getDay()];
  };
  const isSameISO = (a, b) => String(a || '') === String(b || '');

  const JadwalCard = ({ title, children }) => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
  );

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="always">
      <Text style={styles.title}>Jadwal Sholat</Text>
      {/* Deteksi lokasi otomatis dinonaktifkan */}
      {autoLocating && <Text style={{ color: '#94a3b8', marginBottom: 6 }}>Mendeteksi lokasi otomatis...</Text>}
      {!!locError && <Text style={{ color: '#ef4444', marginBottom: 6 }}>{locError}</Text>}
      
      {/* Kartu lokasi sederhana agar mudah */}
      <JadwalCard title="Lokasi">
        <View style={styles.row}>
          <TextInput value={city} onChangeText={setCity} placeholder="Kota" placeholderTextColor="#64748b" autoCorrect={false} autoCapitalize="words" selectTextOnFocus style={[styles.input, styles.inputHalf]} />
          <TextInput value={country} onChangeText={setCountry} placeholder="Negara" placeholderTextColor="#64748b" autoCorrect={false} autoCapitalize="words" selectTextOnFocus style={[styles.input, styles.inputHalf, { marginLeft: 8 }]} />
        </View>
        <View style={styles.chipRow}>
          {['Jakarta','Bandung','Surabaya','Yogyakarta','Denpasar','Medan','Makassar'].map((c) => (
            <TouchableOpacity key={c} style={styles.chipBtn} onPress={() => setCity(c)}>
              <Text style={styles.chipBtnText}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.chipRow}>
          {['Indonesia','Malaysia','Singapore','Brunei'].map((cty) => (
            <TouchableOpacity key={cty} style={styles.chipBtn} onPress={() => setCountry(cty)}>
              <Text style={styles.chipBtnText}>{cty}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={styles.btnGhost} onPress={attemptAutoLocate} disabled={autoLocating}>
          <Text style={styles.btnGhostText}>{autoLocating ? 'Mendeteksi...' : 'Deteksi Lokasi Otomatis'}</Text>
        </TouchableOpacity>
        <Text style={{ color: '#e5e7eb', marginTop: 6 }}>{`${city}, ${country}`}</Text>
      </JadwalCard>

      <JadwalCard title="Harian (yyyy-mm-dd)">
        {/* Input kota/negara dipindah ke kartu Lokasi */}
        <View style={styles.row}>
          <TextInput value={method} onChangeText={setMethod} keyboardType="numeric" placeholder="Metode (kode)" placeholderTextColor="#64748b" style={[styles.input, styles.inputHalf]} />
          <TextInput value={dateString} onChangeText={setDateString} placeholder="Tanggal (yyyy-mm-dd)" placeholderTextColor="#64748b" style={[styles.input, styles.inputHalf, { marginLeft: 8 }]} />
        </View>
        <TouchableOpacity style={styles.btn} onPress={() => fetchHarian()} disabled={loadingHarian}>
          <Text style={styles.btnText}>{loadingHarian ? 'Memuat...' : 'Lihat Harian'}</Text>
        </TouchableOpacity>
        {errorHarian && <Text style={styles.error}>{errorHarian}</Text>}
        {dataHarian && (
          <View style={styles.resultBox}>
            <View style={styles.headerRow}>
              <Text style={styles.headerLeft}>{formatHijriDisplay(dataHarian?.data?.hijri)}</Text>
              <Text style={styles.headerRight}>{formatMasehiDisplay(dataHarian?.data?.date)}</Text>
            </View>
            {(() => { const displayStatus = computeStatusDisplay(statusInfo); return (
              (displayStatus.main || displayStatus.sub) && (
                <View style={styles.statusRow}>
                  <View style={{ flex: 1 }}>
                    {!!displayStatus.main && <Text style={styles.statusMain}>{displayStatus.main}</Text>}
                    {!!displayStatus.sub && <Text style={styles.statusSub}>{displayStatus.sub}</Text>}
                  </View>
                  <TouchableOpacity style={styles.qiblatBtn} onPress={() => {}}>
                    <Text style={styles.qiblatText}>{typeof qiblaDeg === 'number' ? `${Math.round(qiblaDeg)}°` : 'QIBLAT'}</Text>
                  </TouchableOpacity>
                </View>
              )
            ); })()}
            <View style={styles.locRow}>
              <Text style={styles.locIcon}>📍</Text>
              <Text style={styles.locText}>{dataHarian?.data?.lokasi}</Text>
            </View>
            <View style={styles.listBox}>
              {['imsak','subuh','terbit','dzuhur','ashar','maghrib','isya','sunset','midnight'].map((k) => {
                 const v = dataHarian?.data?.jadwal?.[k];
                 if (!v) return null;
                 const isActive = (statusInfo?.nextKey ?? statusInfo?.lastKey) === k;
                 return (
                   <View key={k} style={[styles.listRow, isActive && styles.listRowActive]}>
                     <Text style={[styles.listLabel, isActive && styles.listLabelActive]}>{labelForKey(k)}</Text>
                     <View style={styles.listRight}>
                       <Text style={[styles.listVal, isActive && styles.listValActive]}>{v}</Text>
                     </View>
                   </View>
                 );
               })}
            </View>
            {!!dataHarian?.data?.meta && (
              <View style={{ marginTop: 10 }}>
                <Text style={styles.metaTitle}>Info Lokasi</Text>
                <View style={styles.grid}>
                  <View style={styles.gridRow}><Text style={styles.gridLabel}>Koordinat</Text><Text style={styles.gridVal}>{`${dataHarian.data.meta.latitude}, ${dataHarian.data.meta.longitude}`}</Text></View>
                  <View style={styles.gridRow}><Text style={styles.gridLabel}>Zona Waktu</Text><Text style={styles.gridVal}>{dataHarian.data.meta.timezone}</Text></View>
                  <View style={styles.gridRow}><Text style={styles.gridLabel}>Metode</Text><Text style={styles.gridVal}>{dataHarian.data.meta.method}</Text></View>
                </View>
              </View>
            )}
          </View>
        )}
      </JadwalCard>

      <JadwalCard title="Bulanan (tahun/bulan)">
        {/* Input kota/negara dipindah ke kartu Lokasi */}
        <View style={styles.row}>
          <TextInput value={method} onChangeText={setMethod} keyboardType="numeric" placeholder="Metode (kode)" placeholderTextColor="#64748b" style={[styles.input, styles.inputHalf]} />
          <View style={{ flex: 1, flexDirection: 'row' }}>
            <TextInput value={tahun} onChangeText={setTahun} keyboardType="numeric" placeholder="Tahun (yyyy)" placeholderTextColor="#64748b" style={[styles.input, { flex: 1 }]} />
            <TextInput value={bulan} onChangeText={setBulan} keyboardType="numeric" placeholder="Bulan (1-12)" placeholderTextColor="#64748b" style={[styles.input, { flex: 1, marginLeft: 8 }]} />
          </View>
        </View>
        <TouchableOpacity style={styles.btn} onPress={() => fetchBulanan()} disabled={loadingBulanan}>
          <Text style={styles.btnText}>{loadingBulanan ? 'Memuat...' : 'Lihat Bulanan'}</Text>
        </TouchableOpacity>
        {errorBulanan && <Text style={styles.error}>{errorBulanan}</Text>}
        {Array.isArray(dataBulanan?.data) && (
          <View style={styles.resultBox}>
            <Text style={styles.resultTitle}>{`${city}, ${country}`}</Text>
            <Text style={styles.resultSubtitle}>{MONTH_NAMES[Math.max(0, Math.min(11, parseInt(bulan, 10) - 1))]} {tahun}</Text>
            {(dataBulanan?.data || []).map((j, idx) => {
              const tanggalRaw = j.masihi || j.date || j.tanggal;
              const iso = normalizeToISO(tanggalRaw);
              const dayName = getDayNameShort(iso);
              const isWeekend = dayName === 'Sab' || dayName === 'Min';
              const isToday = isSameISO(iso, getTodayISO());
              const row = {
                imsak: j.imsak,
                subuh: j.subuh,
                terbit: j.terbit,
                dzuhur: j.dzuhur,
                ashar: j.ashar,
                maghrib: j.maghrib,
                isya: j.isya,
                sunset: j.sunset,
                midnight: j.midnight,
              };
              return (
                <View key={idx} style={[styles.dayBox, isWeekend && styles.dayBoxWeekend, isToday && styles.dayBoxToday]}>
                  <View style={styles.dayHeader}>
                    <Text style={styles.dayName}>{dayName}</Text>
                    <Text style={styles.dayDate}>{formatMasehiDisplay(iso || tanggalRaw)}</Text>
                  </View>
                  <View style={styles.timeGrid}>
                    {Object.entries(row).map(([k,v]) => v && (
                      <View key={k} style={styles.timeChip}>
                        <Text style={styles.chipLabel}>{labelForKey(k)}</Text>
                        <Text style={styles.chipVal}>{v}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </JadwalCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  card: { backgroundColor: '#0f172a', borderRadius: 12, padding: 12, marginBottom: 14 },
  cardTitle: { color: '#e2e8f0', fontWeight: '700', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#1f2937', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, color: '#111827', backgroundColor: '#f8fafc', marginBottom: 8 },
  btn: { backgroundColor: '#10b981', borderRadius: 8, paddingVertical: 10, alignItems: 'center', marginTop: 4 },
  btnText: { color: '#fff', fontWeight: '700' },
  error: { color: '#ef4444', marginTop: 6 },
  resultBox: { backgroundColor: '#111827', borderRadius: 12, padding: 12, marginTop: 10 },
  resultTitle: { color: '#e5e7eb', fontWeight: '700', marginBottom: 4 },
  resultSubtitle: { color: '#9ca3af', marginBottom: 8 },
  dayBoxWeekend: { borderColor: '#334155' },
  dayBoxToday: { borderColor: '#d1b892', backgroundColor: '#111827' },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  dayName: { color: '#e5e7eb', fontWeight: '700' },
  dayDate: { color: '#e5e7eb' },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  timeChip: { backgroundColor: '#0f172a', borderColor: '#1f2937', borderWidth: 1, borderRadius: 10, paddingVertical: 6, paddingHorizontal: 10, marginRight: 8, marginBottom: 8 },
  chipLabel: { color: '#9ca3af', fontSize: 12 },
  chipVal: { color: '#e5e7eb', fontWeight: '700' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 2 },
  chipBtn: { backgroundColor: '#0b1220', borderColor: '#1f2937', borderWidth: 1, borderRadius: 20, paddingVertical: 6, paddingHorizontal: 10, marginRight: 8, marginTop: 6 },
  chipBtnText: { color: '#e5e7eb' },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  inputHalf: { flex: 1 },
  dayBox: { backgroundColor: '#0f172a', borderRadius: 8, padding: 8, marginTop: 8 },
  dayTitle: { color: '#9ca3af', fontWeight: '600', marginBottom: 6 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  headerLeft: { color: '#e5e7eb', fontWeight: '700', fontSize: 16 },
  headerRight: { color: '#e5e7eb', fontSize: 16 },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  statusMain: { color: '#9ca3af', fontWeight: '700', letterSpacing: 0.5 },
  statusSub: { color: '#9ca3af', marginTop: 2 },
  qiblatBtn: { backgroundColor: '#f3f4f6', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8 },
  qiblatText: { color: '#111827', fontWeight: '700' },
  locRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, marginBottom: 6 },
  locIcon: { color: '#e5e7eb', marginRight: 6 },
  locText: { color: '#e5e7eb' },
  listBox: { marginTop: 8 },
  listRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#0f172a', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 12, marginBottom: 8 },
  listRowActive: { backgroundColor: '#1f2937' },
  listLabel: { color: '#e5e7eb', fontSize: 16, fontWeight: '600' },
  listLabelActive: { color: '#9ca3af' },
  listRight: { flexDirection: 'row', alignItems: 'center' },
  listVal: { color: '#e5e7eb', fontSize: 16, fontWeight: '700', marginRight: 12 },
  listValActive: { color: '#d1b892' },
  metaTitle: { color: '#e5e7eb', fontWeight: '700', marginTop: 8 },
  btnGhost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#1f2937', borderRadius: 8, paddingVertical: 10, alignItems: 'center', marginTop: 8 },
  btnGhostText: { color: '#e5e7eb', fontWeight: '700' },
});