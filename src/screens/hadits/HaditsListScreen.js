import React, { useEffect, useMemo, useState, useRef } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet, TextInput, TouchableOpacity, useWindowDimensions, Platform, SafeAreaView, ScrollView } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { getHaditsArbainSemua } from '../../api/hadits';
import { getPalette } from '../../ui';
import { useAppearance } from '../../api/appearance';

function normalizeArray(payload) {
  // Terima berbagai bentuk respons dari API myQuran v2
  // Prioritas: array langsung, lalu di bawah field umum (data, result, list, data.data, data.list, hasil, dan kombinasi bertingkat)
  const candidates = [
    payload,
    payload?.data,
    payload?.result,
    payload?.list,
    payload?.hasil,
    payload?.data?.data,
    payload?.data?.list,
    payload?.data?.result,
    payload?.result?.data,
    payload?.result?.list,
    payload?.hasil?.data,
    payload?.hasil?.list,
  ];
  for (const c of candidates) {
    if (Array.isArray(c)) return c;
  }
  // Jika respons berupa objek dengan elemen bernomor (mis. {"1": {...}, "2": {...}}), konversi ke array nilai
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    const values = Object.values(payload);
    // Jika semua nilai adalah objek hadits, gunakan langsung
    if (values.length > 0 && values.every((v) => typeof v === 'object')) {
      // Cek jika setidaknya ada properti konten pada beberapa elemen
      const hasContentLike = values.some((v) => v?.judul || v?.title || v?.arab || v?.indo || v?.latin);
      if (hasContentLike) return values;
    }
    // Fallback: cari array secara deep (hingga beberapa tingkatan)
    const findArrayDeep = (obj, depth = 3) => {
      if (!obj || depth < 0) return null;
      if (Array.isArray(obj)) return obj;
      if (typeof obj === 'object') {
        for (const v of Object.values(obj)) {
          if (Array.isArray(v)) return v;
          const found = findArrayDeep(v, depth - 1);
          if (found && Array.isArray(found)) return found;
        }
      }
      return null;
    };
    const deepArr = findArrayDeep(payload, 4);
    if (Array.isArray(deepArr)) return deepArr;
  }
  return [];
}

export default function HaditsListScreen({ navigation }) {
  const { darkMode } = useAppearance();
  const pal = getPalette(darkMode);

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  // Hitung ukuran halaman dinamis berdasarkan tinggi layar (khusus mobile)
  const { height: windowHeight } = useWindowDimensions();
  const isMobile = Platform.OS === 'android' || Platform.OS === 'ios';
  const isWeb = Platform.OS === 'web';
  const headerHeight = 140; // estimasi tinggi header + pencarian
  const footerHeight = 72;  // estimasi tinggi pager
  const itemHeightEstimate = 88; // estimasi tinggi kartu item
  const pageSize = Math.max(5, Math.floor((windowHeight - headerHeight - footerHeight) / itemHeightEstimate));

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await getHaditsArbainSemua();
        const payload = res?.data ?? res;
        const arr = normalizeArray(payload);
        const toNum = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
        const arrSorted = Array.isArray(arr) ? [...arr].sort((a, b) => {
          const na = toNum(a?.no ?? a?.nomor ?? a?.number);
          const nb = toNum(b?.no ?? b?.nomor ?? b?.number);
          return na - nb;
        }) : [];
        setItems(arrSorted);
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
  // Sinkronisasi currentIndex agar selalu dalam rentang daftar terfilter
  useEffect(() => {
    setCurrentIndex((idx) => {
      const maxIdx = Math.max(0, filtered.length - 1);
      return Math.min(Math.max(0, idx), maxIdx);
    });
  }, [filtered]);
  // Paging
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const start = safePage * pageSize;
  const end = start + pageSize;
  const paged = filtered.slice(start, end);
  // Sinkronisasi currentIndex dengan item terakhir yang terlihat di layar
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 });
  const onViewableItemsChangedRef = useRef(({ viewableItems }) => {
    // Gunakan nilai terkini via closures dari ref tambahan
    const currentShowAll = showAllRef.current;
    const currentStart = startRef.current;
    if (!viewableItems || viewableItems.length === 0) return;
    const localIndexes = viewableItems.map((vi) => (typeof vi.index === 'number' ? vi.index : 0));
    const maxLocalIdx = localIndexes.length ? Math.max(...localIndexes) : 0;
    const globalIdx = currentShowAll ? maxLocalIdx : (currentStart + maxLocalIdx);
    setCurrentIndex(globalIdx);
  });
  const showAllRef = useRef(showAll);
  const startRef = useRef(start);
  useEffect(() => { showAllRef.current = showAll; }, [showAll]);
  useEffect(() => { startRef.current = start; }, [start]);
  const listRef = useRef(null);
  const goPrev = () => {
    setPage((p) => {
      const next = Math.max(0, p - 1);
      // scroll ke item pertama halaman baru
      const targetIndex = next * pageSize;
      requestAnimationFrame(() => {
        listRef.current?.scrollToIndex?.({ index: targetIndex, animated: true });
      });
      return next;
    });
  };
  const goNext = () => {
    setPage((p) => {
      const next = Math.min(totalPages - 1, p + 1);
      // scroll ke item pertama halaman baru
      const targetIndex = next * pageSize;
      requestAnimationFrame(() => {
        listRef.current?.scrollToIndex?.({ index: targetIndex, animated: true });
      });
      return next;
    });
  };
  const dataToRender = showAll ? filtered : paged;
  const getNomor = (item, fallbackIndex) => item?.no ?? item?.nomor ?? item?.number ?? (fallbackIndex + 1);
  const haditsPrev = () => {
    if (filtered.length === 0) return;
    setCurrentIndex((i) => {
      const target = Math.max(0, i - 1);
      const nomor = getNomor(filtered[target], target);
      navigation.navigate('HaditsDetail', { nomor });
      return target;
    });
  };
  const haditsNext = () => {
    if (filtered.length === 0) return;
    setCurrentIndex((i) => {
      const target = Math.min(filtered.length - 1, i + 1);
      const nomor = getNomor(filtered[target], target);
      navigation.navigate('HaditsDetail', { nomor });
      return target;
    });
  };

  const renderItem = ({ item, index }) => {
    const nomor = item?.no ?? item?.nomor ?? item?.number ?? (index + 1);
    const title = item?.judul ?? item?.title ?? `Hadits ${nomor}`;
    const perawi = item?.perawi ?? item?.rawi ?? item?.narrator ?? '';
    const globalIndex = showAll ? index : start + index;
    return (
      <TouchableOpacity
        style={[styles.item, { backgroundColor: pal.colors.surface, borderColor: pal.colors.surfaceBorder }]}
        onPress={() => { setCurrentIndex(globalIndex); navigation.navigate('HaditsDetail', { nomor }); }}
      >
        <View style={styles.itemRow}>
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" style={styles.itemIcon}>
            <Path d="M4 4h12a2 2 0 012 2v12l-4-2-4 2-4-2-4 2V6a2 2 0 012-2z" stroke={pal.colors.muted} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
          <View style={{ flex: 1 }}>
            <Text style={[styles.itemTitle, { color: pal.colors.text }]} numberOfLines={1} ellipsizeMode="tail">{title}</Text>
            {!!perawi && <Text style={[styles.itemSubtitle, { color: pal.colors.muted }]} numberOfLines={1} ellipsizeMode="tail">Perawi: {perawi}</Text>}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: pal.colors.bg }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: pal.colors.text }]}>Arba’in Nawawi</Text>
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.randomBtn, { backgroundColor: pal.colors.surface, borderColor: pal.colors.surfaceBorder }, showAll && styles.activeBtn]}
            onPress={() => setShowAll((s) => !s)}
          >
            <Text style={[styles.randomText, { color: pal.colors.primary }, showAll && styles.activeText]}>{showAll ? 'Tampilkan Halaman' : 'Tampilkan Semua'}</Text>
          </TouchableOpacity>
        </View>
      </View>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Cari hadits (judul/arab/indo/perawi)"
        placeholderTextColor={pal.colors.muted}
        style={[styles.search, { backgroundColor: pal.colors.surface, borderColor: pal.colors.surfaceBorder, color: pal.colors.text }]}
      />
      <Text style={[styles.totalText, { color: pal.colors.muted }]}>Total Hadits: {filtered.length}</Text>
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={pal.colors.primary} /></View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={{ color: pal.colors.muted, textAlign: 'center', paddingHorizontal: 16 }}>{error}</Text>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {showAll ? (
             <ScrollView contentContainerStyle={styles.list}>
               {filtered.map((item, index) => {
                 const key = String(item?.no ?? item?.nomor ?? item?.number ?? index);
                 return (
                   <View key={key}>
                     {renderItem({ item, index })}
                   </View>
                 );
               })}
             </ScrollView>
           ) : (
             <FlatList
              ref={listRef}
              data={paged}
              keyExtractor={(item, idx) => String(item?.no ?? item?.nomor ?? item?.number ?? idx)}
              renderItem={renderItem}
              contentContainerStyle={styles.list}
              onViewableItemsChanged={onViewableItemsChangedRef.current}
              viewabilityConfig={viewabilityConfig.current}
              getItemLayout={(data, index) => ({ length: itemHeightEstimate, offset: itemHeightEstimate * index, index })}
            />
           )}
          {(!showAll && totalPages > 1) ? (
            <View style={[styles.pager, { backgroundColor: pal.colors.bg, borderColor: pal.colors.surfaceBorder }]}>
              <TouchableOpacity onPress={goPrev} disabled={safePage <= 0} style={[styles.pagerBtn, { backgroundColor: pal.colors.surface, borderColor: pal.colors.surfaceBorder }, safePage <= 0 && styles.pagerBtnDisabled]} accessibilityRole="button" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={[styles.pagerBtnText, { color: safePage <= 0 ? pal.colors.muted : pal.colors.primary }]}>Sebelumnya</Text>
              </TouchableOpacity>
              <Text style={[styles.pagerText, { color: pal.colors.text }]}>Halaman {safePage + 1} / {totalPages}</Text>
              <TouchableOpacity onPress={goNext} disabled={safePage >= totalPages - 1} style={[styles.pagerBtn, { backgroundColor: pal.colors.surface, borderColor: pal.colors.surfaceBorder }, safePage >= totalPages - 1 && styles.pagerBtnDisabled]} accessibilityRole="button" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={[styles.pagerBtnText, { color: safePage >= totalPages - 1 ? pal.colors.muted : pal.colors.primary }]}>Sesudahnya</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={[styles.pager, { backgroundColor: pal.colors.bg, borderColor: pal.colors.surfaceBorder }]}>
              <TouchableOpacity onPress={haditsPrev} disabled={currentIndex <= 0 || filtered.length === 0} style={[styles.pagerBtn, { backgroundColor: pal.colors.surface, borderColor: pal.colors.surfaceBorder }, (currentIndex <= 0 || filtered.length === 0) && styles.pagerBtnDisabled]} accessibilityRole="button" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={[styles.pagerBtnText, { color: (currentIndex <= 0 || filtered.length === 0) ? pal.colors.muted : pal.colors.primary }]}>Sebelumnya</Text>
              </TouchableOpacity>
              <Text style={[styles.pagerText, { color: pal.colors.text }]}>Hadits {filtered.length ? (getNomor(filtered[currentIndex], currentIndex)) : '-'} / {filtered.length || 0}</Text>
              <TouchableOpacity onPress={haditsNext} disabled={currentIndex >= filtered.length - 1 || filtered.length === 0} style={[styles.pagerBtn, { backgroundColor: pal.colors.surface, borderColor: pal.colors.surfaceBorder }, (currentIndex >= filtered.length - 1 || filtered.length === 0) && styles.pagerBtnDisabled]} accessibilityRole="button" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={[styles.pagerBtnText, { color: (currentIndex >= filtered.length - 1 || filtered.length === 0) ? pal.colors.muted : pal.colors.primary }]}>Sesudahnya</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 12 },
  title: { fontSize: 20, fontWeight: '800' },
  actionsRow: { flexDirection: 'row', alignItems: 'center' },
  randomBtn: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1 },
  randomText: { fontWeight: '700' },
  activeBtn: { backgroundColor: '#8b5cf6', borderColor: '#8b5cf6' },
  activeText: { color: '#fff' },
  search: { margin: 16, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  totalText: { paddingHorizontal: 16 },
  list: { padding: 16 },
  item: { padding: 14, borderWidth: 1, borderRadius: 12, marginBottom: 12, elevation: 2, boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.08)' },
  itemRow: { flexDirection: 'row', alignItems: 'center' },
  itemIcon: { marginRight: 10 },
  itemTitle: { fontSize: 16, fontWeight: '700' },
  itemSubtitle: { marginTop: 4 },
  // Pager styles
  pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1 },
  pagerBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, cursor: 'pointer' },
  pagerBtnDisabled: { opacity: 0.6 },
  pagerBtnText: { fontWeight: '700' },
  pagerText: { fontWeight: '700' },
});