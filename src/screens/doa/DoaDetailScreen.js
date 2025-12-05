import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet, TouchableOpacity, Share } from 'react-native';
import { getDoaDetail } from '../../api/doa';
import { theme } from '../../ui';

export default function DoaDetailScreen({ route }) {
  const { id } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [fromCache, setFromCache] = useState(false);
  const [textScale, setTextScale] = useState(1.0);
  const increaseTextScale = () => setTextScale((s) => Math.min(2, +(s + 0.1).toFixed(1)));
  const decreaseTextScale = () => setTextScale((s) => Math.max(0.8, +(s - 0.1).toFixed(1)));

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const res = await getDoaDetail(id);
      const d = res?.data ?? res;
      setDetail(d);
      setFromCache(!!d?.__fromCache);
    } catch (e) {
      console.warn('Gagal memuat detail doa', e?.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  if (loading) {
    return (
      <View style={styles.center}><ActivityIndicator size="large" /></View>
    );
  }

  const title = detail?.nama ?? `Doa #${id}`;
  const arab = detail?.ar ?? '';
  const latin = detail?.tr ?? '';
  const ind = detail?.idn ?? '';
  const refText = detail?.tentang ?? '';
  const tags = Array.isArray(detail?.tag) ? detail.tag.join(', ') : '';

  const shareDoa = async () => {
    try {
      const msg = `${title}\n\n${arab}\n\n${latin}\n\n${ind}${tags ? `\n\nTags: ${tags}` : ''}`;
      await Share.share({ message: msg });
    } catch {}
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{title}</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={fetchDetail}>
          <Text style={styles.refreshText}>Refresh</Text>
        </TouchableOpacity>
      </View>
      {fromCache ? (
        <View style={styles.cacheBadge}><Text style={styles.cacheText}>Data dari Cache</Text></View>
      ) : null}
      {!!tags && <Text style={styles.tags}>{tags}</Text>}

      {/* Kontrol ukuran font (serupa SurahDetail) */}
      <View style={styles.fontRow}>
        <TouchableOpacity style={styles.fontBtn} onPress={decreaseTextScale}>
          <Text style={styles.fontBtnText}>A-</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.fontBtn} onPress={increaseTextScale}>
          <Text style={styles.fontBtnText}>A+</Text>
        </TouchableOpacity>
        <Text style={styles.fontInfo}>{`Ukuran: ${textScale.toFixed(1)}x`}</Text>
      </View>

      {/* Baris atas: nomor & aksi */}
      <View style={styles.ayatTopRow}>
        <View style={styles.numberPill}>
          <Text style={styles.numberPillText}>{id != null ? id : '-'}</Text>
        </View>
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.iconBtn} onPress={shareDoa}>
            <Ionicons name="share-social-outline" size={20} color="#6B21A8" />
          </TouchableOpacity>
        </View>
      </View>

      {!!arab && <Text style={[styles.arab, { fontSize: 22 * textScale, lineHeight: 30 * textScale }]}>{arab}</Text>}
      {!!latin && <Text style={[styles.latin, { fontSize: 14 * textScale, lineHeight: 20 * textScale }]}>{latin}</Text>}
      {!!ind && <Text style={[styles.ind, { fontSize: 14 * textScale, lineHeight: 20 * textScale }]}>{ind}</Text>}
      {!!refText && (
        <View style={styles.refBox}>
          <Text style={styles.refLabel}>Tentang / Referensi:</Text>
          <Text style={styles.refText}>{refText}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 20, fontWeight: '700', color: '#111', marginBottom: 8 },
  tags: { fontSize: 12, color: '#64748b', marginBottom: 8 },
  fontRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, marginBottom: 8 },
  fontBtn: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', backgroundColor: '#f1f5f9', marginRight: 8 },
  fontBtnText: { fontWeight: '700', color: theme.colors.primary },
  fontInfo: { color: '#64748b' },
  ayatTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  numberPill: { backgroundColor: '#ede9fe', borderColor: theme.colors.primaryLight, borderWidth: 1, borderRadius: 16, paddingVertical: 4, paddingHorizontal: 10, alignSelf: 'flex-start' },
  numberPillText: { color: theme.colors.primaryDark, fontWeight: '800', textAlign: 'center' },
  actionRow: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f1f5f9' },
  latin: { color: '#111', marginTop: 8 },
  ind: { color: '#222', marginTop: 8 },
  refBox: { marginTop: 12, padding: 8, borderRadius: 8, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e5e7eb' },
  refLabel: { fontSize: 12, color: '#64748b', marginBottom: 4, fontWeight: '700' },
  refText: { color: '#334155' },
  cacheBadge: { alignSelf: 'flex-start', backgroundColor: '#fef3c7', borderColor: '#fde68a', borderWidth: 1, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8, marginTop: 4 },
  cacheText: { color: '#92400e', fontWeight: '700' },
  refreshBtn: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  refreshText: { color: theme.colors.primary, fontWeight: '700' },
});