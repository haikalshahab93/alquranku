import React, { useState, useMemo, useEffect } from 'react';
import { SafeAreaView, View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../ui';

const ULAMA = require('../../data/ulama.json');
const PAGE_SIZE = 30; // set dari 100 ke 30 sesuai permintaan

export default function UlamaListScreen({ navigation }) {
  const [query, setQuery] = useState('');
  const [pageIndex, setPageIndex] = useState(0);
  const { width } = useWindowDimensions();
  const numCols = width >= 1200 ? 3 : width >= 768 ? 2 : 1;
  const isGrid = numCols > 1;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ULAMA;
    return ULAMA.filter((u) => {
      const hay = [
        u.name || '',
        u.name_ar || '',
        u.origin || '',
        u.bio || '',
        ...(u.works || [])
      ].join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [query]);

  useEffect(() => {
    setPageIndex(0);
  }, [query]);

  const data = useMemo(() => {
    const start = pageIndex * PAGE_SIZE;
    const end = Math.min((pageIndex + 1) * PAGE_SIZE, filtered.length);
    return filtered.slice(start, end);
  }, [filtered, pageIndex]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const canPrev = pageIndex > 0;
  const canNext = pageIndex < (totalPages - 1);
  const goPrev = () => { if (canPrev) setPageIndex((p) => Math.max(0, p - 1)); };
  const goNext = () => { if (canNext) setPageIndex((p) => Math.min(totalPages - 1, p + 1)); };

  const renderItem = ({ item }) => {
    const hijriSpan = [item.birth_hijri, item.death_hijri].filter(Boolean).join(' — ');
    const gregSpan = [item.birth_gregorian, item.death_gregorian].filter(Boolean).join(' — ');
    const hasRaw = !!item.raw && Object.keys(item.raw || {}).length > 0;
    return (
      <TouchableOpacity style={[styles.item, isGrid && styles.itemGrid]} onPress={() => navigation.navigate('UlamaDetail', { scholar: item })}>
        <View style={styles.itemHeaderRow}>
          <Text style={styles.itemTitle} numberOfLines={1} ellipsizeMode="tail">{item.name}</Text>
          {hasRaw && (
            <View style={styles.badge}><Text style={styles.badgeText}>Lengkap</Text></View>
          )}
        </View>
        {!!item.name_ar && <Text style={styles.itemTitleAr} numberOfLines={1} ellipsizeMode="tail">{item.name_ar}</Text>}
        <Text style={styles.itemMeta} numberOfLines={1} ellipsizeMode="tail">{item.origin || '-'}</Text>
        {!!hijriSpan && <Text style={styles.itemMeta} numberOfLines={1} ellipsizeMode="tail">Hijri: {hijriSpan}</Text>}
        {!!gregSpan && <Text style={styles.itemMeta} numberOfLines={1} ellipsizeMode="tail">Masehi: {gregSpan}</Text>}
      </TouchableOpacity>
    );
  };

  const ListFooter = () => {
    const start = pageIndex * PAGE_SIZE + 1;
    const end = Math.min((pageIndex + 1) * PAGE_SIZE, filtered.length);
    const showPagination = filtered.length > PAGE_SIZE;
    return (
      <View style={styles.footerBox}>
        {showPagination && (
          <View style={styles.paginationRow}>
            <TouchableOpacity style={[styles.pageBtn, !canPrev && styles.pageBtnDisabled]} onPress={goPrev} disabled={!canPrev}>
              <Text style={[styles.pageBtnText, !canPrev && styles.pageBtnTextDisabled]}>Sebelumnya</Text>
            </TouchableOpacity>
            <Text style={styles.pageInfo}>{`Halaman ${pageIndex + 1} dari ${totalPages}`}</Text>
            <TouchableOpacity style={[styles.pageBtn, !canNext && styles.pageBtnDisabled]} onPress={goNext} disabled={!canNext}>
              <Text style={[styles.pageBtnText, !canNext && styles.pageBtnTextDisabled]}>Sesudahnya</Text>
            </TouchableOpacity>
          </View>
        )}
        <Text style={styles.footerInfo}>{`Menampilkan ${start}-${end} dari ${filtered.length}`}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <LinearGradient colors={[theme.colors.primaryLight, theme.colors.white]} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.headerCard}>
        <Text style={styles.title}>Ulama Islam</Text>
        <Text style={styles.subtitle}>Kumpulan data ulama dan karya-karyanya</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Cari ulama (nama/asal/karya)"
          placeholderTextColor={theme.colors.muted}
          style={[styles.search, isGrid && styles.searchWide]}
        />
        <Text style={styles.resultInfo}>{`Hasil: ${filtered.length} dari ${ULAMA.length}`}</Text>
      </LinearGradient>
      <FlatList
        key={numCols}
        data={data}
        keyExtractor={(item, idx) => String(item.id ?? idx)}
        contentContainerStyle={[styles.list, isGrid && styles.listGrid]}
        renderItem={renderItem}
        ListEmptyComponent={<View style={styles.center}><Text>Tidak ada hasil.</Text></View>}
        initialNumToRender={20}
        windowSize={10}
        removeClippedSubviews={true}
        ListFooterComponent={ListFooter}
        numColumns={numCols}
        columnWrapperStyle={isGrid ? styles.columnWrapper : undefined}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerCard: { padding: 16, borderBottomWidth: 1, borderColor: theme.colors.primaryLight },
  title: { fontSize: 20, fontWeight: '800', color: theme.colors.text },
  subtitle: { color: theme.colors.muted, marginTop: 4, marginBottom: 8 },
  search: { borderWidth: 1, borderColor: theme.colors.primaryLight, backgroundColor: theme.colors.white, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  searchWide: { alignSelf: 'center', maxWidth: 560, width: '100%' },
  resultInfo: { color: theme.colors.muted, marginTop: 8 },
  list: { padding: 16 },
  listGrid: { paddingHorizontal: 10 },
  columnWrapper: { justifyContent: 'space-between', marginBottom: 12 },
  item: { padding: 12, borderWidth: 1, borderColor: theme.colors.primaryLight, backgroundColor: theme.colors.white, borderRadius: 12, marginBottom: 12 },
  itemGrid: { flex: 1, marginHorizontal: 6 },
  itemHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  badge: { marginLeft: 8, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, backgroundColor: 'rgba(139,92,246,0.1)', borderWidth: 1, borderColor: theme.colors.primaryLight, flexShrink: 0, alignSelf: 'flex-start' },
  badgeText: { fontSize: 12, color: theme.colors.primaryDark },
  itemTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.text, flex: 1, minWidth: 0 },
  itemTitleAr: { fontSize: 14, color: theme.colors.muted, marginTop: 2 },
  itemMeta: { color: theme.colors.muted, marginTop: 2 },
  center: { alignItems: 'center', padding: 16 },
  footerBox: { alignItems: 'center', paddingVertical: 12 },
  paginationRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pageBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: 'rgba(139,92,246,0.08)', borderWidth: 1, borderColor: theme.colors.primaryLight },
  pageBtnDisabled: { backgroundColor: '#f1f5f9', borderColor: '#e5e7eb' },
  pageBtnText: { color: theme.colors.primaryDark, fontWeight: '600' },
  pageBtnTextDisabled: { color: '#94a3b8' },
  pageInfo: { color: theme.colors.muted },
  footerInfo: { color: theme.colors.muted, marginTop: 8 },
});