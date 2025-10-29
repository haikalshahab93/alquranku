import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet, TextInput, TouchableOpacity, useWindowDimensions, Platform } from 'react-native';
import { getDoaList } from '../api/doa';

function normalizeArray(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

export default function DoaListScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState(null);
  const { width, height: windowHeight } = useWindowDimensions();
  const isMobile = Platform.OS === 'android' || Platform.OS === 'ios';

  const [page, setPage] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await getDoaList();
        setItems(normalizeArray(res));
      } catch (e) {
        setError(e?.message || 'Gagal memuat daftar doa');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    // Reset ke halaman pertama saat query berubah agar tidak out-of-range
    setPage(0);
  }, [query]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => {
      const nama = String(it?.nama ?? '').toLowerCase();
      const arab = String(it?.ar ?? '').toLowerCase();
      const indo = String(it?.idn ?? '').toLowerCase();
      const latin = String(it?.tr ?? '').toLowerCase();
      const tentang = String(it?.tentang ?? '').toLowerCase();
      const tags = Array.isArray(it?.tag) ? it.tag.join(', ').toLowerCase() : '';
      return nama.includes(q) || arab.includes(q) || indo.includes(q) || latin.includes(q) || tentang.includes(q) || tags.includes(q);
    });
  }, [items, query]);

  // Satu item per baris
  const numColumns = 1;

  // Pagination dinamis berdasarkan tinggi layar
  // Perkiraan tinggi:
  // - headerRow + search: ~140px
  // - footer pager: ~72px
  // - tinggi kartu doa: ~120px
  const headerHeight = 140;
  const footerHeight = 72;
  const itemHeightEstimate = 120;
  const pageSize = isMobile
    ? Math.max(5, Math.floor((windowHeight - headerHeight - footerHeight) / itemHeightEstimate))
    : 20;

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(totalPages - 1, Math.max(0, page));
  const start = safePage * pageSize;
  const end = start + pageSize;
  const pagedItems = filtered.slice(start, end);

  const goPrev = () => setPage((p) => Math.max(0, p - 1));
  const goNext = () => setPage((p) => Math.min(totalPages - 1, p + 1));

  const renderItem = ({ item }) => {
    const id = item?.id;
    const title = item?.nama || `Doa ${id}`;
    const tags = Array.isArray(item?.tag) ? item.tag.join(', ') : '';
    return (
      <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('DoaDetail', { id })}>
        <Text style={styles.cardTitle}>{title}</Text>
        {!!tags && <Text style={styles.cardTags}>{tags}</Text>}
        {/* deskripsi/arti disembunyikan sesuai permintaan */}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Daftar Doa</Text>
        <TouchableOpacity style={styles.randomBtn} onPress={() => {
          if (!filtered.length) return;
          const idx = Math.floor(Math.random() * filtered.length);
          const id = filtered[idx]?.id;
          if (id != null) navigation.navigate('DoaDetail', { id });
        }}>
          <Text style={styles.randomText}>Acak</Text>
        </TouchableOpacity>
      </View>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Cari doa (nama/arab/latin/indo/tag)"
        placeholderTextColor="#64748b"
        style={styles.search}
      />
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" /></View>
      ) : error ? (
        <View style={styles.center}><Text>{error}</Text></View>
      ) : (
        <FlatList
          key={`grid-${numColumns}`}
          data={pagedItems}
          keyExtractor={(item, idx) => String(item?.id ?? idx)}
          renderItem={renderItem}
          numColumns={numColumns}
          contentContainerStyle={[styles.list]}
          ListFooterComponent={(
            <View>
              <View style={styles.pagerRow}>
                <TouchableOpacity style={[styles.pagerBtn, safePage <= 0 && styles.pagerBtnDisabled]} onPress={goPrev} disabled={safePage <= 0}>
                  <Text style={styles.pagerText}>Sebelumnya</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.pagerBtn, safePage >= totalPages - 1 && styles.pagerBtnDisabled]} onPress={goNext} disabled={safePage >= totalPages - 1}>
                  <Text style={styles.pagerText}>Berikutnya</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
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
  randomText: { color: '#0ea5e9', fontWeight: '700' },
  search: { margin: 16, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: '#0f172a', backgroundColor: '#fff' },
  list: { padding: 16 },
  card: { flex: 1, padding: 14, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, backgroundColor: '#fff', marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  cardTags: { color: '#64748b', marginTop: 4 },
  cardDesc: { color: '#334155', marginTop: 4 },
  pagerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 8 },
  pagerBtn: { flex: 1, paddingVertical: 10, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, backgroundColor: '#fff' },
  pagerBtnDisabled: { opacity: 0.5 },
  pagerText: { textAlign: 'center', fontWeight: '700', color: '#0ea5e9' },
});