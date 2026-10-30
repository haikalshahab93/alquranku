import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useI18n } from '../../../api/i18n';
import { fmtMB } from './primitives';

// ============================================================
// KARTU 3b — Unduh semua audio karaoke (114 surah) untuk mode
// offline: progres, tombol batal, dan daftar per-surah.
// ============================================================
export default function AudioDownloadCard({
  pal, storage, audioBatch, audioBatchResult, audioCancelRef, startAudioBatchDownload,
  audioShowList, setAudioShowList, audioMetaList, reciterId, karaokeReciters, audioByReciter,
}) {
  const { t } = useI18n();

  const fmtBatch = (r) => {
    if (!r) return '';
    if (r.cancelled) return t('settings.batchCancelled', { n: r.downloaded });
    if (r.failed) return t('settings.batchFailed', { n: r.failed });
    return t('settings.batchDone', { n: r.downloaded, s: r.skipped ? t('settings.batchSkippedSuffix', { n: r.skipped }) : '' });
  };

  return (
    <View>
      <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 2, color: pal.colors.text }}>{t('settings.unduhAudio')}</Text>
      <Text style={{ color: pal.colors.muted, marginBottom: 10 }}>{t('settings.unduhAudioDesc', { a: storage.audioCount, b: fmtMB(storage.audioBytes) })}</Text>
      <View style={{ backgroundColor: pal.colors.surface, borderWidth: 1, borderColor: pal.colors.surfaceBorder, borderRadius: 12, padding: 12, marginBottom: 16 }}>
        <Text style={{ color: pal.colors.muted, fontSize: 12, marginBottom: 8 }}>
          {t('settings.qariTerpilih')}{' '}
          <Text style={{ fontWeight: '800', color: pal.colors.primary }}>
            {karaokeReciters.find((r) => r.id === reciterId)?.name || '—'}
          </Text>
          {t('settings.qariTerunduh', { n: audioByReciter[String(reciterId)] || 0 })}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity
            onPress={startAudioBatchDownload}
            disabled={!!audioBatch}
            activeOpacity={0.8}
            style={{ backgroundColor: '#7c3aed', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, opacity: audioBatch ? 0.6 : 1 }}
          >
            <Text style={{ color: '#fff', fontWeight: '800' }}>
              {audioBatch ? t('settings.mengunduh') : storage.audioCount >= 114 ? t('settings.perbaruiSemua') : t('settings.unduhSemua114')}
            </Text>
          </TouchableOpacity>
          {audioBatch ? (
            <TouchableOpacity onPress={() => { audioCancelRef.current = true; }} style={{ marginLeft: 10 }}>
              <Text style={{ color: '#b91c1c', fontWeight: '800' }}>{t('settings.stop')}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => setAudioShowList((v) => !v)} style={{ marginLeft: 10 }}>
              <Text style={{ color: pal.colors.primaryLight, fontWeight: '700' }}>
                {audioShowList ? t('settings.sembunyikanDaftar') : t('settings.lihatDaftar')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        {audioBatch && (
          <View style={{ marginTop: 10 }}>
            <View style={{ height: 6, borderRadius: 3, backgroundColor: 'rgba(124,58,237,0.15)', overflow: 'hidden' }}>
              <View style={{ height: 6, borderRadius: 3, backgroundColor: '#8b5cf6', width: `${Math.round((audioBatch.done / Math.max(1, audioBatch.total)) * 100)}%` }} />
            </View>
            <Text style={{ color: pal.colors.muted, fontSize: 12, marginTop: 6 }}>
              {t('settings.progressUnduh', { a: audioBatch.done, b: audioBatch.total, c: audioBatch.failed ? t('settings.gagalSuffix', { n: audioBatch.failed }) : '' })}
            </Text>
          </View>
        )}
        {!audioBatch && audioBatchResult && (
          <Text style={{ color: (audioBatchResult?.failed > 0 || audioBatchResult?.cancelled) ? '#b91c1c' : '#15803d', fontWeight: '700', fontSize: 12, marginTop: 8 }}>
            {fmtBatch(audioBatchResult)}
          </Text>
        )}
        {audioShowList && !audioBatch && (
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
    </View>
  );
}
