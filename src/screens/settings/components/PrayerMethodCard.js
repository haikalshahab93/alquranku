import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useI18n } from '../../../api/i18n';
import { OptionCard } from './primitives';

// ============================================================
// KARTU 2c — Metode perhitungan sholat (standar & madzhab) plus
// tombol simpan. Daftar opsi dibangun di sini agar labelnya ikut
// dwibahasa saat bahasa berganti.
// ============================================================
export default function PrayerMethodCard({ pal, method, setMethod, school, setSchool, saveMsg, saveAll }) {
  const { t } = useI18n();

  // Dwibahasa: label opsi metode & madzhab mengikuti bahasa aktif.
  const METODE_OPSI = [
    { value: '3', label: t('settings.metodeMWL'), sub: t('settings.subMWL') },
    { value: '4', label: t('settings.metodeMakkah'), sub: t('settings.subMakkah') },
    { value: '5', label: t('settings.metodeMesir'), sub: t('settings.subMesir') },
    { value: '2', label: t('settings.metodeISNA'), sub: t('settings.subISNA') },
    { value: '1', label: t('settings.metodeKarachi'), sub: t('settings.subKarachi') },
  ];
  const MADZHAB_OPSI = [
    { value: '0', label: t('settings.madzhabStd'), sub: t('settings.subMadzhabStd') },
    { value: '1', label: t('settings.madzhabHanafi'), sub: t('settings.subMadzhabHanafi') },
  ];

  return (
    <View>
      <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 2, color: pal.colors.text }}>{t('settings.perhitunganJudul')}</Text>
      <Text style={{ color: pal.colors.muted, marginBottom: 10 }}>{t('settings.perhitunganDesc')}</Text>

      <Text style={{ fontWeight: 'bold', marginBottom: 8, color: pal.colors.text }}>{t('settings.standar')}</Text>
      {METODE_OPSI.map((o) => (
        <OptionCard key={o.value} pal={pal} option={o} active={method === o.value} onPress={() => setMethod(o.value)} />
      ))}

      <Text style={{ fontWeight: 'bold', marginTop: 12, marginBottom: 8, color: pal.colors.text }}>{t('settings.madzhabLabel')}</Text>
      {MADZHAB_OPSI.map((o) => (
        <OptionCard key={o.value} pal={pal} option={o} active={school === o.value} onPress={() => setSchool(o.value)} />
      ))}

      {saveMsg && (
        <Text style={{ color: saveMsg.ok ? '#15803d' : '#b91c1c', fontWeight: '600', marginTop: 10 }}>{saveMsg.text}</Text>
      )}
      <TouchableOpacity onPress={saveAll} style={{ backgroundColor: '#7c3aed', padding: 14, borderRadius: 12, marginTop: 12, alignItems: 'center' }}>
        <Text style={{ color: '#fff', fontWeight: 'bold' }}>{t('settings.simpanSholat')}</Text>
      </TouchableOpacity>
    </View>
  );
}
