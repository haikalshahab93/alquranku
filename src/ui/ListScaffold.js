// Kerangka (scaffold) layar list yang REUSABLE.
// Satu kerangka dipakai semua layar list — hanya kontennya yang berbeda:
//
//   import { ListTitleRow, ListSearch, ListResultInfo, ListStatus,
//            ListPager, usePagedList } from '../../ui/ListScaffold';
//
//   const { pageData, start, totalPages, page, goPrev, goNext, canPrev, canNext } =
//     usePagedList(filtered, pageSize, query);
//
//   <ListScreen> (atau bungkus sendiri dengan SafeAreaView pad palette bg)
//     <ListTitleRow title="Judul" right={<MyAction/>} />
//     <ListSearch value={query} onChangeText={setQuery} placeholder="Cari..." />
//     <ListResultInfo>Hasil: {filtered.length}</ListResultInfo>
//     <ListStatus loading={loading} error={error} empty={!filtered.length}>...list...</ListStatus>
//     <ListPager
//       onPrev={goPrev} onNext={goNext}
//       canPrev={canPrev} canNext={canNext}
//       label={`Halaman ${page + 1} / ${totalPages}`}
//     />
//
// Semua warna otomatis ikut dark mode (pakai useTheme di dalamnya).

import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, FlatList, ActivityIndicator, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useTheme } from './index';

/* ------------------------------------------------------------------ */
/* Hook paging: satu sumber logika halaman untuk SEMUA layar list      */
/* ------------------------------------------------------------------ */
export function usePagedList(data, pageSize, resetKeys = '') {
  const [page, setPage] = useState(0);

  const totalPages = Math.max(1, Math.ceil((data?.length || 0) / pageSize));
  const safePage = Math.min(Math.max(0, page), totalPages - 1);
  const start = safePage * pageSize;
  const pageData = (data || []).slice(start, start + pageSize);

  // Reset ke halaman pertama saat kriteria berubah (mis. keyword pencarian)
  useEffect(() => { setPage(0); }, [resetKeys]);

  const goPrev = () => setPage(Math.max(0, safePage - 1));
  const goNext = () => setPage(Math.min(totalPages - 1, safePage + 1));
  const goTo = (p) => setPage(Math.min(Math.max(0, p), totalPages - 1));

  return {
    page: safePage,
    totalPages,
    start,
    end: start + pageData.length,
    pageData,
    goPrev,
    goNext,
    goTo,
    canPrev: safePage > 0,
    canNext: safePage < totalPages - 1,
  };
}

/* -------------------------------
/* Judul + slot aksi kanan         */
/* ------------------------------- */
export function ListTitleRow({ title, right, style }) {
  const pal = useTheme();
  return (
    <View style={[listStyles.headerRow, style]}>
      <Text style={[listStyles.title, { color: pal.colors.text }]}>{title}</Text>
      {right ? <View style={listStyles.actionsRow}>{right}</View> : null}
    </View>
  );
}

/* Kolom pencarian (opsional) */
export function ListSearch({ value, onChangeText, placeholder, style }) {
  const pal = useTheme();
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={pal.colors.muted}
      style={[listStyles.search, { backgroundColor: pal.colors.surface, borderColor: pal.colors.surfaceBorder, color: pal.colors.text }, style]}
    />
  );
}

/* Info hasil di bawah pencarian (opsional) */
export function ListResultInfo({ children, style }) {
  const pal = useTheme();
  return <Text style={[listStyles.resultInfo, { color: pal.colors.muted }, style]}>{children}</Text>;
}

/* -------------------------------
/* Status: loading / error / empty */
/* ------------------------------- */
export function ListStatus({ loading, error, empty, emptyText = 'Tidak ada hasil.', children }) {
  const pal = useTheme();
  if (loading) {
    return (
      <View style={listStyles.center}>
        <ActivityIndicator size="large" color={pal.colors.primary} />
      </View>
    );
  }
  if (error) {
    return (
      <View style={listStyles.center}>
        <Text style={[listStyles.statusText, { color: pal.colors.muted }]}>{error}</Text>
      </View>
    );
  }
  if (empty) {
    return (
      <View style={listStyles.center}>
        <Text style={[listStyles.statusText, { color: pal.colors.muted }]}>{emptyText}</Text>
      </View>
    );
  }
  return children;
}

/* -------------------------------
/* Pager (footer halaman)          */
/* ------------------------------- */
export function ListPager({
  onPrev, onNext,
  canPrev = false, canNext = false,
  label = '',
  style,
}) {
  const pal = useTheme();
  return (
    <View style={[listStyles.pager, { backgroundColor: pal.colors.bg, borderColor: pal.colors.surfaceBorder }, style]}>
      <TouchableOpacity
        onPress={onPrev}
        disabled={!canPrev}
        style={[listStyles.pagerBtn, { backgroundColor: pal.colors.surface, borderColor: pal.colors.surfaceBorder }, !canPrev && listStyles.pagerBtnDisabled]}
        accessibilityRole="button"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={[listStyles.pagerBtnText, { color: canPrev ? pal.colors.primary : pal.colors.muted }]}>Sebelumnya</Text>
      </TouchableOpacity>
      {label ? <Text style={[listStyles.pagerText, { color: pal.colors.text }]}>{label}</Text> : null}
      <TouchableOpacity
        onPress={onNext}
        disabled={!canNext}
        style={[listStyles.pagerBtn, { backgroundColor: pal.colors.surface, borderColor: pal.colors.surfaceBorder }, !canNext && listStyles.pagerBtnDisabled]}
        accessibilityRole="button"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={[listStyles.pagerBtnText, { color: canNext ? pal.colors.primary : pal.colors.muted }]}>Sesudahnya</Text>
      </TouchableOpacity>
    </View>
  );
}

/* Bungkus layar: SafeAreaView dgn latar sesuai mode gelap */
export function ListScreen({ children, style }) {
  const pal = useTheme();
  return <SafeAreaView style={[{ flex: 1, backgroundColor: pal.colors.bg }, style]}>{children}</SafeAreaView>;
}

/* FlatList pembungkus lazim: container padding + kosong otomatis */
export function ListFlatList({ data, renderItem, keyExtractor, numColumns, columnWrapperStyle, contentContainerStyle, emptyText }) {
  return (
    <FlatList
      data={data}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      numColumns={numColumns}
      columnWrapperStyle={columnWrapperStyle}
      key={numColumns || 1}
      ListEmptyComponent={
        <View style={listStyles.center}>
          <Text style={listStyles.statusText}>{emptyText || 'Tidak ada hasil.'}</Text>
        </View>
      }
      contentContainerStyle={[listStyles.list, contentContainerStyle]}
    />
  );
}

const listStyles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 12 },
  title: { fontSize: 20, fontWeight: '800' },
  actionsRow: { flexDirection: 'row', alignItems: 'center' },
  search: { margin: 16, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  resultInfo: { paddingHorizontal: 16, marginBottom: 4 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  statusText: { textAlign: 'center', paddingHorizontal: 16, marginHorizontal: 12 },
  list: { padding: 16 },
  // Pager ( Tata letak sama dengan layar Surah: tombol pipih ungu + info tengah )
  pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1 },
  pagerBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, cursor: 'pointer' },
  pagerBtnDisabled: { opacity: 0.6 },
  pagerBtnText: { fontWeight: '700' },
  pagerText: { fontWeight: '700' },
});
