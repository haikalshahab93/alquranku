import React from 'react';
import { View, Text } from 'react-native';
import { useI18n, setLanguageSetting } from '../../../api/i18n';
import { Chip } from './primitives';

// ============================================================
// KARTU 1a — Bahasa aplikasi: Ikuti HP / Indonesia / English
// Mandiri: baca via useI18n, tulis via setLanguageSetting (event
// settingsEvents otomatis merender ulang semua layar yang terbuka).
// ============================================================
export default function LanguageCard({ pal }) {
  const { setting: langSetting, t } = useI18n();
  return (
    <View style={{ marginBottom: 18 }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold', color: pal.colors.text }}>{t('settings.language')}</Text>
      <Text style={{ color: pal.colors.muted, marginBottom: 10 }}>{t('settings.langDesc')}</Text>
      <View style={{ backgroundColor: pal.colors.surface, borderWidth: 1, borderColor: pal.colors.surfaceBorder, borderRadius: 12, padding: 12 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          <Chip pal={pal} label={t('settings.langSystem')} active={langSetting === 'system'} onPress={() => { setLanguageSetting('system'); }} />
          <Chip pal={pal} label={t('settings.langId')} active={langSetting === 'id'} onPress={() => { setLanguageSetting('id'); }} />
          <Chip pal={pal} label={t('settings.langEn')} active={langSetting === 'en'} onPress={() => { setLanguageSetting('en'); }} />
        </View>
      </View>
    </View>
  );
}
