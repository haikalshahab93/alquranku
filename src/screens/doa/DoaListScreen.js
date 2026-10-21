
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { getDoaList, getDoaFavorites, getLastReadDoa } from '../../api/doa';
import { theme, getPalette } from '../../ui';
import { useAppearance } from '../../api/appearance';

function normalizeArray(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

export default function DoaListScreen({ navigation }) {
  const { darkMode } = useAppearance();
  const pal = getPalette(darkMode);
  const { height: windowHeight } = useWindowDimensions();

  const isMobile =
    Platform.OS === 'android' || Platform.OS === 'ios';

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [fromCacheList, setFromCacheList] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [lastRead, setLastRead] = useState(null);

  const fetchList = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await getDoaList();
      const arr = normalizeArray(res);

      setItems(arr);
      setFromCacheList(Boolean(res?.__fromCache));
    } catch (e) {
      setError(e?.message || 'Gagal memuat daftar doa.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMeta = useCallback(async () => {
    try {
      const [favs, lr] = await Promise.all([
        getDoaFavorites(),
        getLastReadDoa(),
      ]);

      setFavorites(Array.isArray(favs) ? favs : []);
      setLastRead(lr ?? null);
    } catch (e) {
      console.warn('Gagal memuat favorit atau riwayat doa:', e);
    }
  }, []);

  useEffect(() => {
    fetchList();
    loadMeta();
  }, [fetchList, loadMeta]);

  useEffect(() => {
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

      const tags = Array.isArray(it?.tag)
        ? it.tag.join(', ').toLowerCase()
        : '';

      return (
        nama.includes(q) ||
        arab.includes(q) ||
        indo.includes(q) ||
        latin.includes(q) ||
        tentang.includes(q) ||
        tags.includes(q)
      );
    });
  }, [items, query]);

  const headerHeight = 140;
  const footerHeight = 72;
  const itemHeightEstimate = 120;

  const pageSize = isMobile
    ? Math.max(
        5,
        Math.floor(
          (windowHeight - headerHeight - footerHeight) /
            itemHeightEstimate
        )
      )
    : 20;

  const totalPages = Math.max(
    1,
    Math.ceil(filtered.length / pageSize)
  );

  const safePage = Math.min(
    totalPages - 1,
    Math.max(0, page)
  );

  const start = safePage * pageSize;
  const pagedItems = filtered.slice(start, start + pageSize);

  const goPrev = useCallback(() => {
    setPage((p) => Math.max(0, p - 1));
  }, []);

  const goNext = useCallback(() => {
    setPage((p) => Math.min(totalPages - 1, p + 1));
  }, [totalPages]);

  const listScrollToNext = useCallback(() => {
    if (!listRef.current || totalPages <= 1) return;
    requestAnimationFrame(() => {
      const nextIndex = Math.min(totalPages * pageSize, filtered.length);
      if (nextIndex <= 0) return;
      listRef.current?.scrollToIndex?.({ index: safePage + pageSize < filtered.length ? safePage + pageSize : filtered.length - 1, animated: true });
    });
  }, [filtered.length, page, pageSize, safePage, totalPages]);

  const openDoa = useCallback(
    (id) => {
      if (id == null) return;

      navigation.navigate('DoaDetail', { id });
    },
    [navigation]
  );

  const openRandom = useCallback(() => {
    if (filtered.length === 0) return;

    const index = Math.floor(Math.random() * filtered.length);
    openDoa(filtered[index]?.id);
  }, [filtered, openDoa]);

  const renderItem = useCallback(
    ({ item }) => {
      const id = item?.id;
      const title = item?.nama || `Doa ${id}`;

      const tags = Array.isArray(item?.tag)
        ? item.tag.join(', ')
        : '';

      const isFav = favorites.some(
        (fav) => String(fav?.id ?? fav) === String(id)
      );

      return (
        <TouchableOpacity
          style={[
            styles.card,
            {
              backgroundColor: pal.colors.surface,
              borderColor: pal.colors.surfaceBorder,
            },
          ]}
          onPress={() => openDoa(id)}
          accessibilityRole="button"
          accessibilityLabel={`Buka ${title}`}
        >
          <View style={styles.itemRow}>
            <Svg
              width={20}
              height={20}
              viewBox="0 0 24 24"
              style={styles.itemIcon}
            >
              <Path
                fill={pal.colors.muted}
                d="M9 11c0-1.657 1.343-3 3-3s3 1.343 3 3v6h-2v-6a1 1 0 10-2 0v6H9v-6z"
              />
              <Path
                fill={pal.colors.muted}
                d="M7 11a5 5 0 0110 0v7h-2v-7a3 3 0 10-6 0v7H7v-7z"
                opacity={0.4}
              />
            </Svg>

            <Text
              style={[
                styles.cardTitle,
                { color: pal.colors.text },
              ]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {title}
            </Text>

            {isFav ? (
              <Text style={styles.favBadge}>♥</Text>
            ) : null}
          </View>

          {!!tags && (
            <Text
              style={[
                styles.cardTags,
                { color: pal.colors.muted },
              ]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {tags}
            </Text>
          )}
        </TouchableOpacity>
      );
    },
    [favorites, openDoa, pal]
  );

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: pal.colors.bg },
      ]}
    >
      <View style={styles.headerRow}>
        <Text
          style={[
            styles.title,
            { color: pal.colors.text },
          ]}
        >
          Daftar Doa
        </Text>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[
              styles.randomBtn,
              {
                backgroundColor: pal.colors.surface,
                borderColor: pal.colors.surfaceBorder,
              },
            ]}
            onPress={openRandom}
          >
            <Text
              style={[
                styles.randomText,
                { color: pal.colors.text },
              ]}
            >
              Acak
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.randomBtn,
              {
                marginLeft: 8,
                backgroundColor: pal.colors.surface,
                borderColor: pal.colors.surfaceBorder,
              },
            ]}
            onPress={() => {
              fetchList();
              loadMeta();
            }}
          >
            <Text
              style={[
                styles.randomText,
                { color: pal.colors.text },
              ]}
            >
              Refresh
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {fromCacheList && (
        <View style={styles.cacheBadge}>
          <Text style={styles.cacheText}>
            Data dari Cache
          </Text>
        </View>
      )}

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Cari doa (nama/arab/latin/indo/tag)"
        placeholderTextColor="#64748b"
        style={[
          styles.search,
          {
            backgroundColor: pal.colors.surface,
            borderColor: pal.colors.surfaceBorder,
            color: pal.colors.text,
          },
        ]}
        accessibilityLabel="Cari daftar doa"
        returnKeyType="search"
      />

      {lastRead?.id != null && (
        <TouchableOpacity
          style={[
            styles.lastReadCard,
            {
              backgroundColor: pal.colors.surface,
              borderColor: pal.colors.surfaceBorder,
            },
          ]}
          onPress={() => openDoa(lastRead.id)}
        >
          <Text style={styles.lastReadTitle}>
            Lanjutkan Doa Terakhir
          </Text>

          <Text
            style={[
              styles.lastReadSub,
              { color: pal.colors.text },
            ]}
          >
            {lastRead.nama || `Doa #${lastRead.id}`}
          </Text>
        </TouchableOpacity>
      )}

      {loading ? (
        <View
          style={[
            styles.center,
            { backgroundColor: pal.colors.bg },
          ]}
        >
          <ActivityIndicator
            size="large"
            color={pal.colors.primary}
          />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text
            style={{
              color: pal.colors.text,
              textAlign: 'center',
              marginBottom: 12,
            }}
          >
            {error}
          </Text>

          <TouchableOpacity
            style={[
              styles.randomBtn,
              {
                backgroundColor: pal.colors.surface,
                borderColor: pal.colors.surfaceBorder,
              },
            ]}
            onPress={fetchList}
          >
            <Text
              style={[
                styles.randomText,
                { color: pal.colors.text },
              ]}
            >
              Coba Lagi
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
       
<FlatList
  data={pagedItems}
  keyExtractor={(item, index) =>
    String(item?.id ?? index)
  }
  renderItem={renderItem}
  contentContainerStyle={styles.list}
  keyboardShouldPersistTaps="handled"
  ListEmptyComponent={
    <Text
      style={[
        styles.emptyText,
        { color: pal.colors.muted },
      ]}
    >
      {query.trim()
        ? 'Doa tidak ditemukan.'
        : 'Belum ada data doa.'}
    </Text>
  }
  ListFooterComponent={
    filtered.length > 0 ? (
      <View style={styles.pagerContainer}>
        <Text
          style={[
            styles.pageInfo,
            { color: pal.colors.muted },
          ]}
        >
          Halaman {safePage + 1} dari {totalPages}
          {' · '}
          {filtered.length} doa
        </Text>

        <View style={styles.pagerRow}>
          <TouchableOpacity
            style={[
              styles.pagerBtn,
              {
                backgroundColor: pal.colors.surface,
                borderColor: pal.colors.surfaceBorder,
              },
              safePage === 0 && styles.pagerBtnDisabled,
            ]}
            onPress={goPrev}
            disabled={safePage === 0}
          >
            <Text
              style={[
                styles.pagerText,
                { color: pal.colors.primary },
              ]}
            >
              Sebelumnya
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.pagerBtn,
              {
                backgroundColor: pal.colors.surface,
                borderColor: pal.colors.surfaceBorder,
              },
              safePage >= totalPages - 1 &&
                styles.pagerBtnDisabled,
            ]}
            onPress={goNext}
            disabled={safePage >= totalPages - 1}
          >
            <Text
              style={[
                styles.pagerText,
                { color: pal.colors.primary },
              ]}
            >
              Berikutnya
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    ) : null
  }
/>

      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    flexShrink: 1,
  },
  randomBtn: {
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  randomText: {
    fontWeight: '700',
  },
  search: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  list: {
    padding: 16,
    paddingTop: 8,
    flexGrow: 1,
  },
  card: {
    padding: 14,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.08)',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemIcon: {
    marginRight: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    minWidth: 0,
  },
  favBadge: {
    marginLeft: 8,
    color: '#dc2626',
    fontSize: 16,
    fontWeight: '800',
  },
  lastReadCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  lastReadTitle: {
    fontWeight: '800',
    color: theme.colors.primary,
    marginBottom: 2,
  },
  lastReadSub: {
    fontSize: 14,
  },
  cardTags: {
    marginTop: 4,
  },
  emptyText: {
    textAlign: 'center',
    padding: 24,
    fontSize: 15,
  },
  cacheBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#fef3c7',
    borderColor: '#fde68a',
    borderWidth: 1,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 4,
  },
  cacheText: {
    color: '#92400e',
    fontWeight: '700',
  },
  pagerContainer: {
    paddingBottom: 16,
  },
  pageInfo: {
    textAlign: 'center',
    marginVertical: 8,
    fontSize: 13,
  },
  pagerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  pagerBtn: {
    flex: 1,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 10,
    marginHorizontal: 4,
  },
  pagerBtnDisabled: {
    opacity: 0.4,
  },
  pagerText: {
    textAlign: 'center',
    fontWeight: '700',
  },
});
