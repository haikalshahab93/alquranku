import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, StyleSheet, useWindowDimensions, Platform } from 'react-native';
import { getHaditsPerawiList } from '../api/hadits';
import { theme } from '../ui';

export default function HaditsPerawiListScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(0);
  // Hitung ukuran halaman dinamis berdasarkan tinggi layar (khusus mobile)
  const { height: windowHeight } = useWindowDimensions();
  const isMobile = Platform.OS === 'android' || Platform.OS === 'ios';
  const headerHeight = 80;  // estimasi tinggi header
  const footerHeight = 72;  // estimasi tinggi pager
  const itemHeightEstimate = 72; // estimasi tinggi kartu item perawi
  const pageSize = isMobile ? Math.max(8, Math.floor((windowHeight - headerHeight - footerHeight) / itemHeightEstimate)) : 30;

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await getHaditsPerawiList();
        const payload = res?.data ?? res;
        const arr = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [];
        setItems(arr);
      } catch (e) {
        setError(e?.message || 'Gagal memuat perawi');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Paging
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const start = safePage * pageSize;
  const end = start + pageSize;
  const paged = items.slice(start, end);
  const goPrev = () => setPage((p) => Math.max(0, p - 1));
  const goNext = () => setPage((p) => Math.min(totalPages - 1, p + 1));

  const renderItem = ({ item }) => {
    const name = item?.nama ?? item?.name ?? '';
    const slug = item?.slug ?? item?.id ?? '';
    return (
      <TouchableOpacity style={styles.item} onPress={() => navigation.navigate('HaditsPerawiEntry', { slug, name })}>
        <Text style={styles.itemTitle}>{name}</Text>
        <Text style={styles.itemSubtitle}>{slug}</Text>
      </TouchableOpacity>
    );
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" /></View>;
  if (error) return <View style={styles.center}><Text>{error}</Text></View>;

  return (
    <View style={{ flex: 1 }}>
      <FlatList data={paged} keyExtractor={(item, idx) => String(item?.slug ?? idx)} renderItem={renderItem} contentContainerStyle={styles.list} />
      <View style={styles.pager}>
        <TouchableOpacity onPress={goPrev} disabled={safePage <= 0} style={[styles.pagerBtn, safePage <= 0 && styles.pagerBtnDisabled]}>
          <Text style={[styles.pagerBtnText, safePage <= 0 && styles.pagerBtnTextDisabled]}>Sebelumnya</Text>
        </TouchableOpacity>
        <Text style={styles.pagerText}>Halaman {safePage + 1} / {totalPages}</Text>
        <TouchableOpacity onPress={goNext} disabled={safePage >= totalPages - 1} style={[styles.pagerBtn, safePage >= totalPages - 1 && styles.pagerBtnDisabled]}>
          <Text style={[styles.pagerBtnText, safePage >= totalPages - 1 && styles.pagerBtnTextDisabled]}>Berikutnya</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16 },
  item: { padding: 12, borderWidth: 1, borderColor: '#eee', borderRadius: 10, backgroundColor: '#fff', marginBottom: 10 },
  itemTitle: { fontSize: 16, fontWeight: '700', color: '#111' },
  itemSubtitle: { color: '#64748b', marginTop: 4 },
  // Pager styles
  pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc' },
  pagerBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  pagerBtnDisabled: { opacity: 0.6 },
  pagerBtnText: { color: theme.colors.primary, fontWeight: '700' },
  pagerBtnTextDisabled: { color: '#94a3b8' },
  pagerText: { color: '#0f172a', fontWeight: '700' },
});