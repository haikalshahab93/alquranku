import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, StyleSheet, TextInput, useWindowDimensions, Platform } from 'react-native';
import { getSuratList, getSuratDetail } from '../api/equran';

export default function SurahListScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [surahs, setSurahs] = useState([]);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState({});
  const [details, setDetails] = useState({});
  const [loadingDetail, setLoadingDetail] = useState({});
  const [page, setPage] = useState(0);
  // Hitung ukuran halaman dinamis berdasarkan tinggi layar (khusus mobile)
  const { height: windowHeight } = useWindowDimensions();
  const isMobile = Platform.OS === 'android' || Platform.OS === 'ios';
  const headerHeight = 160; // estimasi tinggi header + pencarian
  const footerHeight = 72;  // estimasi tinggi pager
  const itemHeightEstimate = 92; // estimasi tinggi kartu item tanpa expand
  const pageSize = isMobile ? Math.max(5, Math.floor((windowHeight - headerHeight - footerHeight) / itemHeightEstimate)) : 20;

  useEffect(() => {
    (async () => {
      try {
        const data = await getSuratList();
        setSurahs(data);
      } catch (e) {
        setError('Gagal memuat daftar surat');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filteredSurahs = surahs.filter((s) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      String(s.nomor).includes(q) ||
      ((s.namaLatin || s.nama_latin || '').toLowerCase().includes(q)) ||
      ((s.nama || '').toLowerCase().includes(q)) ||
      ((s.arti || '').toLowerCase().includes(q)) ||
      ((s.tempatTurun || s.tempat_turun || '').toLowerCase().includes(q))
    );
  });

  useEffect(() => {
    // Reset ke halaman pertama saat query berubah
    setPage(0);
  }, [query]);

  const totalPages = Math.max(1, Math.ceil(filteredSurahs.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const start = safePage * pageSize;
  const end = start + pageSize;
  const pagedSurahs = filteredSurahs.slice(start, end);

  const goPrev = () => setPage((p) => Math.max(0, p - 1));
  const goNext = () => setPage((p) => Math.min(totalPages - 1, p + 1));

  const toggleExpand = async (nomor) => {
    setExpanded((prev) => ({ ...prev, [nomor]: !prev[nomor] }));
    const willExpand = !expanded[nomor];
    if (willExpand && !details[nomor]) {
      try {
        setLoadingDetail((p) => ({ ...p, [nomor]: true }));
        const data = await getSuratDetail(nomor);
        setDetails((p) => ({ ...p, [nomor]: data }));
      } catch (e) {
        setDetails((p) => ({ ...p, [nomor]: { error: 'Gagal memuat ringkasan surat' } }));
      } finally {
        setLoadingDetail((p) => ({ ...p, [nomor]: false }));
      }
    }
  };

  // Utility: strip HTML tags & decode some common entities from description
  const stripHtml = (html) => {
    if (!html || typeof html !== 'string') return '';
    const text = html
      .replace(/<[^>]+>/g, ' ') // remove tags
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');
    return text.replace(/\s+/g, ' ').trim();
  };

  const renderItem = ({ item }) => {
    const isExpanded = !!expanded[item.nomor];
    const firstAyah = details[item.nomor]?.ayat?.[0];
    // Ambil meta dari item (camelCase v2) atau fallback ke detail.surat dan snake_case lama
    const latin = item.namaLatin || item.nama_latin || details[item.nomor]?.surat?.namaLatin || details[item.nomor]?.surat?.nama_latin || details[item.nomor]?.namaLatin || details[item.nomor]?.nama_latin || '';
    const jumlahAyat = item.jumlahAyat || item.jumlah_ayat || details[item.nomor]?.surat?.jumlahAyat || details[item.nomor]?.surat?.jumlah_ayat || details[item.nomor]?.jumlahAyat || details[item.nomor]?.jumlah_ayat || '';
    const tempatTurun = item.tempatTurun || item.tempat_turun || details[item.nomor]?.surat?.tempatTurun || details[item.nomor]?.surat?.tempat_turun || details[item.nomor]?.tempatTurun || details[item.nomor]?.tempat_turun || '';
    const rawDesc = details[item.nomor]?.surat?.deskripsi || details[item.nomor]?.deskripsi || details[item.nomor]?.description || '';
    const description = stripHtml(rawDesc);
    return (
      <View style={styles.item}>
        <View style={styles.itemHeader}>
          <Text style={styles.itemNumber}>{item.nomor}</Text>
          <Text style={styles.itemLatin}>{item.namaLatin || item.nama_latin}</Text>
          <Text style={styles.itemArabic}>{item.nama}</Text>
          <TouchableOpacity style={styles.infoToggle} onPress={() => toggleExpand(item.nomor)}>
            <Text style={styles.infoToggleText}>{isExpanded ? 'Tutup ringkas' : 'Lihat ringkas'}</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.itemMeta}>{item.arti} • {(item.jumlahAyat || item.jumlah_ayat)} ayat • {(item.tempatTurun || item.tempat_turun)}</Text>
        {isExpanded && (
          loadingDetail[item.nomor] ? (
            <View style={styles.expandLoading}><ActivityIndicator size="small" /></View>
          ) : (
            <View style={styles.expandBox}>
              <Text style={styles.expandTitle}>Ringkas Surat</Text>
              <Text style={styles.expandMeta}>Nama Latin: {latin || '-'}</Text>
              <Text style={styles.expandMeta}>Jumlah Ayat: {jumlahAyat || '-'}</Text>
              <Text style={styles.expandMeta}>Tempat Turun: {tempatTurun || '-'}</Text>
              {!!description && (
                <View style={styles.expandDescBox}>
                  <Text style={styles.expandDescTitle}>Deskripsi</Text>
                  <Text style={styles.expandDesc}>{description}</Text>
                </View>
              )}
              <View style={styles.divider} />
              <Text style={styles.expandTitle}>Preview Ayat 1</Text>
              {firstAyah ? (
                <>
                  <Text style={styles.expandAyatArabic}>{firstAyah.teksArab || firstAyah.teks_arab}</Text>
                  <Text style={styles.expandAyatLatin}>{firstAyah.teksLatin || firstAyah.teks_latin}</Text>
                  <Text style={styles.expandAyatTrans} numberOfLines={3}>{firstAyah.teksTerjemahan || firstAyah.teks_terjemahan}</Text>
                </>
              ) : (
                <Text style={styles.expandEmpty}>{details[item.nomor]?.error || 'Tidak ada preview tersedia.'}</Text>
              )}
              <View style={styles.actionsRow}>
                <TouchableOpacity style={[styles.actionBtn, styles.detailBtn]} onPress={() => navigation.navigate('SurahDetail', { nomor: item.nomor, nama_latin: item.namaLatin || item.nama_latin, namaLatin: item.namaLatin || item.nama_latin })}>
                  <Text style={styles.actionText}>Buka Detail</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, styles.tafsirBtn]} onPress={() => navigation.navigate('Tafsir', { nomor: item.nomor })}>
                  <Text style={styles.actionText}>Lihat Tafsir</Text>
                </TouchableOpacity>
              </View>
            </View>
          )
        )}
      </View>
    );
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" /></View>;
  if (error) return <View style={styles.center}><Text>{error}</Text></View>;

  return (
    <FlatList
      data={pagedSurahs}
      keyExtractor={(item) => String(item.nomor)}
      renderItem={renderItem}
      contentContainerStyle={styles.list}
      ListHeaderComponent={() => (
        <View style={{ marginBottom: 12 }}>
          <TextInput
            style={styles.searchBox}
            placeholder="Cari surat, arti, nomor, atau tempat turun..."
            value={query}
            onChangeText={setQuery}
            clearButtonMode="while-editing"
          />
          <View style={styles.pageInfoRow}>
            <Text style={styles.pageInfo}>Menampilkan {filteredSurahs.length === 0 ? 0 : start + 1}-{Math.min(end, filteredSurahs.length)} dari {filteredSurahs.length} surat</Text>
          </View>
        </View>
      )}
      ListFooterComponent={() => (
        <View style={styles.pagerRow}>
          <TouchableOpacity style={[styles.pagerBtn, page === 0 && styles.pagerBtnDisabled]} onPress={goPrev} disabled={page === 0}>
            <Text style={styles.pagerText}>Sebelumnya</Text>
          </TouchableOpacity>
          <Text style={styles.pageInfo}>Halaman {safePage + 1} / {totalPages}</Text>
          <TouchableOpacity style={[styles.pagerBtn, page >= totalPages - 1 && styles.pagerBtnDisabled]} onPress={goNext} disabled={page >= totalPages - 1}>
            <Text style={styles.pagerText}>Selanjutnya</Text>
          </TouchableOpacity>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16 },
  searchBox: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: '#fff' },
  item: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 12, elevation: 1 },
  itemHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  itemNumber: { fontWeight: 'bold', color: '#555', width: 32 },
  itemLatin: { fontSize: 16, fontWeight: '600', flex: 1 },
  itemArabic: { fontSize: 18, fontWeight: '700' },
  itemMeta: { marginTop: 4, color: '#666' },
  infoToggle: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 16, borderWidth: 1, borderColor: '#ddd', marginLeft: 8 },
  infoToggleText: { color: '#333', fontWeight: '600' },
  expandLoading: { marginTop: 8 },
  expandBox: { marginTop: 10, backgroundColor: '#f9fafb', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#eee' },
  expandTitle: { fontWeight: '700', marginBottom: 6 },
  expandMeta: { color: '#374151', marginBottom: 2 },
  expandDescBox: { marginTop: 6, backgroundColor: '#eef2ff', padding: 8, borderRadius: 8 },
  expandDescTitle: { fontWeight: '700', color: '#1f2937', marginBottom: 4 },
  expandDesc: { color: '#1f2937' },
  divider: { height: 1, backgroundColor: '#e5e7eb', marginVertical: 10 },
  expandAyatArabic: { fontSize: 20, textAlign: 'right', lineHeight: 28 },
  expandAyatLatin: { color: '#444', marginTop: 6 },
  expandAyatTrans: { color: '#222', marginTop: 4 },
  expandEmpty: { color: '#666', fontStyle: 'italic' },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
  actionBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, marginRight: 8, marginBottom: 8, backgroundColor: '#374151' },
  detailBtn: { backgroundColor: '#6366f1' },
  tafsirBtn: { backgroundColor: '#10b981' },
  actionText: { color: '#fff', fontWeight: '600' },
  pagerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  pagerBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#374151' },
  pagerBtnDisabled: { backgroundColor: '#9ca3af' },
  pagerText: { color: '#fff', fontWeight: '600' },
  pageInfoRow: { marginTop: 8 },
  pageInfo: { color: '#666' },
});