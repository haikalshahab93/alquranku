import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../../../api/i18n';
import { InputRow } from './primitives';

// ============================================================
// KARTU 2e — Pengaturan teknis Aladhan (tera zona waktu, penyesuaian
// menit, dll). Tersembunyi di balik panel yang bisa dibentangkan.
// ============================================================
export default function AdvancedCard({ pal, showAdvanced, setShowAdvanced, adv, setAdv, detectTimezone, resetDefaults, saveAll }) {
  const { t } = useI18n();
  return (
    <View>
      <TouchableOpacity
        onPress={() => setShowAdvanced(s => !s)}
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12, backgroundColor: pal.colors.surface, borderWidth: 1, borderColor: pal.colors.surfaceBorder }}
      >
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text style={{ fontWeight: 'bold', color: pal.colors.text }}>{t('settings.teknisJudul')}</Text>
          <Text style={{ color: pal.colors.muted, fontSize: 12, marginTop: 2 }}>{t('settings.teknisDesc')}</Text>
        </View>
        <Ionicons name={showAdvanced ? 'chevron-up' : 'chevron-down'} size={18} color={pal.colors.muted} />
      </TouchableOpacity>
      {showAdvanced && (
        <>
          <View style={{ marginTop: 12 }}>
            <InputRow pal={pal} label={t('settings.lblTimezone')} value={adv.timezonestring} onChangeText={setAdv.timezonestring} placeholder={t('settings.phTimezone')} help={t('settings.helpTimezone')} />
            <TouchableOpacity onPress={detectTimezone} style={{ alignSelf: 'flex-start', backgroundColor: pal.colors.surface, borderWidth: 1, borderColor: pal.colors.surfaceBorder, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, marginBottom: 14 }}>
              <Text style={{ color: pal.colors.primary, fontWeight: '600' }}>{t('settings.deteksiTz')}</Text>
            </TouchableOpacity>
            <InputRow pal={pal} label={t('settings.lblTune')} value={adv.tune} onChangeText={setAdv.tune} placeholder={t('settings.phTune')} help={t('settings.helpTune')} />
            <InputRow pal={pal} label={t('settings.lblMidnight')} value={adv.midnightMode} onChangeText={setAdv.midnightMode} placeholder={t('settings.ph012')} help={t('settings.helpMidnight')} />
            <InputRow pal={pal} label={t('settings.lblLatAdjust')} value={adv.latitudeAdjustmentMethod} onChangeText={setAdv.latitudeAdjustmentMethod} placeholder={t('settings.ph012')} help={t('settings.helpLatAdjust')} />
            <InputRow pal={pal} label={t('settings.lblShafaq')} value={adv.shafaq} onChangeText={setAdv.shafaq} placeholder={t('settings.phShafaq')} help={t('settings.helpShafaq')} />
            <InputRow pal={pal} label={t('settings.lblCalendarMethod')} value={adv.calendarMethod} onChangeText={setAdv.calendarMethod} placeholder={t('settings.phOpsional')} help={t('settings.helpCalendarMethod')} />
          </View>
          <View style={{ flexDirection: 'row', marginBottom: 24 }}>
            <TouchableOpacity onPress={resetDefaults} style={{ backgroundColor: pal.colors.surface, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: pal.colors.surfaceBorder, marginRight: 8 }}>
              <Text style={{ color: pal.colors.text, textAlign: 'center', fontWeight: 'bold' }}>{t('settings.kembalikanAwal')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={saveAll} style={{ backgroundColor: '#7c3aed', padding: 12, borderRadius: 8, flex: 1, alignItems: 'center' }}>
              <Text style={{ color: '#fff', textAlign: 'center', fontWeight: 'bold' }}>{t('settings.simpan')}</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}
