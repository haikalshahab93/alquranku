import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../../../api/i18n';

// ============================================================
// KARTU 3a — Pilihan qari untuk Mode Karaoke.
// Daftar qari cukup panjang (15+), jadi tidak ditampilkan penuh:
// kartu menampilkan RINGKASAN qari terpilih (nama + status unduh),
// dan daftar lengkap hanya terbentang saat baris tersebut diketuk.
// ============================================================
export default function ReciterCard({ pal, karaokeReciters, reciterId, reciterLoaded, reciterError, audioByReciter, pickReciter }) {
  const { t } = useI18n();
  const [showList, setShowList] = useState(false); // daftar lengkap: tertutup secara default

  // Ringkasan qari yang sedang terpilih
  const selected = karaokeReciters.find((r) => r.id === reciterId) || null;
  const selectedCount = audioByReciter[String(reciterId)] || 0;
  const selectedComplete = selectedCount >= 114;
  const selectedStatus = selectedCount === 0
    ? t('settings.belumUnduh')
    : selectedComplete
    ? t('settings.semua114')
    : t('settings.nOf114', { n: selectedCount });

  const rowBorder = showList ? pal.colors.primary : pal.colors.surfaceBorder;
  const rowBg = showList ? pal.colors.primaryLight + '14' : pal.colors.surface;

  const renderChip = (r) => {
    const count = audioByReciter[String(r.id)] || 0;
    const complete = count >= 114;
    const active = reciterId === r.id;
    return (
      <TouchableOpacity
        key={`reciter-${r.id}`}
        activeOpacity={0.7}
        onPress={() => { pickReciter(r.id); setShowList(false); }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          marginRight: 6,
          marginBottom: 6,
          paddingVertical: 6,
          paddingHorizontal: 10,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: active ? pal.colors.primary : pal.colors.surfaceBorder,
          backgroundColor: active ? pal.colors.primary + '22' : 'transparent',
        }}
      >
        <View>
          <Text style={{ fontSize: 12, fontWeight: '700', color: active ? pal.colors.primary : pal.colors.text }}>
            {r.name + (r.style ? ` — ${r.style}` : '')}
          </Text>
          <Text style={{ fontSize: 10, fontWeight: '700', marginTop: 1, color: count > 0 ? '#16a34a' : pal.colors.muted }}>
            {count === 0
              ? t('settings.belumUnduh')
              : complete
              ? t('settings.semua114')
              : t('settings.nOf114', { n: count })}
          </Text>
        </View>
        <Ionicons
          name={complete ? 'checkmark-circle' : count > 0 ? 'cloud-done-outline' : 'cloud-download-outline'}
          size={15}
          color={count > 0 ? '#16a34a' : pal.colors.muted}
        />
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ marginBottom: 8 }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 2, color: pal.colors.text }}>{t('settings.qariJudul')}</Text>
      <Text style={{ color: pal.colors.muted, marginBottom: 10 }}>{t('settings.qariDesc')}</Text>

      {/* Baris ringkasan: qari terpilih + tanda jumlah unduhan + chevron. Ketuk = buka/tutup daftar. */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setShowList((v) => !v)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 10,
          paddingHorizontal: 12,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: rowBorder,
          backgroundColor: rowBg,
        }}
      >
        <Ionicons name="mic-outline" size={18} color={pal.colors.primary} />
        <View style={{ flex: 1, minWidth: 0, marginLeft: 10 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: pal.colors.text }} numberOfLines={1}>
            {selected ? selected.name + (selected.style ? ` — ${selected.style}` : '') : '—'}
          </Text>
          <Text style={{ fontSize: 10.5, fontWeight: '700', marginTop: 1, color: selectedCount > 0 ? '#16a34a' : pal.colors.muted }} numberOfLines={1}>
            {selectedStatus}
          </Text>
        </View>
        <Ionicons name={showList ? 'chevron-up' : 'chevron-down'} size={18} color={pal.colors.muted} />
      </TouchableOpacity>

      {/* Petunjuk singkat agar pengguna tahu baris itu bisa diketuk */}
      {!showList && (
        <Text style={{ color: pal.colors.muted, fontSize: 11, marginTop: 6 }}>
          {reciterError ? reciterError : t('settings.qariHint')}
        </Text>
      )}

      {/* Daftar qari lengkap — hanya muncul saat diketuk */}
      {showList && (
        <View style={{ marginTop: 10 }}>
          {!reciterLoaded && karaokeReciters.length === 0 ? (
            <Text style={{ color: pal.colors.muted, marginBottom: 8 }}>{t('settings.memuatQari')}</Text>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {karaokeReciters.map(renderChip)}
            </View>
          )}
        </View>
      )}
    </View>
  );
}
