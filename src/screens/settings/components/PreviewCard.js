import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useI18n } from '../../../api/i18n';

// ============================================================
// KARTU 2d — Pratinjau jadwal sholat hari ini (pemeriksa cepat:
// apakah hasil perhitungan terasa tepat di lokasi pengguna).
// ============================================================
export default function PreviewCard({ pal, preview, previewLoading, previewError, doPreview }) {
  const { t } = useI18n();
  return (
    <View style={{ backgroundColor: pal.colors.surface, borderWidth: 1, borderColor: pal.colors.surfaceBorder, borderRadius: 12, padding: 12, marginTop: 16, marginBottom: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={{ fontWeight: 'bold', color: pal.colors.primary, flex: 1, minWidth: 0 }}>{t('settings.pratinjauJudul')}</Text>
        <TouchableOpacity onPress={doPreview} style={{ backgroundColor: '#3730a3', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginLeft: 12, flexShrink: 0 }}>
          <Text style={{ color: '#fff', fontWeight: '600' }}>{t('settings.cek')}</Text>
        </TouchableOpacity>
      </View>
      {previewLoading && <Text style={{ color: pal.colors.primary, marginTop: 8 }}>{t('settings.memuat')}</Text>}
      {!!previewError && <Text style={{ color: '#b91c1c', marginTop: 8 }}>{previewError}</Text>}
      {!!preview && (
        <View style={{ marginTop: 8 }}>
          <Text style={{ color: pal.colors.text, marginBottom: 6 }}>{t('settings.lokasiLbl', { n: preview?.lokasi })}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            <View style={{ width: '50%', paddingRight: 8, marginBottom: 6 }}><Text style={{ color: pal.colors.text }}>{t('settings.subuh')}: {preview?.jadwal?.subuh}</Text></View>
            <View style={{ width: '50%', paddingLeft: 8, marginBottom: 6 }}><Text style={{ color: pal.colors.text }}>{t('settings.dzuhur')}: {preview?.jadwal?.dzuhur}</Text></View>
            <View style={{ width: '50%', paddingRight: 8, marginBottom: 6 }}><Text style={{ color: pal.colors.text }}>{t('settings.ashar')}: {preview?.jadwal?.ashar}</Text></View>
            <View style={{ width: '50%', paddingLeft: 8, marginBottom: 6 }}><Text style={{ color: pal.colors.text }}>{t('settings.maghrib')}: {preview?.jadwal?.maghrib}</Text></View>
            <View style={{ width: '50%', paddingRight: 8, marginBottom: 6 }}><Text style={{ color: pal.colors.text }}>{t('settings.isya')}: {preview?.jadwal?.isya}</Text></View>
          </View>
        </View>
      )}
    </View>
  );
}
