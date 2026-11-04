import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../../../api/i18n.js';

// ============================================================
// KARTU RINGKAS — tepat di bawah entry Audio Manager (Pengaturan):
//  • Qari terpilih: <nama>
//  • {n} dari 114 surah sudah terunduh
//  • "Lihat Daftar" buka/tutup kisi 114 surah (✓ = sudah tersimpan)
// Unduh 1-1 / semua & hapus kini lewat layar Audio Manager.
// ============================================================
export default function AudioDownloadCard({
  pal, reciterId, karaokeReciters, audioByReciter,
  audioMetaList, audioShowList, setAudioShowList,
}) {
  const { t } = useI18n();

  const recName = karaokeReciters.find((r) => r.id === reciterId)?.name || `#${reciterId}`;
  const downloaded = audioByReciter[String(reciterId)] || 0;

  return (
    <View style={{ backgroundColor: pal.colors.surface, borderWidth: 1, borderColor: pal.colors.surfaceBorder, borderRadius: 12, padding: 12, marginBottom: 16 }}>
      <Text style={{ color: pal.colors.muted, fontSize: 13, lineHeight: 20 }}>
        {t('settings.qariTerpilih')}{' '}
        <Text style={{ fontWeight: '800', color: pal.colors.primary }}>{recName}</Text>
      </Text>
      <Text style={{ color: pal.colors.muted, fontSize: 13, marginTop: 2 }}>
        {t('settings.qariTerunduh', { n: downloaded })}
      </Text>
      <TouchableOpacity
        onPress={() => setAudioShowList((v) => !v)}
        accessibilityRole="button"
        accessibilityLabel={audioShowList ? t('settings.sembunyikanDaftar') : t('settings.lihatDaftar')}
        style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center' }}
      >
        <Text style={{ color: pal.colors.primaryLight, fontWeight: '700' }}>
          {audioShowList ? t('settings.sembunyikanDaftar') : t('settings.lihatDaftar')}
        </Text>
        <Ionicons name={audioShowList ? 'chevron-up' : 'chevron-down'} size={14} color={pal.colors.primaryLight} style={{ marginLeft: 4 }} />
      </TouchableOpacity>
      {audioShowList && (
        <View style={{ marginTop: 10 }}>
          <Text style={{ color: pal.colors.muted, fontSize: 12, marginBottom: 6 }}>{t('settings.daftar114')}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {Array.from({ length: 114 }, (_, i) => i + 1).map((n) => {
              const done = audioMetaList.some((m) => m.surah === n && String(m.reciterId) === String(reciterId));
              return (
                <View
                  key={`dl-${n}`}
                  style={{ paddingHorizontal: 8, paddingVertical: 4, margin: 2, borderRadius: 8, borderWidth: 1, borderColor: done ? '#8b5cf6' : pal.colors.surfaceBorder, backgroundColor: done ? 'rgba(139,92,246,0.15)' : 'transparent' }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: done ? '#a78bfa' : pal.colors.muted }}>
                    {done ? `✓ ${n}` : String(n)}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}
