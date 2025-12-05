import React, {useEffect, useState} from 'react';
import {View, Text, TextInput, TouchableOpacity, ScrollView} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAladhanHarianCoords, getAladhanHarianCity } from '../../api/aladhan';

export default function SettingsScreen() {
  const [method, setMethod] = useState('3');
  const [timezonestring, setTimezonestring] = useState('');
  const [tune, setTune] = useState('');
  const [school, setSchool] = useState(''); // 0: Shafi/Standard, 1: Hanafi
  const [midnightMode, setMidnightMode] = useState(''); // 0: Standard, 1: Jafari, 2: Midnight
  const [latitudeAdjustmentMethod, setLatitudeAdjustmentMethod] = useState(''); // 1: Middle of night, 2: One seventh, 3: Angle based
  const [calendarMethod, setCalendarMethod] = useState(''); // 0: Umm al-Qura, 1: North America, 2: ISNA, etc.
  const [shafaq, setShafaq] = useState(''); // general, ahmer, abyad
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(null);
  const LABELS = {
    method: {
      '1': 'Karachi (University of Islamic Sciences)',
      '2': 'ISNA (Islamic Society of North America)',
      '3': 'MWL (Muslim World League)',
      '4': 'Umm al-Qura, Makkah',
      '5': 'Egyptian General Authority of Survey',
    },
    school: { '0': 'Standard/Shafi', '1': 'Hanafi' },
    midnightMode: { '0': 'Standard', '1': 'Jafari', '2': 'Midnight' },
    latitudeAdjustmentMethod: { '1': 'Middle of night', '2': 'One seventh', '3': 'Angle based' },
    shafaq: { general: 'general', ahmer: 'ahmer', abyad: 'abyad' },
  };
  const selectedLabels = {
    method: LABELS.method[method] || `Custom (${method || '-'})`,
    school: LABELS.school[school] || `Custom (${school || '-'})`,
    midnightMode: LABELS.midnightMode[midnightMode] || `Custom (${midnightMode || '-'})`,
    latitudeAdjustmentMethod: LABELS.latitudeAdjustmentMethod[latitudeAdjustmentMethod] || `Custom (${latitudeAdjustmentMethod || '-'})`,
    shafaq: LABELS.shafaq[shafaq] || `Custom (${shafaq || '-'})`,
  };

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
  }, []);

  const saveAll = async () => {
    // Validasi sederhana sebelum menyimpan
    const errors = [];
    const allowedMethods = ['1','2','3','4','5'];
    const allowedSchool = ['0','1'];
    const allowedMidnight = ['0','1','2'];
    const allowedLatAdj = ['1','2','3'];
    const allowedShafaq = ['general','ahmer','abyad'];
    if (!!method && !allowedMethods.includes(method)) errors.push('Method tidak valid. Gunakan opsi cepat atau angka yang dikenal (1/2/3/4/5).');
    if (!!school && !allowedSchool.includes(school)) errors.push('School harus 0 (Standard/Shafi) atau 1 (Hanafi).');
    if (!!midnightMode && !allowedMidnight.includes(midnightMode)) errors.push('Midnight Mode harus 0/1/2.');
    if (!!latitudeAdjustmentMethod && !allowedLatAdj.includes(latitudeAdjustmentMethod)) errors.push('Latitude Adjustment Method harus 1/2/3.');
    if (!!shafaq && !allowedShafaq.includes(shafaq)) errors.push('Shafaq harus general/ahmer/abyad.');
    if (tune) {
      const parts = tune.split(',').map(s => s.trim());
      if (parts.length !== 8 || parts.some(p => isNaN(parseInt(p)))) {
        errors.push('Format Tune harus 8 angka dipisah koma (Imsak,Fajr,Sunrise,Dhuhr,Asr,Maghrib,Isha,Midnight).');
      }
    }
    if (errors.length) {
      alert('Periksa pengaturan:\n- ' + errors.join('\n- '));
      return;
    }
    try {
      await AsyncStorage.setItem('aladhan_method', method || '3');
      await AsyncStorage.setItem('aladhan_timezonestring', timezonestring || '');
      await AsyncStorage.setItem('aladhan_tune', tune || '');
      await AsyncStorage.setItem('aladhan_school', school || '');
      await AsyncStorage.setItem('aladhan_midnightMode', midnightMode || '');
      await AsyncStorage.setItem('aladhan_latitudeAdjustmentMethod', latitudeAdjustmentMethod || '');
      await AsyncStorage.setItem('aladhan_calendarMethod', calendarMethod || '');
      await AsyncStorage.setItem('aladhan_shafaq', shafaq || '');
      // tandai pembaruan pengaturan agar screen lain dapat refresh otomatis
      await AsyncStorage.setItem('settings:sholat:lastUpdated', String(Date.now()));
      alert('Pengaturan kalkulasi sholat disimpan. Jadwal sholat akan diperbarui otomatis.');
    } catch (e) {
      alert('Gagal menyimpan pengaturan');
    }
  }

  const resetDefaults = () => {
    setMethod('3'); // Muslim World League
    setSchool('0'); // Standard/Shafi
    setMidnightMode('0'); // Standard
    setLatitudeAdjustmentMethod('3'); // Angle based
    setShafaq('general');
    setTimezonestring('');
    setTune('');
    setCalendarMethod('');
  };

  const detectTimezone = () => {
    try {
      const tz = Intl?.DateTimeFormat?.().resolvedOptions?.().timeZone;
      if (tz) {
        setTimezonestring(tz);
        alert(`Timezone terdeteksi: ${tz}`);
      } else {
        alert('Gagal mendeteksi timezone otomatis.');
      }
    } catch (e) {
      alert('Gagal mendeteksi timezone otomatis.');
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
          setPreviewError('Gagal mendeteksi lokasi untuk preview.');
        }
      }
    } catch (e) {
      setPreviewError(e?.message || 'Gagal memuat preview');
    } finally {
      setPreviewLoading(false);
    }
  };

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
      <Text style={{fontSize: 18, fontWeight: 'bold', marginBottom: 6}}>Pengaturan Jadwal Sholat (AlAdhan)</Text>
      <Text style={{ color: '#374151', marginBottom: 12 }}>Sesuaikan cara perhitungan jadwal sholat. Gunakan opsi cepat di bawah agar lebih mudah dimengerti.</Text>
      {/* Ringkasan singkat pilihan saat ini */}
      <View style={{ backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 12, marginBottom: 12 }}>
        <Text style={{ fontWeight: 'bold', marginBottom: 6 }}>Ringkasan Pengaturan</Text>
        <Text style={{ color: '#374151' }}>Metode: {selectedLabels.method}</Text>
        <Text style={{ color: '#374151' }}>School: {selectedLabels.school}</Text>
        {!!midnightMode && <Text style={{ color: '#374151' }}>Midnight Mode: {selectedLabels.midnightMode}</Text>}
        {!!latitudeAdjustmentMethod && <Text style={{ color: '#374151' }}>Latitude Adj: {selectedLabels.latitudeAdjustmentMethod}</Text>}
        {!!shafaq && <Text style={{ color: '#374151' }}>Shafaq: {selectedLabels.shafaq}</Text>}
        {!!timezonestring && <Text style={{ color: '#374151' }}>Timezone: {timezonestring}</Text>}
      </View>
      {/* Preview Kalkulasi */}
      <View style={{ backgroundColor: '#eef2ff', borderWidth: 1, borderColor: '#c7d2fe', borderRadius: 8, padding: 12, marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontWeight: 'bold', color: '#3730a3' }}>Preview kalkulasi (hari ini)</Text>
          <TouchableOpacity onPress={doPreview} style={{ backgroundColor: '#3730a3', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 }}>
            <Text style={{ color: '#fff', fontWeight: '600' }}>Preview berdasarkan lokasi</Text>
          </TouchableOpacity>
        </View>
        {previewLoading && <Text style={{ color: '#3730a3', marginTop: 8 }}>Memuat preview...</Text>}
        {!!previewError && <Text style={{ color: '#b91c1c', marginTop: 8 }}>{previewError}</Text>}
        {!!preview && (
          <View style={{ marginTop: 8 }}>
            <Text style={{ color: '#1f2937', marginBottom: 6 }}>Lokasi: {preview?.lokasi}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              <View style={{ width: '50%', paddingRight: 8, marginBottom: 6 }}>
                <Text style={{ color: '#111827' }}>Fajr: {preview?.jadwal?.subuh}</Text>
              </View>
              <View style={{ width: '50%', paddingLeft: 8, marginBottom: 6 }}>
                <Text style={{ color: '#111827' }}>Dhuhr: {preview?.jadwal?.dzuhur}</Text>
              </View>
              <View style={{ width: '50%', paddingRight: 8, marginBottom: 6 }}>
                <Text style={{ color: '#111827' }}>Asr: {preview?.jadwal?.ashar}</Text>
              </View>
              <View style={{ width: '50%', paddingLeft: 8, marginBottom: 6 }}>
                <Text style={{ color: '#111827' }}>Maghrib: {preview?.jadwal?.maghrib}</Text>
              </View>
              <View style={{ width: '50%', paddingRight: 8, marginBottom: 6 }}>
                <Text style={{ color: '#111827' }}>Isha: {preview?.jadwal?.isya}</Text>
              </View>
            </View>
          </View>
        )}
      </View>
      {/* Pengaturan Dasar */}
      <Text style={{fontSize: 16, fontWeight: 'bold', marginBottom: 8}}>Pengaturan Dasar</Text>
      {/* Preset cepat untuk Method */}
      <View style={{ marginBottom: 12 }}>
        <Text style={{fontWeight: 'bold', marginBottom: 6}}>Metode (method) — Opsi cepat</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          <Chip label="MWL (3)" active={method === '3'} onPress={() => setMethod('3')} />
          <Chip label="Umm al-Qura (4)" active={method === '4'} onPress={() => setMethod('4')} />
          <Chip label="Egyptian (5)" active={method === '5'} onPress={() => setMethod('5')} />
          <Chip label="ISNA (2)" active={method === '2'} onPress={() => setMethod('2')} />
          <Chip label="Karachi (1)" active={method === '1'} onPress={() => setMethod('1')} />
        </View>
        <InputRow label="Metode (method)" value={method} onChangeText={setMethod} placeholder="Contoh: 3 (MWL)" help="Disarankan: 3 (Muslim World League). Gunakan angka sesuai dokumentasi AlAdhan." />
      </View>
      {/* School chips */}
      <View style={{ marginBottom: 12 }}>
        <Text style={{fontWeight: 'bold', marginBottom: 6}}>School</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          <Chip label="Standard/Shafi (0)" active={school === '0'} onPress={() => setSchool('0')} />
          <Chip label="Hanafi (1)" active={school === '1'} onPress={() => setSchool('1')} />
        </View>
        <InputRow label="School (0: Standard, 1: Hanafi)" value={school} onChangeText={setSchool} placeholder="0 atau 1" help="Pilih 0 untuk Shafi/Standar atau 1 untuk Hanafi." />
      </View>
      {/* Pengaturan Lanjutan */}
      <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8}}>
        <Text style={{fontSize: 16, fontWeight: 'bold'}}>Pengaturan Lanjutan</Text>
        <TouchableOpacity onPress={() => setShowAdvanced(s => !s)} style={{paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb'}}>
          <Text style={{color: '#111827', fontWeight: '600'}}>{showAdvanced ? 'Sembunyikan' : 'Tampilkan'}</Text>
        </TouchableOpacity>
      </View>
      {showAdvanced && (
        <>
          <InputRow label="Timezone String" value={timezonestring} onChangeText={setTimezonestring} placeholder="Contoh: Asia/Jakarta" help="Kosongkan untuk deteksi otomatis berdasarkan perangkat. Isi manual jika jadwal tidak sesuai zona." />
          <View style={{ flexDirection: 'row', marginTop: -6, marginBottom: 12 }}>
            <TouchableOpacity onPress={detectTimezone} style={{ backgroundColor: '#eef2ff', borderWidth: 1, borderColor: '#c7d2fe', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 }}>
              <Text style={{ color: '#3730a3', fontWeight: '600' }}>Deteksi otomatis zona waktu</Text>
            </TouchableOpacity>
          </View>
          <InputRow label="Tune Offset (tune)" value={tune} onChangeText={setTune} placeholder="Contoh: 0,0,0,0,0,0,0,0" help="Urutan offset menit: Imsak, Fajr, Sunrise, Dhuhr, Asr, Maghrib, Isha, Midnight. Pisahkan dengan koma." />
          {/* Midnight Mode chips */}
          <View style={{ marginBottom: 12 }}>
            <Text style={{fontWeight: 'bold', marginBottom: 6}}>Midnight Mode</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              <Chip label="Standard (0)" active={midnightMode === '0'} onPress={() => setMidnightMode('0')} />
              <Chip label="Jafari (1)" active={midnightMode === '1'} onPress={() => setMidnightMode('1')} />
              <Chip label="Midnight (2)" active={midnightMode === '2'} onPress={() => setMidnightMode('2')} />
            </View>
            <InputRow label="Midnight Mode (0/1/2)" value={midnightMode} onChangeText={setMidnightMode} placeholder="Contoh: 0" help="Mode perhitungan tengah malam untuk jadwal Isha/Midnight." />
          </View>
          {/* Latitude Adjustment Method chips */}
          <View style={{ marginBottom: 12 }}>
            <Text style={{fontWeight: 'bold', marginBottom: 6}}>Latitude Adjustment Method</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              <Chip label="Middle of night (1)" active={latitudeAdjustmentMethod === '1'} onPress={() => setLatitudeAdjustmentMethod('1')} />
              <Chip label="One seventh (2)" active={latitudeAdjustmentMethod === '2'} onPress={() => setLatitudeAdjustmentMethod('2')} />
              <Chip label="Angle based (3)" active={latitudeAdjustmentMethod === '3'} onPress={() => setLatitudeAdjustmentMethod('3')} />
            </View>
            <InputRow label="Latitude Adjustment Method (1/2/3)" value={latitudeAdjustmentMethod} onChangeText={setLatitudeAdjustmentMethod} placeholder="Contoh: 3" help="Metode penyesuaian lintang tinggi untuk Fajr/Isha." />
          </View>
          {/* Shafaq chips */}
          <View style={{ marginBottom: 12 }}>
            <Text style={{fontWeight: 'bold', marginBottom: 6}}>Shafaq</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              <Chip label="general" active={shafaq === 'general'} onPress={() => setShafaq('general')} />
              <Chip label="ahmer" active={shafaq === 'ahmer'} onPress={() => setShafaq('ahmer')} />
              <Chip label="abyad" active={shafaq === 'abyad'} onPress={() => setShafaq('abyad')} />
            </View>
            <InputRow label="Shafaq (general/ahmer/abyad)" value={shafaq} onChangeText={setShafaq} placeholder="Contoh: general" help="Definisi senja (shafaq) yang dipakai untuk kalkulasi Isha." />
          </View>
          <InputRow label="Calendar Method" value={calendarMethod} onChangeText={setCalendarMethod} placeholder="Opsional, angka sesuai dokumentasi" help="Metode kalender hijriah (opsional). Kosongkan jika ragu." />
          <View style={{ flexDirection: 'row', marginBottom: 12 }}>
            <TouchableOpacity onPress={resetDefaults} style={{backgroundColor: '#f3f4f6', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', marginRight: 8}}>
              <Text style={{color: '#111827', textAlign: 'center', fontWeight: 'bold'}}>Reset Default</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={saveAll} style={{backgroundColor: '#2e7d32', padding: 12, borderRadius: 8, flex: 1}}>
              <Text style={{color: '#fff', textAlign: 'center', fontWeight: 'bold'}}>Simpan</Text>
            </TouchableOpacity>
          </View>
          <View style={{marginTop: 4}}>
            <Text style={{color: '#666'}}>
              Keterangan singkat:
              {'\n'}- Method disarankan: 3 (Muslim World League). Gunakan preset di atas agar mudah.
              {'\n'}- School: 0 (Standard/Shafi), 1 (Hanafi)
              {'\n'}- Midnight Mode: 0/1/2 sesuai opsi API
              {'\n'}- Latitude Adjustment Method: 1/2/3
              {'\n'}- Shafaq: general/ahmer/abyad
              {'\n'}- Tune: offset menit per-waktu, urutan sesuai contoh
            </Text>
          </View>
        </>
      )}
    </ScrollView>
  );
}