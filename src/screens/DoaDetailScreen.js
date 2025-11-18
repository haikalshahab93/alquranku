import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { getDoaDetail } from '../api/doa';

export default function DoaDetailScreen({ route }) {
  const { id } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [fromCache, setFromCache] = useState(false);

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
      {!!arab && <Text style={styles.arab}>{arab}</Text>}
      {!!latin && <Text style={styles.latin}>{latin}</Text>}
      {!!ind && <Text style={styles.ind}>{ind}</Text>}
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
  arab: { fontSize: 22, textAlign: 'right', lineHeight: 30, color: '#111', fontFamily: 'NotoNaskhArabic' },
  latin: { color: '#111', marginTop: 8 },
  ind: { color: '#222', marginTop: 8 },
  refBox: { marginTop: 12, padding: 8, borderRadius: 8, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e5e7eb' },
  refLabel: { fontSize: 12, color: '#64748b', marginBottom: 4, fontWeight: '700' },
  refText: { color: '#334155' },
  cacheBadge: { alignSelf: 'flex-start', backgroundColor: '#fef3c7', borderColor: '#fde68a', borderWidth: 1, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8, marginTop: 4 },
  cacheText: { color: '#92400e', fontWeight: '700' },
  refreshBtn: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  refreshText: { color: '#0ea5e9', fontWeight: '700' },
});