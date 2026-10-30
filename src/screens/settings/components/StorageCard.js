import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../../../api/i18n';
import { fmtMB } from './primitives';

// ============================================================
// KARTU 4 — Penyimpanan: berapa ruang yang dipakai audio offline
// dan cache Qur'an, plus tombol bersihkan dengan konfirmasi dobel
// (ketuk "Bersihkan" -> jadi "Yakin?" -> ketuk lagi untuk jalan).
// ============================================================
export default function StorageCard({ pal, storage, onRefresh }) {
  const { t } = useI18n();
  const [confirmClear, setConfirmClear] = React.useState(null); // 'cache' | 'audio' | null

  const clearQuranCacheOnly = async () => {
    try {
      const { bigGetAllKeys, bigRemoveItem } = require('../../../api/bigStore');
      const keys = await bigGetAllKeys('cache:quran:');
      for (const k of keys) await bigRemoveItem(k);
    } catch {}
    onRefresh();
  };

  const clearAllAudio = async () => {
    try {
      const { deleteAllOfflineAudio } = require('../../../api/offlineAudio');
      await deleteAllOfflineAudio();
    } catch {}
    onRefresh();
  };

  return (
    <View>
      <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 2, color: pal.colors.text }}>{t('settings.storage')}</Text>
      <Text style={{ color: pal.colors.muted, marginBottom: 10 }}>{t('settings.penyimpananDesc')}</Text>
      <View style={{ borderWidth: 1, borderColor: pal.colors.surfaceBorder, borderRadius: 12, padding: 14, marginBottom: 8 }}>
        {storage.loading ? (
          <Text style={{ color: pal.colors.muted }}>{t('settings.menghitung')}</Text>
        ) : (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
              <Ionicons name="musical-notes-outline" size={18} color="#7c3aed" />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={{ fontWeight: 'bold', color: pal.colors.text }}>{t('settings.audioOffline')}</Text>
                <Text style={{ color: pal.colors.muted, fontSize: 12 }}>{t('settings.surahCount', { n: storage.audioCount, size: fmtMB(storage.audioBytes) })}</Text>
              </View>
              {storage.audioCount > 0 && (
                <TouchableOpacity
                  onPress={() => (confirmClear === 'audio' ? (setConfirmClear(null), clearAllAudio()) : setConfirmClear('audio'))}
                  style={{ backgroundColor: confirmClear === 'audio' ? '#dc2626' : '#fef2f2', borderWidth: 1, borderColor: confirmClear === 'audio' ? '#dc2626' : '#fecaca', borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 }}
                >
                  <Text style={{ color: confirmClear === 'audio' ? '#fff' : '#b91c1c', fontWeight: '700', fontSize: 12 }}>
                    {confirmClear === 'audio' ? t('settings.yakin') : t('common.delete')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
              <Ionicons name="cloud-download-outline" size={18} color={pal.colors.primary} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={{ fontWeight: 'bold', color: pal.colors.text }}>{t('settings.cacheQuran')}</Text>
                <Text style={{ color: pal.colors.muted, fontSize: 12 }}>{t('settings.dataCount', { n: storage.cacheCount, size: fmtMB(storage.cacheBytes) })}</Text>
              </View>
              {storage.cacheCount > 0 && (
                <TouchableOpacity
                  onPress={() => (confirmClear === 'cache' ? (setConfirmClear(null), clearQuranCacheOnly()) : setConfirmClear('cache'))}
                  style={{ backgroundColor: confirmClear === 'cache' ? '#dc2626' : '#fef2f2', borderWidth: 1, borderColor: confirmClear === 'cache' ? '#dc2626' : '#fecaca', borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 }}
                >
                  <Text style={{ color: confirmClear === 'cache' ? '#fff' : '#b91c1c', fontWeight: '700', fontSize: 12 }}>
                    {confirmClear === 'cache' ? t('settings.yakin') : t('settings.bersihkan')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={{ borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 10, flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="stats-chart-outline" size={16} color={pal.colors.text} />
              <Text style={{ marginLeft: 10, fontWeight: '800', color: pal.colors.text }}>
                Total: {fmtMB(storage.audioBytes + storage.cacheBytes)}
              </Text>
              <TouchableOpacity onPress={onRefresh} style={{ marginLeft: 'auto' }}>
                <Ionicons name="refresh" size={16} color="#7c3aed" />
              </TouchableOpacity>
            </View>
            {confirmClear && (
              <Text style={{ color: '#b45309', fontSize: 11, marginTop: 8, fontWeight: '600' }}>
                {t('settings.hapusPermanen')}
              </Text>
            )}
          </>
        )}
      </View>
    </View>
  );
}
