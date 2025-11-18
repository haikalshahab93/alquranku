import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, StyleSheet, TextInput, useWindowDimensions, Platform, Share } from 'react-native';
import { getSuratList, getSuratDetail } from '../../api/quran';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme, GradientCard } from '../../ui';
// Using dynamic import('docx') inside handleDownloadSurah for web only; remove static import to avoid Metro resolution error on native/web bundling

const QARI_LABELS = {
  alafasy: 'Al-Afasy',
  juhany: 'Al-Juhany',
  qasim: 'Al-Qasim',
  sudais: 'As-Sudais',
  dossari: 'Al-Dossari',
};

export default function SurahListScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [surahs, setSurahs] = useState([]);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState({});
  const [details, setDetails] = useState({});
  const [loadingDetail, setLoadingDetail] = useState({});
  const [page, setPage] = useState(0);
  const [lastRead, setLastRead] = useState(null);
  const [activeTab, setActiveTab] = useState('surah');
  const [expandedNames, setExpandedNames] = useState({});
  const [playingNomor, setPlayingNomor] = useState(null);
  const [playingAyahIndex, setPlayingAyahIndex] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [availableQarisMap, setAvailableQarisMap] = useState({});
  const [selectedQariMap, setSelectedQariMap] = useState({});
  const [qariLabelsMap, setQariLabelsMap] = useState({});
  const [qariDropdownOpen, setQariDropdownOpen] = useState({});
  const [preferredQari, setPreferredQari] = useState(null);
  const [fromCacheList, setFromCacheList] = useState(false);
  const player = useAudioPlayer();
  const playerStatus = useAudioPlayerStatus(player);
  useEffect(() => {
    if ('playing' in playerStatus) {
      setIsPlaying(!!playerStatus.playing);
    }
  }, [playerStatus.playing]);
  // Load preferred Qari once
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem('preferred_qari');
        if (saved) setPreferredQari(saved);
      } catch (e) {}
    })();
  }, []);
  // Hitung ukuran halaman dinamis berdasarkan tinggi layar (khusus mobile)
  const { height: windowHeight } = useWindowDimensions();
  const isMobile = Platform.OS === 'android' || Platform.OS === 'ios';
  const headerHeight = 160; // estimasi tinggi header + pencarian
  const footerHeight = 72;  // estimasi tinggi pager
  const itemHeightEstimate = 92; // estimasi tinggi kartu item tanpa expand
  const pageSize = isMobile ? Math.max(5, Math.floor((windowHeight - headerHeight - footerHeight) / itemHeightEstimate)) : 20;

  const fetchList = async () => {
    try {
      setLoading(true);
      const data = await getSuratList();
      setSurahs(data);
      setFromCacheList(!!data?.__fromCache);
      setError(null);
    } catch (e) {
      setError('Gagal memuat daftar surat');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  // Load last read meta for header card
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('last_read');
        if (raw) {
          const obj = JSON.parse(raw);
          setLastRead(obj);
        }
      } catch {}
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
        // Siapkan daftar Qari dan label untuk dropdown yang ringkas
        const ayah0 = data?.ayat?.[0];
        const audioObj0 = ayah0?.audio || {};
        const qKeys = Array.from(new Set(Object.keys(audioObj0).filter(Boolean)));
        setAvailableQarisMap((p) => ({ ...p, [nomor]: qKeys }));
        const labelMap = {};
        qKeys.forEach((k) => {
          const url = audioObj0[k];
          let label = QARI_LABELS[k];
          if (!label && typeof url === 'string') {
            try {
              const m = url.match(/audio-partial\/(.+?)\//);
              if (m && m[1]) {
                label = decodeURIComponent(m[1]).replace(/-/g, ' ');
              }
            } catch (e) {}
          }
          labelMap[k] = label || k;
        });
        setQariLabelsMap((p) => ({ ...p, [nomor]: labelMap }));
        const defQari = (preferredQari && qKeys.includes(preferredQari)) ? preferredQari : (qKeys.includes('alafasy') ? 'alafasy' : (qKeys[0] || null));
        setSelectedQariMap((p) => ({ ...p, [nomor]: defQari }));
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

  const toggleName = (nomor) => {
    setExpandedNames((p) => ({ ...p, [nomor]: !p[nomor] }));
  };

  const getAyahAudioUrl = (nomor, index) => {
    const det = details[nomor];
    const ay = det?.ayat?.[index];
    if (!ay || !ay.audio) return null;
    const audioObj = ay.audio;
    const selected = selectedQariMap[nomor];
    if (selected && typeof audioObj[selected] === 'string' && audioObj[selected]) {
      return audioObj[selected];
    }
    const avail = availableQarisMap[nomor] || [];
    for (const k of avail) {
      if (typeof audioObj[k] === 'string' && audioObj[k]) return audioObj[k];
    }
    for (const v of Object.values(audioObj)) {
      if (typeof v === 'string' && v) return v;
    }
    return null;
  };

  const playSurah = async (nomor) => {
    const url = getAyahAudioUrl(nomor, 0);
    if (!url) return;
    try {
      await player.replace({ uri: url });
      setPlayingNomor(nomor);
      setPlayingAyahIndex(0);
      await player.seekTo(0);
      await player.play();
      setIsPlaying(true);
    } catch (e) {}
  };

  const playPrev = async () => {
    const det = details[playingNomor];
    if (!det?.ayat?.length || playingAyahIndex == null) return;
    const prev = Math.max(0, playingAyahIndex - 1);
    const url = getAyahAudioUrl(playingNomor, prev);
    if (!url) return;
    try {
      await player.replace({ uri: url });
      setPlayingAyahIndex(prev);
      await player.seekTo(0);
      await player.play();
      setIsPlaying(true);
    } catch (e) {}
  };

  const playNext = async () => {
    const det = details[playingNomor];
    if (!det?.ayat?.length || playingAyahIndex == null) return;
    const next = Math.min(det.ayat.length - 1, playingAyahIndex + 1);
    const url = getAyahAudioUrl(playingNomor, next);
    if (!url) return;
    try {
      await player.replace({ uri: url });
      setPlayingAyahIndex(next);
      await player.seekTo(0);
      await player.play();
      setIsPlaying(true);
    } catch (e) {}
  };

  const stopPlayback = async () => {
    try { await player.pause(); } catch (e) {}
    try { await player.seekTo(0); } catch (e) {}
    setPlayingNomor(null);
    setPlayingAyahIndex(null);
    setIsPlaying(false);
  };

  const renderItem = ({ item }) => {
    const isExpanded = !!expanded[item.nomor];
    const isNameExpanded = !!expandedNames[item.nomor];
    const firstAyah = details[item.nomor]?.ayat?.[0];
    const isDetailFromCache = !!details[item.nomor]?.__fromCache;
    // Ambil meta dari item (camelCase v2) atau fallback ke detail.surat dan snake_case lama
    const latin = item.namaLatin || item.nama_latin || details[item.nomor]?.surat?.namaLatin || details[item.nomor]?.surat?.nama_latin || details[item.nomor]?.namaLatin || details[item.nomor]?.nama_latin || '';
    const jumlahAyat = item.jumlahAyat || item.jumlah_ayat || details[item.nomor]?.surat?.jumlahAyat || details[item.nomor]?.surat?.jumlah_ayat || details[item.nomor]?.jumlahAyat || details[item.nomor]?.jumlah_ayat || '';
    const tempatTurun = item.tempatTurun || item.tempat_turun || details[item.nomor]?.surat?.tempatTurun || details[item.nomor]?.surat?.tempat_turun || details[item.nomor]?.tempatTurun || details[item.nomor]?.tempat_turun || '';
    const rawDesc = details[item.nomor]?.surat?.deskripsi || details[item.nomor]?.deskripsi || details[item.nomor]?.description || '';
    const description = stripHtml(rawDesc);

    const handleDownloadSurah = async (nomor) => {
      try {
        const det = details[nomor] || await getSuratDetail(nomor);
        const name = det?.namaLatin || det?.nama_latin || `Surah ${nomor}`;
        const safeName = String(name).replace(/[^a-zA-Z0-9\- _()]/g, '');
        const fileNameBase = `${safeName}-${nomor}`;
        const headerTitle = `${name} (${det?.nama ?? ''})`;
        const headerMeta = `${det?.arti ?? ''} • ${(det?.jumlahAyat ?? det?.jumlah_ayat) ?? ''} ayat • Tempat turun: ${(det?.tempatTurun ?? det?.tempat_turun) ?? ''}`;
    
        if (Platform.OS === 'web') {
          try {
            const { Document, Packer, Paragraph, HeadingLevel, TextRun } = await import('docx');
             const doc = new Document({
               sections: [
                 {
                   properties: {},
                   children: [
                     new Paragraph({ text: headerTitle, heading: HeadingLevel.TITLE }),
                     new Paragraph({ text: headerMeta }),
                     ...Array.isArray(det?.ayat)
                       ? det.ayat.map((a, idx) => {
                           const n = a?.nomorAyat != null ? a.nomorAyat : (a?.nomor != null ? a.nomor : idx + 1);
                           const arab = a?.teksArab ?? a?.teks_arab ?? '';
                           const latinT = a?.teksLatin ?? a?.teks_latin ?? '';
                           const indo = a?.teksTerjemahan ?? a?.teks_terjemahan ?? a?.teksIndonesia ?? '';
                           return [
                             new Paragraph({ text: `Ayat ${n}`, heading: HeadingLevel.HEADING_2 }),
                             new Paragraph({ children: [new TextRun({ text: arab })] }),
                             new Paragraph({ children: [new TextRun({ text: latinT })] }),
                             new Paragraph({ children: [new TextRun({ text: indo })] }),
                             new Paragraph({ text: '' }),
                           ];
                         }).flat()
                       : [],
                   ],
                 },
               ],
             });
             const blob = await Packer.toBlob(doc);
             const url = URL.createObjectURL(blob);
             const a = document.createElement('a');
             a.href = url;
             a.download = `${fileNameBase}.docx`;
             document.body.appendChild(a);
             a.click();
             document.body.removeChild(a);
             URL.revokeObjectURL(url);
           } catch (err) {
             // Fallback jika import docx gagal: unduh sebagai .txt
             const body = Array.isArray(det?.ayat)
               ? det.ayat
                   .map((a, idx) => {
                     const n = a?.nomorAyat != null ? a.nomorAyat : (a?.nomor != null ? a.nomor : idx + 1);
                     const arab = a?.teksArab ?? a?.teks_arab ?? '';
                     const latinT = a?.teksLatin ?? a?.teks_latin ?? '';
                     const indo = a?.teksTerjemahan ?? a?.teks_terjemahan ?? a?.teksIndonesia ?? '';
                     return `\n\nAyat ${n}:\n${arab}\n${latinT}\n${indo}`;
                   })
                   .join('')
               : '';
             const text = `${headerTitle}\n${headerMeta}\n${body}\n`;
             const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
             const url = URL.createObjectURL(blob);
             const a = document.createElement('a');
             a.href = url;
             a.download = `${fileNameBase}.txt`;
             document.body.appendChild(a);
             a.click();
             document.body.removeChild(a);
             URL.revokeObjectURL(url);
           }
         } else {
           // Fallback mobile: bagikan teks lengkap
           const body = Array.isArray(det?.ayat)
             ? det.ayat
                 .map((a, idx) => {
                   const n = a?.nomorAyat != null ? a.nomorAyat : (a?.nomor != null ? a.nomor : idx + 1);
                   const arab = a?.teksArab ?? a?.teks_arab ?? '';
                   const latinT = a?.teksLatin ?? a?.teks_latin ?? '';
                   const indo = a?.teksTerjemahan ?? a?.teks_terjemahan ?? a?.teksIndonesia ?? '';
                   return `\n\nAyat ${n}:\n${arab}\n${latinT}\n${indo}`;
                 })
                 .join('')
             : '';
           const text = `${headerTitle}\n${headerMeta}\n${body}\n`;
           await Share.share({ title: `${fileNameBase}.docx`, message: text });
         }
      } catch (e) {
        console.warn('Gagal mengunduh/berbagi surat:', e?.message);
      }
    };

    return (
      <TouchableOpacity style={styles.item} onPress={() => navigation.navigate('SurahDetail', { nomor: item.nomor, nama_latin: item.namaLatin || item.nama_latin, namaLatin: item.namaLatin || item.nama_latin })}>
        <View style={styles.itemHeader}>
          <Text style={styles.itemNumber}>{item.nomor}</Text>
          <Text style={styles.itemLatin}>{item.namaLatin || item.nama_latin}</Text>
          <TouchableOpacity style={styles.infoToggle} onPress={() => toggleName(item.nomor)}>
            <Text style={styles.infoToggleText}>{isNameExpanded ? 'Tutup nama' : 'Lihat nama'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.infoToggle} onPress={() => toggleExpand(item.nomor)}>
            <Text style={styles.infoToggleText}>{isExpanded ? 'Tutup ringkas' : 'Lihat ringkas'}</Text>
          </TouchableOpacity>
        </View>
        {fromCacheList ? (
          <View style={styles.cacheBadge}><Text style={styles.cacheText}>Data dari Cache</Text></View>
        ) : null}
        {isNameExpanded && (
          <View style={styles.nameBox}>
            <Text style={styles.nameLabel}>Nama Arab</Text>
            <Text style={styles.nameArabic}>{item.nama}</Text>
            <Text style={styles.nameLabel}>Nama Latin</Text>
            <Text style={styles.nameLatin}>{item.namaLatin || item.nama_latin}</Text>
          </View>
        )}
        <Text style={styles.itemMeta}>{item.arti} • {(item.jumlahAyat || item.jumlah_ayat)} ayat • {(item.tempatTurun || item.tempat_turun)}</Text>
        {isExpanded && (
          loadingDetail[item.nomor] ? (
            <View style={styles.expandLoading}><ActivityIndicator size="small" /></View>
          ) : (
            <View style={styles.expandBox}>
              <Text style={styles.expandTitle}>Ringkas Surat</Text>
              {!!isDetailFromCache && (
                <View style={styles.cacheBadge}><Text style={styles.cacheText}>Ringkas dari Cache</Text></View>
              )}
              {!!description && (
                <View style={styles.expandDescBox}>
                  <Text style={styles.expandDescTitle}>Deskripsi</Text>
                  <Text style={styles.expandDesc}>{description}</Text>
                </View>
              )}
              <View style={styles.divider} />
              <View style={styles.previewHeaderRow}>
                <Text style={styles.expandTitle}>Preview Ayat 1</Text>
                <TouchableOpacity style={[styles.actionBtn, styles.downloadBtn]} onPress={() => handleDownloadSurah(item.nomor)}>
                  <Text style={styles.actionText}>Download Surat (Word)</Text>
                </TouchableOpacity>
              </View>
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
                <TouchableOpacity style={[styles.actionBtn, styles.tafsirBtn]} onPress={() => navigation.navigate('Tafsir', { nomor: item.nomor })}>
                  <Text style={styles.actionText}>Lihat Tafsir</Text>
                </TouchableOpacity>
              </View>

            </View>
          )
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }
  if (error) {
    return (
      <View style={styles.center}>
        <Text>{error}</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={pagedSurahs}
        keyExtractor={(item) => String(item.nomor)}
        contentContainerStyle={styles.list}
        ListHeaderComponent={(
          <View style={{ marginBottom: 12 }}>
            {!!lastRead && (
              <GradientCard
                title={lastRead?.namaLatin ? `Last Read\n${lastRead?.namaLatin}` : 'Last Read'}
                desc={lastRead?.lastAyah ? `Ayah No. ${lastRead.lastAyah}` : undefined}
                style={{}}
                showQuran
                onPress={() => navigation.navigate('SurahDetail', {
                  nomor: lastRead?.nomor,
                  nama_latin: lastRead?.namaLatin,
                  namaLatin: lastRead?.namaLatin,
                  lastAyah: lastRead?.lastAyah || 1,
                })}
              />
            )}

            <View style={styles.tabsRow}>
              <TouchableOpacity style={[styles.tabBtn, activeTab === 'surah' && styles.tabBtnActive]} onPress={() => setActiveTab('surah')}>
                <Text style={[styles.tabText, activeTab === 'surah' && styles.tabTextActive]}>Surah</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.tabBtn} onPress={() => {}}>
                <Text style={styles.tabText}>Para</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.tabBtn} onPress={() => {}}>
                <Text style={styles.tabText}>Page</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.tabBtn} onPress={() => navigation.navigate('QuranBookmarks')}>
                <Text style={styles.tabText}>Bookmark</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              placeholder="Cari nomor/nama/arti/tempat turun"
              placeholderTextColor="#333"
              value={query}
              onChangeText={setQuery}
              style={styles.searchBox}
            />
            <View style={styles.refreshRow}>
              <TouchableOpacity style={[styles.pagerBtn]} onPress={fetchList}>
                <Text style={styles.pagerText}>Refresh</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        renderItem={renderItem}
        ListFooterComponent={(
          <View>
            <View style={styles.pagerRow}>
              <TouchableOpacity style={[styles.pagerBtn, page <= 0 && styles.pagerBtnDisabled]} onPress={goPrev} disabled={page <= 0}>
                <Text style={styles.pagerText}>Sebelumnya</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.pagerBtn, page >= totalPages - 1 && styles.pagerBtnDisabled]} onPress={goNext} disabled={page >= totalPages - 1}>
                <Text style={styles.pagerText}>Berikutnya</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.pageInfoRow}><Text style={styles.pageInfo}>Halaman {safePage + 1} dari {totalPages}</Text></View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16 },
  searchBox: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: '#fff', color: '#333', fontWeight: '600', fontSize: 16 },
  item: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12, elevation: 2, borderWidth: 1, borderColor: '#e5e7eb', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3 },
  itemHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  itemNumber: { fontWeight: 'bold', color: theme.colors.primaryDark, width: 32, textAlign: 'center', backgroundColor: '#ede9fe', borderRadius: 16, borderWidth: 1, borderColor: theme.colors.primaryLight },
  itemArabic: { fontSize: 18, fontWeight: '700', textAlign: 'right', color: theme.colors.primary, fontFamily: 'NotoNaskhArabic' },
  itemMeta: { marginTop: 4, color: '#666' },
  infoToggle: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f1f5f9', marginLeft: 8 },
  infoToggleText: { color: '#0f172a', fontWeight: '600' },
  expandLoading: { marginTop: 8 },
  expandBox: { marginTop: 10, backgroundColor: '#f9fafb', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#e5e7eb' },
  expandTitle: { fontWeight: '700', marginBottom: 6, color: '#111' },
  expandMeta: { color: '#374151', marginBottom: 2 },
  expandDescBox: { marginTop: 6, backgroundColor: '#eef2ff', padding: 8, borderRadius: 8 },
  expandDescTitle: { fontWeight: '700', color: '#1f2937', marginBottom: 4 },
  expandDesc: { color: '#1f2937' },
  divider: { height: 1, backgroundColor: '#e5e7eb', marginVertical: 10 },
  expandAyatArabic: { fontSize: 20, textAlign: 'right', lineHeight: 28, color: '#111', fontFamily: 'NotoNaskhArabic' },
  expandAyatLatin: { color: '#444', marginTop: 6 },
  expandAyatTrans: { color: '#222', marginTop: 4 },
  expandEmpty: { color: '#666', fontStyle: 'italic' },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
  actionBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, marginRight: 8, marginBottom: 8, backgroundColor: '#374151' },
  detailBtn: { backgroundColor: '#6366f1' },
  tafsirBtn: { backgroundColor: '#10b981' },
  downloadBtn: { backgroundColor: theme.colors.primaryDark },
  actionText: { color: '#fff', fontWeight: '600' },
  previewHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pagerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  pagerBtn: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', marginHorizontal: 8 },
  pagerBtnDisabled: { opacity: 0.5 },
  pagerText: { color: theme.colors.primary, fontWeight: '700' },
  pageInfoRow: { marginTop: 8, alignItems: 'center' },
  pageInfo: { color: '#666', textAlign: 'center', fontWeight: '600' },
  footerRow: { marginTop: 12, alignItems: 'center' },
  footerText: { color: '#64748b', fontSize: 12 },
  nameBox: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 8, marginTop: 8 },
  nameLabel: { fontSize: 12, color: '#64748b', fontWeight: '700' },
  nameArabic: { fontSize: 18, fontWeight: '700', textAlign: 'right', color: '#111', fontFamily: 'NotoNaskhArabic' },
  cacheBadge: { alignSelf: 'flex-start', backgroundColor: '#fef3c7', borderColor: '#fde68a', borderWidth: 1, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8, marginTop: 4 },
  cacheText: { color: '#92400e', fontWeight: '700' },
  refreshRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginHorizontal: 16 },
  // Hapus style terkait dropdown Qari & kontrol audio karena tidak digunakan di ListScreen
  // controlsRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
  // ctrlBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, marginRight: 8, marginBottom: 8, backgroundColor: '#374151' },
  // playAllBtn: { backgroundColor: '#0ea5e9' },
  // stopBtn: { backgroundColor: '#ef4444' },
  // ctrlText: { color: '#fff', fontWeight: '600' },
  // ctrlTextDisabled: { color: '#e5e7eb' },
  // qariSection: { marginTop: 10 },
  // qariDropdownToggle: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', alignSelf: 'flex-start', backgroundColor: '#f1f5f9' },
  // qariDropdownText: { color: '#0f766e', fontWeight: '600' },
  // qariRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  // qariChip: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 16, borderWidth: 1, borderColor: '#ddd', marginRight: 8, marginBottom: 8 },
  // qariChipActive: { backgroundColor: '#0ea5e9', borderColor: '#0ea5e9' },
  // qariChipText: { color: '#333' },
  // qariChipTextActive: { color: '#fff', fontWeight: '600' },
  tabsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, paddingHorizontal: 4 },
  tabBtn: { paddingVertical: 8, paddingHorizontal: 10, borderBottomWidth: 2, borderColor: 'transparent' },
  tabBtnActive: { borderColor: theme.colors.primary },
  tabText: { color: '#64748b', fontWeight: '700' },
  tabTextActive: { color: theme.colors.primaryDark },
});