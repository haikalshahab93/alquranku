import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Platform, Linking } from 'react-native';
import Constants from 'expo-constants';
import { useI18n } from '../../../api/i18n.js';

// ============================================================
// KARTU 2b — (khusus Android) Buat adzan tetap tepat waktu:
// kecualikan aplikasi dari hemat baterai dan izinkan alarm tepat.
// ============================================================

// Nama paket app (dipakai dialog langsung "abaikan optimasi baterai")
const APP_PACKAGE = Constants?.expoConfig?.android?.package || Constants?.manifest?.android?.package || 'com.alfarisy.infoalquran';

// Dialog sistem LNGSUNG (bukan halaman pengaturan): "Izinkan Alquranku
// mengabaikan pengoptimalan baterai?" — pengguna cukup tap Izinkan sekali.
// Aplikasi pengingat alarm/adzan termasuk kategori yang diizinkan Play memakai
// dialog ini. Fallback: buka halaman pengaturan hemat baterai.
export const requestIgnoreBatteryDialog = async () => {
  if (Platform.OS !== 'android') return false;
  try {
    const IntentLauncher = require('expo-intent-launcher');
    await IntentLauncher.startActivityAsync(
      IntentLauncher.Action.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
      { data: `package:${APP_PACKAGE}` }
    );
    return true;
  } catch (e) {
    try { await openBatteryOptimization(); } catch (e2) {}
    return false;
  }
};

// Buka pengaturan "hemat baterai" supaya aplikasi boleh dikecualikan.
// Dilakukan export: dialog panduan izin di SettingsScreen memakai tombol yang sama.
export const openBatteryOptimization = async () => {
  try {
    await Linking.sendIntent('android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS');
  } catch (e) {
    try { await Linking.openSettings(); } catch (e2) {}
  }
};

// Nama paket untuk halaman "Alarm & pengingat"
export const openExactAlarmSettings = async () => {
  try {
    const pkg = APP_PACKAGE;
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
          onPress={requestIgnoreBatteryDialog}
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
