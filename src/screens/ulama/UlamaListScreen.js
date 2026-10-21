import React, { useState, useMemo, useEffect } from 'react';
import { SafeAreaView, View, Text, FlatList, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme, getPalette } from '../../ui';
import { useAppearance } from '../../api/appearance';
import { ListSearch, ListResultInfo, ListPager, usePagedList } from '../../ui/ListScaffold';

const ULAMA = require('../../data/ulama.json');
const PAGE_SIZE = 30; // set dari 100 ke 30 sesuai permintaan

export default function UlamaListScreen({ navigation }) {
  const { darkMode } = useAppearance();
  const pal = getPalette(darkMode);
  const [query, setQuery] = useState('');
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

  // Paging via kerangka: reset otomatis saat query berubah
  const { page: pageIndex, totalPages, pageData: data, goPrev, goNext, canPrev, canNext } = usePagedList(filtered, PAGE_SIZE, query);
  const renderItem = ({ item }) => {
    const hijriSpan = [item.birth_hijri, item.death_hijri].filter(Boolean).join(' — ');
    const gregSpan = [item.birth_gregorian, item.death_gregorian].filter(Boolean).join(' — ');
    const hasRaw = !!item.raw && Object.keys(item.raw || {}).length > 0;
    return (
      <TouchableOpacity style={[styles.item, { backgroundColor: pal.colors.surface, borderColor: pal.colors.surfaceBorder }, isGrid && styles.itemGrid]} onPress={() => navigation.navigate('UlamaDetail', { scholar: item, scholarId: item.id })} activeOpacity={0.85}>
        <View style={styles.itemHeaderRow}>
          <Text style={[styles.itemTitle, { color: pal.colors.text }]} numberOfLines={1} ellipsizeMode="tail">{item.name}</Text>
          {hasRaw && (
            <View style={styles.badge}><Text style={styles.badgeText}>Lengkap</Text></View>
          )}
        </View>
        {!!item.name_ar && <Text style={[styles.itemTitleAr, { color: pal.colors.muted }]} numberOfLines={1} ellipsizeMode="tail">{item.name_ar}</Text>}
        <Text style={[styles.itemMeta, { color: pal.colors.muted }]} numberOfLines={1} ellipsizeMode="tail">{item.origin || '-'}</Text>
        {!!hijriSpan && <Text style={[styles.itemMeta, { color: pal.colors.muted }]} numberOfLines={1} ellipsizeMode="tail">Hijri: {hijriSpan}</Text>}
        {!!gregSpan && <Text style={[styles.itemMeta, { color: pal.colors.muted }]} numberOfLines={1} ellipsizeMode="tail">Masehi: {gregSpan}</Text>}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: pal.colors.bg }}>
      <LinearGradient colors={pal.gradients.brandSoft} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.headerCard}>
        <Text style={[styles.title, { color: pal.colors.text }]}>Ulama Islam</Text>
        <Text style={[styles.subtitle, { color: pal.colors.muted }]}>Kumpulan data ulama dan karya-karyanya</Text>
        <ListSearch
          value={query}
          onChangeText={setQuery}
          placeholder="Cari ulama (nama/asal/karya)"
          style={[styles.search, { margin: 0, marginBottom: 8, borderColor: pal.colors.primary }, isGrid && styles.searchWide]}
        />
        <ListResultInfo style={{ paddingHorizontal: 0 }}>{`Hasil: ${filtered.length} dari ${ULAMA.length}`}</ListResultInfo>
      </LinearGradient>
      <View style={{ flex: 1 }}>
        <FlatList
          key={numCols}
          data={data}
          keyExtractor={(item, idx) => String(item.id ?? idx)}
          contentContainerStyle={[styles.list, isGrid && styles.listGrid]}
          renderItem={renderItem}
          ListEmptyComponent={<View style={styles.center}><Text style={{ color: pal.colors.muted }}>Tidak ada hasil.</Text></View>}
          initialNumToRender={20}
          windowSize={10}
          removeClippedSubviews={true}
          numColumns={numCols}
          columnWrapperStyle={isGrid ? styles.columnWrapper : undefined}
        />
        {filtered.length > PAGE_SIZE && (
          <ListPager
            onPrev={goPrev} onNext={goNext}
            canPrev={canPrev} canNext={canNext}
            label={`Halaman ${pageIndex + 1} dari ${totalPages}`}
          />
        )}
      </View>
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


});