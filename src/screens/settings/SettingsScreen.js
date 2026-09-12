import React, {useEffect, useState} from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Switch, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAladhanHarianCoords, getAladhanHarianCity } from '../../api/aladhan';
import { schedulePrayerReminders } from '../../api/notifications';
import { useAudioPlayer } from 'expo-audio';
import { Ionicons } from '@expo/vector-icons';
import { emitSettingsChanged } from '../../api/settingsEvents';
import { getKaraokeReciters, getPreferredKaraokeReciter, setPreferredKaraokeReciter } from '../../api/quranAudio';
import { bigGetAllKeys, bigRemoveItem, bigStats } from '../../api/bigStore';
import { listOfflineAudio, deleteAllOfflineAudio } from '../../api/offlineAudio';

// Sumber audio preview (dua-duanya dibundel lewat config plugin expo-notifications)
const ADHAN_PREVIEW = require('../../../assets/sounds/adhan.wav');
const DEFAULT_PREVIEW = require('../../../assets/sounds/default_preview.wav');

// === Pilihan berbahasa manusiawi (nilai tersimpan tetap sama seperti sebelumnya) ===
const METODE_OPSI = [
  { value: '3', label: 'Kementerian Agama / MWL', sub: 'Paling umum dipakai (rekomendasi)' },
  { value: '4', label: 'Makkah (Umm al-Qura)', sub: 'Arab Saudi' },
  { value: '5', label: 'Mesir', sub: 'Egyptian General Authority' },
  { value: '2', label: 'Amerika Utara (ISNA)', sub: 'USA & Kanada' },
  { value: '1', label: 'Pakistan (Karachi)', sub: 'Asia Selatan' },
];
const MADZHAB_OPSI = [
  { value: '0', label: 'Standard (Syafi\u2019i dll.)', sub: 'Ashar saat bayangan sama panjang' },
  { value: '1', label: 'Hanafi', sub: 'Ashar lebih larut (2x panjang bayangan)' },
];

export default function SettingsScreen() {
  const [method, setMethod] = useState('3');
  const [timezonestring, setTimezonestring] = useState('');
  const [tune, setTune] = useState('');
  const [school, setSchool] = useState('0');
  const [midnightMode, setMidnightMode] = useState('');
  const [latitudeAdjustmentMethod, setLatitudeAdjustmentMethod] = useState('');
  const [calendarMethod, setCalendarMethod] = useState('');
  const [shafaq, setShafaq] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null);
  // Notifikasi pengingat waktu sholat
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [notifOffset, setNotifOffset] = useState(0); // menit sebelum waktu sholat
  const [notifSound, setNotifSound] = useState('default'); // 'default' | 'adhan'
  // === Pilihan qari/reciter untuk Mode Karaoke (dipindah dari layar detail surah) ===
  const [karaokeReciters, setKaraokeReciters] = useState([]);
  const [reciterId, setReciterId] = useState(7);
  const [reciterLoaded, setReciterLoaded] = useState(false);
  const [reciterError, setReciterError] = useState(null);
  // === Statistik penyimpanan (audio offline + cache) ===
  const [storage, setStorage] = useState({ audioCount: 0, audioBytes: 0, cacheBytes: 0, cacheCount: 0, loading: true });
  const [confirmClear, setConfirmClear] = useState(null); // 'cache' | 'audio' | null

  // Pemain audio untuk preview suara notifikasi (dirilis otomatis saat unmount)
  const previewSource = notifSound === 'adhan' ? ADHAN_PREVIEW : DEFAULT_PREVIEW;
  const previewPlayer = useAudioPlayer(previewSource);
  const playPreview = () => {
    try {
      previewPlayer.seekTo(0);
      previewPlayer.play();
    } catch (e) {}
  };
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const m = await AsyncStorage.getItem('aladhan_method');
        const tz = await AsyncStorage.getItem('aladhan_timezonestring');
        const tn = await AsyncStorage.getItem('aladhan_tune');
        const sc = await AsyncStorage.getItem('aladhan_school');
        const mm = await AsyncStorage.getItem('aladhan_midnightMode');
        const lam = await AsyncStorage.getItem('aladhan_latitudeAdjustmentMethod');
        const cm = await AsyncStorage.getItem('aladhan_calendarMethod');
        const sf = await AsyncStorage.getItem('aladhan_shafaq');
        const ne = await AsyncStorage.getItem('notif_prayer_enabled');
        const no = await AsyncStorage.getItem('notif_prayer_offset');
        const ns = await AsyncStorage.getItem('notif_prayer_sound');
        if (ne != null) setNotifEnabled(ne !== '0');
        if (no != null && Number.isFinite(parseInt(no, 10))) setNotifOffset(parseInt(no, 10));
        if (ns === 'adhan' || ns === 'default') setNotifSound(ns);
        if (m) setMethod(m);
        if (tz) setTimezonestring(tz);
        if (tn) setTune(tn);
        if (sc) setSchool(sc);
        if (mm) setMidnightMode(mm);
        if (lam) setLatitudeAdjustmentMethod(lam);
        if (cm) setCalendarMethod(cm);
        if (sf) setShafaq(sf);
      } catch (e) {
        console.log('Load settings error', e);
      }
    })();

    // Muat daftar reciter karaoke + pilihan tersimpan
    (async () => {
      try {
        const list = await getKaraokeReciters(false);
        setKaraokeReciters(list);
        setReciterError(null);
      } catch (e) {
        try {
          const stale = await getKaraokeReciters(true); // cache usang pun lebih baik daripada kosong
          setKaraokeReciters(stale || []);
        } catch {}
        setReciterError('Daftar qari perlu internet. Sambungkan internet lalu buka lagi.');
      } finally {
        try {
          const pref = await getPreferredKaraokeReciter();
          if (pref != null) setReciterId(pref);
        } catch {}
        setReciterLoaded(true);
      }
    })();
  }, []);

  const pickReciter = async (id) => {
    setReciterId(id);
    try { await setPreferredKaraokeReciter(id); } catch {}
  };

  // === Muat statistik penyimpanan ===
  const refreshStorageStats = async () => {
    try {
      const [audio, cache] = await Promise.all([
        listOfflineAudio(),
        bigStats('cache:quran:'),
      ]);
      setStorage({
        audioCount: audio.length,
        audioBytes: audio.reduce((s, m) => s + (m.size || m.bytes || 0), 0),
        cacheBytes: cache.totalBytes || 0,
        cacheCount: cache.count || 0,
        loading: false,
      });
    } catch {
      setStorage((s) => ({ ...s, loading: false }));
    }
  };
  useEffect(() => { refreshStorageStats(); }, []);

  const fmtMB = (b) => (!b || b <= 0 ? '0 KB' : b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

  const clearQuranCacheOnly = async () => {
    try {
      const keys = await bigGetAllKeys('cache:quran:');
      for (const k of keys) await bigRemoveItem(k);
    } catch {}
    refreshStorageStats();
  };

  const clearAllAudio = async () => {
    try { await deleteAllOfflineAudio(); } catch {}
    refreshStorageStats();
  };

  const saveAll = async () => {
    const errors = [];
    if (tune) {
      const parts = tune.split(',').map(s => s.trim());
      if (parts.length !== 8 || parts.some(p => isNaN(parseInt(p)))) {
        errors.push('Penyesuaian menit harus 8 angka dipisah koma.');
      }
    }
    if (errors.length) {
      setSaveMsg({ ok: false, text: 'Periksa: ' + errors.join(' ') });
      return;
    }
    try {
      await AsyncStorage.setItem('aladhan_method', method || '3');
      await AsyncStorage.setItem('aladhan_timezonestring', timezonestring || '');
      await AsyncStorage.setItem('aladhan_tune', tune || '');
      await AsyncStorage.setItem('aladhan_school', school || '0');
      await AsyncStorage.setItem('aladhan_midnightMode', midnightMode || '');
      await AsyncStorage.setItem('aladhan_latitudeAdjustmentMethod', latitudeAdjustmentMethod || '');
      await AsyncStorage.setItem('aladhan_calendarMethod', calendarMethod || '');
      await AsyncStorage.setItem('aladhan_shafaq', shafaq || '');
      // tandai pembaruan pengaturan agar screen lain dapat refresh otomatis
      await AsyncStorage.setItem('settings:sholat:lastUpdated', String(Date.now()));
      // Beri tahu layar lain (Home, dst.) tanpa polling — event langsung, hemat baterai
      emitSettingsChanged();
      setSaveMsg({ ok: true, text: 'Tersimpan. Jadwal sholat akan menyesuaikan otomatis.' });
    } catch (e) {
      setSaveMsg({ ok: false, text: 'Gagal menyimpan pengaturan.' });
    }
  };

  // Simpan preferensi notifikasi lalu jadwalkan ulang pengingat berdasarkan jadwal hari ini
  const applyNotificationSettings = async (enabled, offset, sound = notifSound) => {
    try {
      await AsyncStorage.setItem('notif_prayer_enabled', enabled ? '1' : '0');
      await AsyncStorage.setItem('notif_prayer_offset', String(offset));
      await AsyncStorage.setItem('notif_prayer_sound', sound === 'adhan' ? 'adhan' : 'default');
    } catch (e) {}
    if (!enabled) {
      try { await schedulePrayerReminders({ enabled: false }); } catch (e) {}
      return;
    }
    try {
      const iso = new Date().toISOString().slice(0, 10);
      const toNum = (v) => { const n = Number(v); return Number.isFinite(n) ? n : undefined; };
      const options = {
        method: toNum(method) ?? 3,
        timezonestring: timezonestring || undefined,
        tune: tune || undefined,
        school: toNum(school),
        midnightMode: toNum(midnightMode),
        latitudeAdjustmentMethod: toNum(latitudeAdjustmentMethod),
        calendarMethod: toNum(calendarMethod),
        shafaq: (shafaq || '').trim() || undefined,
      };
      let jadwal = null;
      // Coba koordinat terakhir yang diketahui, fallback ke lokasi via IP
      let lat = null, lon = null;
      try {
        const la = await AsyncStorage.getItem('last_lat');
        const lo = await AsyncStorage.getItem('last_lon');
        if (la != null && lo != null) { lat = parseFloat(la); lon = parseFloat(lo); }
      } catch (e) {}
      if (lat == null && typeof navigator !== 'undefined' && 'geolocation' in navigator) {
        try {
          await new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
              (pos) => { lat = pos.coords.latitude; lon = pos.coords.longitude; resolve(); },
              () => resolve(),
              { enableHighAccuracy: true, maximumAge: 60000, timeout: 8000 }
            );
          });
        } catch (e) {}
      }
      if (lat != null && lon != null) {
        const res = await getAladhanHarianCoords(lat, lon, iso, options);
        jadwal = res?.data?.jadwal || null;
      } else {
        try {
          const resp = await fetch('https://ipapi.co/json');
          const json = await resp.json();
          const city = json?.city || json?.region || 'Jakarta';
          const country = json?.country_name || 'Indonesia';
          const res = await getAladhanHarianCity(city, country, iso, options);
          jadwal = res?.data?.jadwal || null;
        } catch (e) {}
      }
      if (!jadwal) {
        if (Platform.OS !== 'web') alert('Tidak bisa mengambil jadwal sholat. Cek koneksi internet lalu coba lagi.');
        return;
      }
      const result = await schedulePrayerReminders({ jadwal, offsetMinutes: offset, enabled: true, soundChoice: sound === 'adhan' ? 'adhan' : 'default' });
      if (Platform.OS !== 'web') {
        if (result?.reason === 'permission') alert('Izin notifikasi belum diberikan. Aktifkan izin notifikasi untuk aplikasi di pengaturan perangkat.');
        else alert(`Pengingat waktu sholat dijadwalkan (${result?.scheduled ?? 0} waktu).`);
      }
    } catch (e) {
      if (Platform.OS !== 'web') alert('Gagal menjadwalkan pengingat. Coba lagi.');
    }
  };

  const resetDefaults = () => {
    setMethod('3');
    setSchool('0');
    setMidnightMode('');
    setLatitudeAdjustmentMethod('');
    setShafaq('');
    setTimezonestring('');
    setTune('');
    setCalendarMethod('');
    setSaveMsg(null);
  };

  const detectTimezone = () => {
    try {
      const tz = Intl?.DateTimeFormat?.().resolvedOptions?.().timeZone;
      if (tz) {
        setTimezonestring(tz);
      } else {
        alert('Gagal mendeteksi zona waktu otomatis.');
      }
    } catch (e) {
      alert('Gagal mendeteksi zona waktu otomatis.');
    }
  };

  const doPreview = async () => {
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const iso = new Date().toISOString().slice(0, 10);
      const toNum = (v) => { const n = Number(v); return Number.isFinite(n) ? n : undefined; };
      const options = {
        method: toNum(method) ?? 3,
        timezonestring: timezonestring || undefined,
        tune: tune || undefined,
        school: toNum(school),
        midnightMode: toNum(midnightMode),
        latitudeAdjustmentMethod: toNum(latitudeAdjustmentMethod),
        calendarMethod: toNum(calendarMethod),
        shafaq: (shafaq || '').trim() || undefined,
      };
      let lat = null, lon = null;
      if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
        try {
          await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
              (pos) => { lat = pos.coords.latitude; lon = pos.coords.longitude; resolve(); },
              (err) => { resolve(); },
              { enableHighAccuracy: true, maximumAge: 10000, timeout: 8000 }
            );
          });
        } catch {}
      }
      if (lat != null && lon != null) {
        const res = await getAladhanHarianCoords(lat, lon, iso, options);
        setPreview(res?.data || null);
      } else {
        try {
          const resp = await fetch('https://ipapi.co/json');
          const json = await resp.json();
          const city = json?.city || json?.region || json?.region_code || 'Jakarta';
          const country = json?.country_name || json?.country || 'Indonesia';
          const res = await getAladhanHarianCity(city, country, iso, options);
          setPreview(res?.data || null);
        } catch (e) {
          setPreviewError('Gagal mendeteksi lokasi untuk pratinjau.');
        }
      }
    } catch (e) {
      setPreviewError(e?.message || 'Gagal memuat pratinjau');
    } finally {
      setPreviewLoading(false);
    }
  };

  const OptionCard = ({ option, active, onPress }) => (
    <TouchableOpacity
      onPress={onPress}
      style={{
        width: '100%', paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12, marginBottom: 8,
        borderWidth: 2, borderColor: active ? '#7c3aed' : '#e5e7eb', backgroundColor: active ? '#f5f3ff' : '#ffffff',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={{ flex: 1, fontWeight: '700', fontSize: 14, color: active ? '#4c1d95' : '#111827' }}>{option.label}</Text>
        {active ? <Ionicons name="checkmark-circle" size={18} color="#7c3aed" /> : null}
      </View>
      {!!option.sub && <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{option.sub}</Text>}
    </TouchableOpacity>
  );

  const Chip = ({ label, active, onPress }) => (
    <TouchableOpacity onPress={onPress} style={{
      paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1,
      borderColor: active ? '#4c1d95' : '#e5e7eb', backgroundColor: active ? '#ede9fe' : '#fff', marginRight: 8, marginBottom: 8
    }}>
      <Text style={{ fontSize: 12, fontWeight: '700', color: active ? '#4c1d95' : '#111827' }}>{label}</Text>
    </TouchableOpacity>
  );

  const InputRow = ({label, value, onChangeText, placeholder, help}) => (
    <View style={{marginBottom: 14}}>
      <Text style={{fontWeight: 'bold', marginBottom: 6}}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        style={{borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10}}
      />
      {!!help && <Text style={{ color: '#64748b', fontSize: 12, marginTop: 6 }}>{help}</Text>}
    </View>
  );

  return (
    <ScrollView contentContainerStyle={{padding: 16}}>

      {/* ============ 1. NOTIFIKASI PENGINGAT SHOLAT ============ */}
      <Text style={{fontSize: 18, fontWeight: 'bold', marginBottom: 2}}>Pengingat Waktu Sholat</Text>
      <Text style={{ color: '#6b7280', marginBottom: 10 }}>Notifikasi otomatis setiap waktu sholat.</Text>
      <View style={{ backgroundColor: '#f5f3ff', borderWidth: 1, borderColor: '#ddd6fe', borderRadius: 12, padding: 12, marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
            <Text style={{ fontWeight: 'bold', color: '#4c1d95' }}>Aktifkan pengingat</Text>
            <Text style={{ color: '#6b7280', fontSize: 12, marginTop: 2 }}>Subuh, Dzuhur, Ashar, Maghrib, Isya</Text>
          </View>
          <Switch
            value={notifEnabled}
            onValueChange={(v) => {
              setNotifEnabled(v);
              applyNotificationSettings(v, notifOffset);
            }}
            trackColor={{ false: '#e5e7eb', true: '#8b5cf6' }}
            thumbColor={notifEnabled ? '#ffffff' : '#f4f4f5'}
          />
        </View>
        {notifEnabled && (
          <View style={{ marginTop: 10 }}>
            <Text style={{ fontWeight: 'bold', marginBottom: 6 }}>Kapan diingatkan?</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              <Chip label="Tepat waktu" active={notifOffset === 0} onPress={() => { setNotifOffset(0); applyNotificationSettings(true, 0); }} />
              <Chip label="5 menit sebelum" active={notifOffset === 5} onPress={() => { setNotifOffset(5); applyNotificationSettings(true, 5); }} />
              <Chip label="10 menit sebelum" active={notifOffset === 10} onPress={() => { setNotifOffset(10); applyNotificationSettings(true, 10); }} />
              <Chip label="15 menit sebelum" active={notifOffset === 15} onPress={() => { setNotifOffset(15); applyNotificationSettings(true, 15); }} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
              <Text style={{ fontWeight: 'bold', marginBottom: 0 }}>Suara notifikasi</Text>
              <TouchableOpacity
                onPress={playPreview}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 10, backgroundColor: '#ede9fe', borderColor: '#c4b5fd', borderWidth: 1, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10 }}
                activeOpacity={0.7}
              >
                <Ionicons name="volume-high-outline" size={12} color="#4c1d95" />
                <Text style={{ color: '#4c1d95', fontWeight: '700', fontSize: 11 }}>Dengarkan contoh</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 }}>
              <Chip label="Bunyi biasa" active={notifSound === 'default'} onPress={() => { setNotifSound('default'); applyNotificationSettings(true, notifOffset, 'default'); }} />
              <Chip label="Suara adzan" active={notifSound === 'adhan'} onPress={() => { setNotifSound('adhan'); applyNotificationSettings(true, notifOffset, 'adhan'); }} />
            </View>
          </View>
        )}
      </View>

      {/* ============ QARI UNTUK MODE KARAOKE ============ */}
      <Text style={{fontSize: 18, fontWeight: 'bold', marginBottom: 2}}>Qari Al-Qur'an</Text>
      <Text style={{ color: '#6b7280', marginBottom: 10 }}>Suara bacaan untuk Mode Karaoke di layar surat. Bisa diunduh per surah untuk dipakai offline.</Text>
      {reciterError ? <Text style={{ color: '#b45309', marginBottom: 8, fontWeight: '600' }}>{reciterError}</Text> : null}
      {!reciterLoaded && karaokeReciters.length === 0 ? (
        <Text style={{ color: '#6b7280', marginBottom: 8 }}>Memuat daftar qari…</Text>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {karaokeReciters.map((r) => (
            <Chip
              key={`reciter-${r.id}`}
              label={r.name + (r.style ? ` — ${r.style}` : '')}
              active={reciterId === r.id}
              onPress={() => pickReciter(r.id)}
            />
          ))}
        </View>
      )}

      {/* ============ PENYIMPANAN ============ */}
      <Text style={{fontSize: 18, fontWeight: 'bold', marginBottom: 2}}>Penyimpanan</Text>
      <Text style={{ color: '#6b7280', marginBottom: 10 }}>Ruang yang dipakai audio bacaan & data offline di HP ini.</Text>
      <View style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 14, marginBottom: 8 }}>
        {storage.loading ? (
          <Text style={{ color: '#6b7280' }}>Menghitung…</Text>
        ) : (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
              <Ionicons name="musical-notes-outline" size={18} color="#7c3aed" />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={{ fontWeight: 'bold' }}>Audio offline</Text>
                <Text style={{ color: '#6b7280', fontSize: 12 }}>{storage.audioCount} surah • {fmtMB(storage.audioBytes)}</Text>
              </View>
              {storage.audioCount > 0 && (
                <TouchableOpacity
                  onPress={() => (confirmClear === 'audio' ? (setConfirmClear(null), clearAllAudio()) : setConfirmClear('audio'))}
                  style={{ backgroundColor: confirmClear === 'audio' ? '#dc2626' : '#fef2f2', borderWidth: 1, borderColor: confirmClear === 'audio' ? '#dc2626' : '#fecaca', borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 }}
                >
                  <Text style={{ color: confirmClear === 'audio' ? '#fff' : '#b91c1c', fontWeight: '700', fontSize: 12 }}>
                    {confirmClear === 'audio' ? 'Yakin? Ketuk lagi' : 'Hapus'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
              <Ionicons name="cloud-download-outline" size={18} color="#3730a3" />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={{ fontWeight: 'bold' }}>Cache Al-Qur'an</Text>
                <Text style={{ color: '#6b7280', fontSize: 12 }}>{storage.cacheCount} data • {fmtMB(storage.cacheBytes)}</Text>
              </View>
              {storage.cacheCount > 0 && (
                <TouchableOpacity
                  onPress={() => (confirmClear === 'cache' ? (setConfirmClear(null), clearQuranCacheOnly()) : setConfirmClear('cache'))}
                  style={{ backgroundColor: confirmClear === 'cache' ? '#dc2626' : '#fef2f2', borderWidth: 1, borderColor: confirmClear === 'cache' ? '#dc2626' : '#fecaca', borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 }}
                >
                  <Text style={{ color: confirmClear === 'cache' ? '#fff' : '#b91c1c', fontWeight: '700', fontSize: 12 }}>
                    {confirmClear === 'cache' ? 'Yakin? Ketuk lagi' : 'Bersihkan'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={{ borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 10, flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="stats-chart-outline" size={16} color="#374151" />
              <Text style={{ marginLeft: 10, fontWeight: '800', color: '#111827' }}>
                Total: {fmtMB(storage.audioBytes + storage.cacheBytes)}
              </Text>
              <TouchableOpacity onPress={refreshStorageStats} style={{ marginLeft: 'auto' }}>
                <Ionicons name="refresh" size={16} color="#7c3aed" />
              </TouchableOpacity>
            </View>
            {confirmClear && (
              <Text style={{ color: '#b45309', fontSize: 11, marginTop: 8, fontWeight: '600' }}>
                Ketuk tombol sekali lagi untuk menghapus permanen.
              </Text>
            )}
          </>
        )}
      </View>

      {/* ============ 2. METODE PERHITUNGAN SHOLAT ============ */}
      <Text style={{fontSize: 18, fontWeight: 'bold', marginBottom: 2}}>Perhitungan Jadwal Sholat</Text>
      <Text style={{ color: '#6b7280', marginBottom: 10 }}>Jika waktu sholat di tempatmu terasa kurang pas, ubah pengaturan di sini.</Text>

      <Text style={{ fontWeight: 'bold', marginBottom: 8 }}>Standar yang diikuti</Text>
      {METODE_OPSI.map((o) => (
        <OptionCard key={o.value} option={o} active={method === o.value} onPress={() => setMethod(o.value)} />
      ))}

      <Text style={{ fontWeight: 'bold', marginTop: 12, marginBottom: 8 }}>Madzhab (untuk waktu Ashar)</Text>
      {MADZHAB_OPSI.map((o) => (
        <OptionCard key={o.value} option={o} active={school === o.value} onPress={() => setSchool(o.value)} />
      ))}

      {saveMsg && (
        <Text style={{ color: saveMsg.ok ? '#15803d' : '#b91c1c', fontWeight: '600', marginTop: 10 }}>{saveMsg.text}</Text>
      )}
      <TouchableOpacity onPress={saveAll} style={{ backgroundColor: '#7c3aed', padding: 14, borderRadius: 12, marginTop: 12, alignItems: 'center' }}>
        <Text style={{ color: '#fff', fontWeight: 'bold' }}>Simpan Pengaturan Sholat</Text>
      </TouchableOpacity>

      {/* ============ 3. PRATINJAU JADWAL ============ */}
      <View style={{ backgroundColor: '#eef2ff', borderWidth: 1, borderColor: '#c7d2fe', borderRadius: 12, padding: 12, marginTop: 16, marginBottom: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ fontWeight: 'bold', color: '#3730a3', flex: 1, minWidth: 0 }}>Pratinjau jadwal hari ini</Text>
          <TouchableOpacity onPress={doPreview} style={{ backgroundColor: '#3730a3', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginLeft: 12, flexShrink: 0 }}>
            <Text style={{ color: '#fff', fontWeight: '600' }}>Cek</Text>
          </TouchableOpacity>
        </View>
        {previewLoading && <Text style={{ color: '#3730a3', marginTop: 8 }}>Memuat…</Text>}
        {!!previewError && <Text style={{ color: '#b91c1c', marginTop: 8 }}>{previewError}</Text>}
        {!!preview && (
          <View style={{ marginTop: 8 }}>
            <Text style={{ color: '#1f2937', marginBottom: 6 }}>Lokasi: {preview?.lokasi}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              <View style={{ width: '50%', paddingRight: 8, marginBottom: 6 }}><Text style={{ color: '#111827' }}>Subuh: {preview?.jadwal?.subuh}</Text></View>
              <View style={{ width: '50%', paddingLeft: 8, marginBottom: 6 }}><Text style={{ color: '#111827' }}>Dzuhur: {preview?.jadwal?.dzuhur}</Text></View>
              <View style={{ width: '50%', paddingRight: 8, marginBottom: 6 }}><Text style={{ color: '#111827' }}>Ashar: {preview?.jadwal?.ashar}</Text></View>
              <View style={{ width: '50%', paddingLeft: 8, marginBottom: 6 }}><Text style={{ color: '#111827' }}>Maghrib: {preview?.jadwal?.maghrib}</Text></View>
              <View style={{ width: '50%', paddingRight: 8, marginBottom: 6 }}><Text style={{ color: '#111827' }}>Isya: {preview?.jadwal?.isya}</Text></View>
            </View>
          </View>
        )}
      </View>

      {/* ============ 4. PENGATURAN TEKNIS (tersembunyi) ============ */}
      <TouchableOpacity
        onPress={() => setShowAdvanced(s => !s)}
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12, backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb' }}
      >
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text style={{ fontWeight: 'bold' }}>Pengaturan teknis</Text>
          <Text style={{ color: '#6b7280', fontSize: 12, marginTop: 2 }}>Zona waktu, penyesuaian menit, dan parameter khusus. Kosongkan jika ragu.</Text>
        </View>
        <Ionicons name={showAdvanced ? 'chevron-up' : 'chevron-down'} size={18} color="#6b7280" />
      </TouchableOpacity>
      {showAdvanced && (
        <>
          <View style={{ marginTop: 12 }}>
            <InputRow label="Zona waktu (timezone)" value={timezonestring} onChangeText={setTimezonestring} placeholder="Contoh: Asia/Jakarta" help="Kosongkan untuk deteksi otomatis dari perangkat." />
            <TouchableOpacity onPress={detectTimezone} style={{ alignSelf: 'flex-start', backgroundColor: '#eef2ff', borderWidth: 1, borderColor: '#c7d2fe', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, marginBottom: 14 }}>
              <Text style={{ color: '#3730a3', fontWeight: '600' }}>Deteksi otomatis zona waktu</Text>
            </TouchableOpacity>
            <InputRow label="Penyesuaian menit (tune)" value={tune} onChangeText={setTune} placeholder="Contoh: 0,0,0,0,0,0,0,0" help="Geser jadwal beberapa menit. Urutan: Imsak, Subuh, Terbit, Dzuhur, Ashar, Maghrib, Isya, Tengah malam — dipisah koma." />
            <InputRow label="Mode tengah malam (midnightMode)" value={midnightMode} onChangeText={setMidnightMode} placeholder="0, 1, atau 2" help="0 = standar, 1 = Jafari, 2 = tengah malam sun ke-3 Isya. Biarkan kosong jika ragu." />
            <InputRow label="Penyesuaian lintang tinggi (latitudeAdjustment)" value={latitudeAdjustmentMethod} onChangeText={setLatitudeAdjustmentMethod} placeholder="1, 2, atau 3" help="Hanya relevan di negara ber-musim ekstrem (mis. Eropa Utara)." />
            <InputRow label="Shafaq" value={shafaq} onChangeText={setShafaq} placeholder="general, ahmer, atau abyad" help="Definisi senja untuk waktu Isya. Biarkan kosong jika ragu." />
            <InputRow label="Metode kalender hijriah (calendarMethod)" value={calendarMethod} onChangeText={setCalendarMethod} placeholder="Opsional" help="Angka sesuai dokumentasi AlAdhan. Kosongkan jika ragu." />
          </View>
          <View style={{ flexDirection: 'row', marginBottom: 24 }}>
            <TouchableOpacity onPress={resetDefaults} style={{ backgroundColor: '#f3f4f6', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', marginRight: 8 }}>
              <Text style={{ color: '#111827', textAlign: 'center', fontWeight: 'bold' }}>Kembalikan Awal</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={saveAll} style={{ backgroundColor: '#7c3aed', padding: 12, borderRadius: 8, flex: 1, alignItems: 'center' }}>
              <Text style={{ color: '#fff', textAlign: 'center', fontWeight: 'bold' }}>Simpan</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </ScrollView>
  );
}
