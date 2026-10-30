import React from 'react';
import { View, Text, TouchableOpacity, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../../../api/i18n';
import { Chip } from './primitives';

// ============================================================
// KARTU 2a — Pengingat waktu sholat (notifikasi).
// Semua aksi (toggle/offset/suara) memanggil onApply yang dimiliki
// SettingsScreen — di sanalah logika penyimpanan & penjadwalan.
// ============================================================
export default function NotifCard({
  pal, notifEnabled, setNotifEnabled, notifOffset, setNotifOffset,
  notifSound, setNotifSound, onApply,
  previewPlaying, togglePreview,
}) {
  const { t } = useI18n();
  const apply = (v, o, s) => { onApply(v, o, s ?? notifSound); };
  return (
    <View>
      <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 2, color: pal.colors.text }}>{t('settings.pengingatJudul')}</Text>
      <Text style={{ color: pal.colors.muted, marginBottom: 10 }}>{t('settings.pengingatDesc')}</Text>
      <View style={{ backgroundColor: pal.colors.surface, borderWidth: 1, borderColor: pal.colors.surfaceBorder, borderRadius: 12, padding: 12, marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
            <Text style={{ fontWeight: 'bold', color: pal.colors.primary }}>{t('settings.aktifkanPengingat')}</Text>
            <Text style={{ color: pal.colors.muted, fontSize: 12, marginTop: 2 }}>{t('settings.pengingatLima')}</Text>
          </View>
          <Switch
            value={notifEnabled}
            onValueChange={(v) => { setNotifEnabled(v); apply(v, notifOffset); }}
            trackColor={{ false: '#e5e7eb', true: '#8b5cf6' }}
            thumbColor={notifEnabled ? '#ffffff' : '#f4f4f5'}
          />
        </View>
        {notifEnabled && (
          <View style={{ marginTop: 10 }}>
            <Text style={{ fontWeight: 'bold', marginBottom: 6, color: pal.colors.text }}>{t('settings.kapanDiingatkan')}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              <Chip pal={pal} label={t('settings.tepatWaktu')} active={notifOffset === 0} onPress={() => { setNotifOffset(0); apply(true, 0); }} />
              <Chip pal={pal} label={t('settings.menitSebelum', { n: 5 })} active={notifOffset === 5} onPress={() => { setNotifOffset(5); apply(true, 5); }} />
              <Chip pal={pal} label={t('settings.menitSebelum', { n: 10 })} active={notifOffset === 10} onPress={() => { setNotifOffset(10); apply(true, 10); }} />
              <Chip pal={pal} label={t('settings.menitSebelum', { n: 15 })} active={notifOffset === 15} onPress={() => { setNotifOffset(15); apply(true, 15); }} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
              <Text style={{ fontWeight: 'bold', marginBottom: 0, color: pal.colors.text }}>{t('settings.suaraNotif')}</Text>
              <TouchableOpacity
                onPress={togglePreview}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 10, backgroundColor: pal.colors.primaryLight + '2e', borderColor: pal.colors.surfaceBorder, borderWidth: 1, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10 }}
                activeOpacity={0.7}
              >
                <Ionicons name={previewPlaying ? 'stop-circle-outline' : 'volume-high-outline'} size={12} color={pal.colors.primary} />
                <Text style={{ color: pal.colors.primary, fontWeight: '700', fontSize: 11 }}>{previewPlaying ? t('settings.stopSuara') : t('settings.hidupkanSuara')}</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 }}>
              <Chip pal={pal} label={t('settings.bunyiBiasa')} active={notifSound === 'default'} onPress={() => { setNotifSound('default'); apply(true, notifOffset, 'default'); }} />
              <Chip pal={pal} label={t('settings.suaraAdzan')} active={notifSound === 'adhan'} onPress={() => { setNotifSound('adhan'); apply(true, notifOffset, 'adhan'); }} />
              <Chip pal={pal} label={t('settings.getar')} active={notifSound === 'getar'} onPress={() => { setNotifSound('getar'); apply(true, notifOffset, 'getar'); }} />
              <Chip pal={pal} label={t('settings.sunyi')} active={notifSound === 'silent'} onPress={() => { setNotifSound('silent'); apply(true, notifOffset, 'silent'); }} />
            </View>
            <Text style={{ color: pal.colors.muted, fontSize: 11, marginTop: 6 }}>
              {t('settings.suaraInfo')}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}
