import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, useWindowDimensions, Platform } from 'react-native';
import { getHaditsPerawiList } from '../../api/hadits';
import { getPalette } from '../../ui';
import { useAppearance } from '../../api/appearance';
import { ListScreen, ListTitleRow, ListSearch, ListResultInfo, ListStatus, ListPager, usePagedList } from '../../ui/ListScaffold';

// Layar daftar perawi - memakai kerangka list standar (ListScaffold).
// Konten spesifik layar ini HANYA renderItem.

export default function HaditsPerawiListScreen({ navigation }) {
  const { darkMode } = useAppearance();
  const pal = getPalette(darkMode);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState('');

  // Ukuran halaman dinamis (mobile) / tetap 30 (web) - sama pola dengan layar list lain
  const { height: windowHeight } = useWindowDimensions();
  const itemHeightEstimate = 72;
  const pageSize = (Platform.OS === 'android' || Platform.OS === 'ios')
    ? Math.max(8, Math.floor((windowHeight - 152) / itemHeightEstimate))
    : 30;

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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => {
      const hay = `${it?.nama ?? it?.name ?? ''} ${it?.slug ?? it?.id ?? ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [items, query]);

  // Paging via kerangka (reset otomatis saat pencarian berubah)
  const { page, totalPages, pageData: paged, goPrev, goNext, canPrev, canNext } = usePagedList(filtered, pageSize, query);

  const renderItem = ({ item }) => {
    const name = item?.nama ?? item?.name ?? '';
    const slug = item?.slug ?? item?.id ?? '';
    return (
      <TouchableOpacity
        style={[localStyles.item, { backgroundColor: pal.colors.surface, borderColor: pal.colors.surfaceBorder }]}
        onPress={() => navigation.navigate('HaditsPerawiEntry', { slug, name })}
      >
        <Text style={[localStyles.itemTitle, { color: pal.colors.text }]} numberOfLines={1} ellipsizeMode="tail">{name}</Text>
        <Text style={[localStyles.itemSubtitle, { color: pal.colors.muted }]} numberOfLines={1} ellipsizeMode="tail">{slug}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <ListScreen>
      <ListTitleRow title="Hadits 9 Perawi" />
      <ListSearch value={query} onChangeText={setQuery} placeholder="Cari perawi (nama/slug)" />
      <ListResultInfo>Total Perawi: {filtered.length}</ListResultInfo>
      <ListStatus loading={loading} error={error} empty={filtered.length === 0} emptyText="Perawi tidak ditemukan.">
        <View style={{ flex: 1 }}>
          <FlatList
            data={paged}
            keyExtractor={(item, idx) => String(item?.slug ?? idx)}
            renderItem={renderItem}
            contentContainerStyle={localStyles.list}
          />
          <ListPager
            onPrev={goPrev} onNext={goNext}
            canPrev={canPrev} canNext={canNext}
            label={`Halaman ${page + 1} / ${totalPages}`}
          />
        </View>
      </ListStatus>
    </ListScreen>
  );
}

// Gaya spesifik konten (sisa kerangka datang dari ListScaffold)
const localStyles = StyleSheet.create({
  list: { padding: 16 },
  item: { padding: 12, borderWidth: 1, borderRadius: 10, marginBottom: 10 },
  itemTitle: { fontSize: 16, fontWeight: '700' },
  itemSubtitle: { marginTop: 4 },
});
