import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Linking } from 'react-native';
import Constants from 'expo-constants';
import { useI18n } from '../../../api/i18n';

// ============================================================
// KARTU 2b — (khusus Android) Buat adzan tetap tepat waktu:
// kecualikan aplikasi dari hemat baterai dan izinkan alarm tepat.
// ============================================================

// Buka pengaturan "hemat baterai" supaya aplikasi boleh dikecualikan.
const openBatteryOptimization = async () => {
  try {
    await Linking.sendIntent('android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS');
  } catch (e) {
    try { await Linking.openSettings(); } catch (e2) {}
  }
};

// Buka halaman "Alarm & pengingat" agar aplikasi diizinkan menjadwalkan
// ALARM TEPAT — tanpa ini notifikasi bisa muncul molor meski optimasi
// baterai sudah dikecualikan.
const openExactAlarmSettings = async () => {
  try {
    const pkg = Constants?.expoConfig?.android?.package || Constants?.manifest?.android?.package;
    if (pkg) {
      await Linking.sendIntent('android.settings.REQUEST_SCHEDULE_EXACT_ALARM', [
        { key: 'android.intent.extra.PACKAGE_NAME', value: pkg },
      ]);
    } else {
      await Linking.sendIntent('android.settings.REQUEST_SCHEDULE_EXACT_ALARM');
    }
  } catch (e) {
    try { await Linking.openSettings(); } catch (e2) {}
  }
};

export default function AndroidBatteryCard({ pal }) {
  const { t } = useI18n();
  return (
    <View style={{ backgroundColor: pal.colors.surface, borderWidth: 1, borderColor: pal.colors.surfaceBorder, borderRadius: 12, padding: 12, marginBottom: 16 }}>
      <Text style={{ fontWeight: 'bold', color: pal.colors.primary }}>{t('settings.adzanTepat')}</Text>
      <Text style={{ color: pal.colors.muted, fontSize: 12, marginTop: 2, marginBottom: 10 }}>
        Notifikasi bisa terlambat kalau "hemat baterai" aktif atau izin "Alarm & pengingat" belum diberikan. Izinkan keduanya:
      </Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TouchableOpacity
          onPress={openBatteryOptimization}
          style={{ backgroundColor: '#7c3aed', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, flex: 1, alignItems: 'center' }}
          activeOpacity={0.8}
        >
          <Text style={{ color: '#fff', fontWeight: '700' }}>{t('settings.hematBaterai')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={openExactAlarmSettings}
          style={{ borderColor: '#7c3aed', borderWidth: 1, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, flex: 1, alignItems: 'center' }}
          activeOpacity={0.8}
        >
          <Text style={{ color: '#7c3aed', fontWeight: '700' }}>{t('settings.alarmTepat')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
