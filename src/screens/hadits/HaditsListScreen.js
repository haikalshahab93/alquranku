import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet, TextInput, TouchableOpacity, useWindowDimensions, Platform } from 'react-native';
import { getHaditsArbainSemua } from '../../api/hadits';
import { theme } from '../../ui';

function normalizeArray(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.result)) return data.result;
  return [];
}

export default function HaditsListScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  // Hitung ukuran halaman dinamis berdasarkan tinggi layar (khusus mobile)
  const { height: windowHeight } = useWindowDimensions();
  const isMobile = Platform.OS === 'android' || Platform.OS === 'ios';
  const headerHeight = 140; // estimasi tinggi header + pencarian
  const footerHeight = 72;  // estimasi tinggi pager
  const itemHeightEstimate = 88; // estimasi tinggi kartu item
  const pageSize = isMobile ? Math.max(5, Math.floor((windowHeight - headerHeight - footerHeight) / itemHeightEstimate)) : 20;

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await getHaditsArbainSemua();
        const payload = res?.data ?? res;
        setItems(normalizeArray(payload));
      } catch (e) {
        setError(e?.message || 'Gagal memuat hadits');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => {
      const judul = String(it?.judul ?? it?.title ?? '').toLowerCase();
      const arab = String(it?.arab ?? it?.ar ?? it?.arabic ?? '').toLowerCase();
      const indo = String(it?.indo ?? it?.id ?? it?.indonesian ?? '').toLowerCase();
      const latin = String(it?.latin ?? it?.tr ?? '').toLowerCase();
      const perawi = String(it?.perawi ?? it?.rawi ?? it?.narrator ?? '').toLowerCase();
      return judul.includes(q) || arab.includes(q) || indo.includes(q) || latin.includes(q) || perawi.includes(q);
    });
  }, [items, query]);
  // Reset ke halaman pertama saat query berubah
  useEffect(() => { setPage(0); }, [query]);
  // Paging
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const start = safePage * pageSize;
  const end = start + pageSize;
  const paged = filtered.slice(start, end);
  const goPrev = () => setPage((p) => Math.max(0, p - 1));
  const goNext = () => setPage((p) => Math.min(totalPages - 1, p + 1));

  const renderItem = ({ item, index }) => {
    const nomor = item?.no ?? item?.nomor ?? (index + 1);
    const title = item?.judul ?? item?.title ?? `Hadits ${nomor}`;
    const perawi = item?.perawi ?? item?.rawi ?? item?.narrator ?? '';
    return (
      <TouchableOpacity style={styles.item} onPress={() => navigation.navigate('HaditsDetail', { nomor })}>
        <Text style={styles.itemTitle}>{title}</Text>
        {!!perawi && <Text style={styles.itemSubtitle}>Perawi: {perawi}</Text>}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Arba’in Nawawi</Text>
        <TouchableOpacity style={styles.randomBtn} onPress={() => navigation.navigate('HaditsDetail', { random: true })}>
          <Text style={styles.randomText}>Acak</Text>
        </TouchableOpacity>
      </View>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Cari hadits (judul/arab/indo/perawi)"
        placeholderTextColor="#64748b"
        style={styles.search}
      />
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" /></View>
      ) : error ? (
        <View style={styles.center}><Text>{error}</Text></View>
      ) : (
        <View style={{ flex: 1 }}>
          <FlatList
            data={paged}
            keyExtractor={(item, idx) => String(item?.no ?? item?.nomor ?? idx)}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
          />
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
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 12 },
  title: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  randomBtn: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  randomText: { color: theme.colors.primary, fontWeight: '700' },
  search: { margin: 16, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: '#0f172a', backgroundColor: '#fff' },
  list: { padding: 16 },
  item: { padding: 14, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, backgroundColor: '#fff', marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3 },
  itemTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  itemSubtitle: { color: '#64748b', marginTop: 4 },
  // Pager styles
  pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc' },
  pagerBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  pagerBtnDisabled: { opacity: 0.6 },
  pagerBtnText: { color: theme.colors.primary, fontWeight: '700' },
  pagerBtnTextDisabled: { color: '#94a3b8' },
  pagerText: { color: '#0f172a', fontWeight: '700' },
});