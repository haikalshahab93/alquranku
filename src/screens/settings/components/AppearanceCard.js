import React from 'react';
import { View, Text, TouchableOpacity, Switch } from 'react-native';
import { useI18n } from '../../../api/i18n';
import { setDarkMode, setTextScale, MIN_TEXT_SCALE, MAX_TEXT_SCALE } from '../../../api/appearance';
import { Chip } from './primitives';

// ============================================================
// KARTU 1b — Dark mode + ukuran font ayat/tafsir.
// State (darkMode, textScale) tetap dimiliki SettingsScreen agar
// seluruh kartu ikut berganti palet saat mode gelap diaktifkan —
// kartu ini hanya menampilkan UI-nya.
// ============================================================
export default function AppearanceCard({ pal, darkMode, setDarkModeState, textScale, setTextScaleState }) {
  const { t } = useI18n();
  return (
    <View style={{ marginBottom: 18 }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold', color: pal.colors.text }}>{t('settings.appearance')}</Text>
      <Text style={{ color: pal.colors.muted, marginBottom: 10 }}>{t('settings.tampilanDesc')}</Text>
      <View style={{ backgroundColor: pal.colors.surface, borderWidth: 1, borderColor: pal.colors.surfaceBorder, borderRadius: 12, padding: 12, marginBottom: 18 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={{ fontWeight: 'bold', color: pal.colors.primaryLight }}>{t('settings.modeGelap')}</Text>
            <Text style={{ color: pal.colors.muted, fontSize: 12, marginTop: 2 }}>{t('settings.modeGelapDesc')}</Text>
          </View>
          <Switch
            value={darkMode}
            onValueChange={async (v) => {
              setDarkModeState(v);
              await setDarkMode(v);
            }}
            trackColor={{ false: '#e5e7eb', true: '#8b5cf6' }}
            thumbColor={darkMode ? '#ffffff' : '#f4f4f5'}
          />
        </View>
        <View style={{ marginTop: 14, borderTopWidth: 1, borderTopColor: pal.colors.surfaceBorder, paddingTop: 12 }}>
          <Text style={{ fontWeight: 'bold', color: pal.colors.primaryLight }}>{t('settings.ukuranFont')}</Text>
          <Text style={{ color: pal.colors.muted, fontSize: 12, marginTop: 2 }}>{t('settings.ukuranFontDesc')}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 }}>
            {[
              { label: t('settings.fontKecil'), v: 0.9 },
              { label: t('settings.fontNormal'), v: 1.0 },
              { label: t('settings.fontSedang'), v: 1.15 },
              { label: t('settings.fontBesar'), v: 1.3 },
              { label: t('settings.fontExtra'), v: 1.5 },
            ].map((o) => (
              <Chip
                key={`scale-${o.v}`}
                pal={pal}
                label={`${o.label} (${o.v}x)`}
                active={Math.abs(textScale - o.v) < 0.05}
                onPress={() => { setTextScaleState(o.v); setTextScale(o.v); }}
              />
            ))}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
            <TouchableOpacity
              style={{ backgroundColor: pal.colors.primaryLight + '2e', borderWidth: 1, borderColor: pal.colors.surfaceBorder, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10 }}
              onPress={async () => { const next = await setTextScale(textScale - 0.1); setTextScaleState(next); }}
              disabled={textScale <= MIN_TEXT_SCALE}
              activeOpacity={0.7}
            >
              <Text style={{ color: pal.colors.primary, fontWeight: '800' }}>A−</Text>
            </TouchableOpacity>
            <Text style={{ marginHorizontal: 12, fontWeight: '700', color: pal.colors.text }}>{textScale.toFixed(1)}x</Text>
            <TouchableOpacity
              style={{ backgroundColor: pal.colors.primaryLight + '2e', borderWidth: 1, borderColor: pal.colors.surfaceBorder, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10 }}
              onPress={async () => { const next = await setTextScale(textScale + 0.1); setTextScaleState(next); }}
              disabled={textScale >= MAX_TEXT_SCALE}
              activeOpacity={0.7}
            >
              <Text style={{ color: pal.colors.primary, fontWeight: '800' }}>A+</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}
