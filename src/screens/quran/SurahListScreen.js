import React, { useEffect, useState, useMemo, useRef } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, StyleSheet, TextInput, useWindowDimensions, Platform, Share, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getSuratList, getSuratDetail, preloadAllSurahData, getOfflineReadyCount, isOnline } from '../../api/quran';
import { listOfflineAudio } from '../../api/offlineAudio';
import { getPreferredKaraokeReciter } from '../../api/quranAudio';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme, GradientCard, getPalette } from '../../ui';
import { useAppearance } from '../../api/appearance';
import { surahsInJuz, juzStartLabel, juzsOfSurah, globalAyahStart, juzFromGlobalAyah, JUZ_STARTS } from '../../api/juz';
import { getPagePairs, TOTAL_PAGES } from '../../api/mushafPages';
// Using dynamic import('docx') inside handleDownloadSurah for web only; remove static import to avoid Metro resolution error on native/web bundling

const QARI_LABELS = {
  alafasy: 'Al-Afasy',
  juhany: 'Al-Juhany',
  qasim: 'Al-Qasim',
  sudais: 'As-Sudais',
  dossari: 'Al-Dossari',
};

function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0 MB';
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
}

export default function SurahListScreen({ navigation, route }) {
  // Palet aktif (dark mode) — dari pengaturan tampilan terpusat
  const { darkMode } = useAppearance();
  const pal = getPalette(darkMode);
  const styles = makeStyles(pal);
  const [loading, setLoading] = useState(true);
  const [surahs, setSurahs] = useState([]);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState({});
  const [details, setDetails] = useState({});
  const [loadingDetail, setLoadingDetail] = useState({});
  const [page, setPage] = useState(0);
  const [lastRead, setLastRead] = useState(null);
  const [activeTab, setActiveTab] = useState(
    route?.params?.initialTab === 'para' || route?.params?.initialTab === 'page' ? route.params.initialTab : 'surah'
  );
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
  // === Siapkan Offline: unduh semua surah+tafsir ke cache lokal ===
  const [offlineReady, setOfflineReady] = useState(0);
  const [offlineDownloading, setOfflineDownloading] = useState(false);
  const [offlineProgress, setOfflineProgress] = useState(0); // 0..1
  // === Ringkasan audio offline (MP3 per surah untuk karaoke) ===
  const [audioStats, setAudioStats] = useState({ count: 0, totalBytes: 0 });
  const [offlineDone, setOfflineDone] = useState(false);
  const [offlineErr, setOfflineErr] = useState(null);
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
  }, []);  // Muat jumlah surah yang siap offline (manifest) saat screen dibuka
  useEffect(() => {
    (async () => {
      try {
        const n = await getOfflineReadyCount();
        setOfflineReady(n);
      } catch {}
    })();
  }, []);

  // Muat ringkasan audio offline saat screen dibuka
  useEffect(() => { refreshAudioStats(); }, []);

  // === Siapkan Offline: unduh semua 114 surah + tafsir ke cache lokal ===
  const refreshAudioStats = async () => {
    try {
      const list = await listOfflineAudio();
      setAudioStats({ count: list.length, totalBytes: list.reduce((s, m) => s + (m.size || 0), 0) });
    } catch {}
  };

  const startOfflineDownload = async () => {
    if (offlineDownloading) return;
    setOfflineDownloading(true);
    setOfflineDone(false);
    setOfflineErr(null);
    setOfflineProgress(0);
    try {
      const ok = await preloadAllSurahData((done, total) => {
        setOfflineProgress(total > 0 ? done / total : 0);
        setOfflineReady(done);
      });
      if (ok) {
        setOfflineDone(true);
        const n = await getOfflineReadyCount();
        setOfflineReady(n);
      } else {
        setOfflineErr('Gagal menyiapkan data offline. Periksa koneksi lalu coba lagi.');
      }
    } catch (e) {
      setOfflineErr('Gagal menyiapkan data offline. Periksa koneksi lalu coba lagi.');
    } finally {
      setOfflineDownloading(false);
    }
  };
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

  // Kartu Juz (Para) 1-30: kelompokan surah per juz untuk tab Para
  const juzCards = useMemo(() => {
    const metaOf = (nomor) => surahs.find((x) => Number(x.nomor) === Number(nomor));
    const nameOf = (nomor) => {
      const s = metaOf(nomor);
      return s ? (s.namaLatin || s.nama_latin || `Surah ${nomor}`) : `Surah ${nomor}`;
    };
    const ayatOf = (nomor) => {
      const s = metaOf(nomor);
      return s ? Number(s.jumlahAyat || s.jumlah_ayat || 0) : 0;
    };
    return Array.from({ length: 30 }, (_, i) => {
      const juz = i + 1;
      const entries = surahsInJuz(juz).map((it) => ({
        ...it,
        name: ayatOf(it.surah) ? nameOf(it.surah) : `Surah ${it.surah}`,
      }));
      return { juz, startLabel: juzStartLabel(juz), entries };
    });
  }, [surahs]);

  // Kartu halaman mushaf (tab Page): 604 halaman standar Madani
  const pageCards = useMemo(() => {
    return Array.from({ length: TOTAL_PAGES }, (_, i) => {
      const page = i + 1;
      const pairs = getPagePairs(page);
      const first = pairs[0] || [1, 1];
      // Juz dihitung dari ayat pertama HALAMAN (bukan ayat pertama surah),
      // agar halaman tengah surah panjang (mis. p42 = Al-Baqarah 253 = Juz 3) akurat.
      const juz = juzFromGlobalAyah(globalAyahStart(first[0]) + (first[1] - 1));
      return { page, juz, verseCount: pairs.length };
    });
  }, []);

  const renderPageItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.item, { backgroundColor: pal.colors.surface, borderColor: pal.colors.surfaceBorder }]}
      onPress={() => navigation.navigate('PageDetail', { page: item.page })}
      activeOpacity={0.85}
    >
      <View style={styles.itemHeader}>
        <View style={styles.itemNumberBadge}>
          <Text style={styles.itemNumber}>{item.page}</Text>
        </View>
        <View style={styles.itemTextBox}>
          <Text style={[styles.itemLatin, { color: pal.colors.text }]} numberOfLines={1}>Halaman {item.page}</Text>
          <Text style={[styles.itemMeta, { color: pal.colors.muted }]} numberOfLines={1}>{item.verseCount} ayat • Juz {item.juz}</Text>
        </View>
        <Ionicons name="book-outline" size={18} color={pal.colors.primary} />
      </View>
    </TouchableOpacity>
  );

  const renderJuzItem = ({ item }) => {
    // Header kartu = mulai juz dari batas klasik (JUZ_STARTS) — Juz 2 = Al-Baqarah 142.
    // Di bawahnya, SETIAP surah jadi chip yang bisa diklik → buka surah tsb pada
    // rentang ayatnya di juz (mis. chip "Al-Baqarah 142-252" → Al-Baqarah 142).
    const start = JUZ_STARTS.find((x) => x.juz === item.juz);
    const openJuzStart = () => {
      const target = start
        ? { surah: start.surah, name: start.name, ayat: start.ayat }
        : item.entries[0]
          ? { surah: item.entries[0].surah, name: item.entries[0].name, ayat: item.entries[0].fromAyat }
          : null;
      if (!target) return;
      navigation.navigate('SurahDetail', { nomor: target.surah, namaLatin: target.name, nama_latin: target.name, targetAyah: target.ayat });
    };
    const openEntry = (e) => {
      navigation.navigate('SurahDetail', { nomor: e.surah, namaLatin: e.name, nama_latin: e.name, targetAyah: e.fromAyat });
    };
    return (
      <View style={[styles.item, { backgroundColor: pal.colors.surface, borderColor: pal.colors.surfaceBorder }]}>
        <TouchableOpacity onPress={openJuzStart} activeOpacity={0.85}>
          <View style={styles.itemHeader}>
            <View style={styles.itemNumberBadge}>
              <Text style={styles.itemNumber}>{item.juz}</Text>
            </View>
            <View style={styles.itemTextBox}>
              <Text style={[styles.itemLatin, { color: pal.colors.text }]}>Juz {item.juz}</Text>
              <Text style={[styles.itemMeta, { color: pal.colors.muted }]} numberOfLines={1} ellipsizeMode="tail">{item.startLabel}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={pal.colors.primary} />
          </View>
        </TouchableOpacity>
        {/* Chip per surah dalam juz ini — masing-masing bisa diklik */}
        <View style={styles.juzChipRow}>
          {item.entries.map((e) => (
            <TouchableOpacity
              key={`jz${item.juz}-s${e.surah}`}
              style={styles.juzChip}
              activeOpacity={0.7}
              onPress={() => openEntry(e)}
            >
              <Text style={styles.juzChipText} numberOfLines={1}>
                {e.fromAyat === e.toAyat ? `${e.name} ${e.fromAyat}` : `${e.name} ${e.fromAyat}-${e.toAyat}`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

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
      <TouchableOpacity style={[styles.item, { backgroundColor: pal.colors.surface, borderColor: pal.colors.surfaceBorder }]} onPress={() => navigation.navigate('SurahDetail', { nomor: item.nomor, nama_latin: item.namaLatin || item.nama_latin, namaLatin: item.namaLatin || item.nama_latin })} activeOpacity={0.85}>
        <View style={styles.itemHeader}>
          <View style={styles.itemNumberBadge}>
            <Text style={styles.itemNumber}>{item.nomor}</Text>
          </View>
          <View style={styles.itemTextBox}>
            <Text style={[styles.itemLatin, { color: pal.colors.text }]} numberOfLines={1} ellipsizeMode="tail">{item.namaLatin || item.nama_latin}</Text>
            <Text style={[styles.itemMeta, { color: pal.colors.muted }]} numberOfLines={1} ellipsizeMode="tail">{item.arti} • {(item.jumlahAyat || item.jumlah_ayat)} ayat • {(item.tempatTurun || item.tempat_turun)} • Juz {juzsOfSurah(item.nomor).join(', ') || '-'}</Text>
          </View>
          <Text style={[styles.itemArabic, { color: pal.colors.primaryLight }]}>{item.nama}</Text>
        </View>
        <View style={styles.itemActions}>
          <TouchableOpacity style={styles.infoToggle} onPress={() => toggleExpand(item.nomor)}>
            <Ionicons name={isExpanded ? 'chevron-up' : 'sparkles-outline'} size={12} color={pal.colors.primaryLight} />
            <Text style={styles.infoToggleText}>{isExpanded ? 'Tutup ringkas' : 'Ringkas'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.infoToggle} onPress={() => toggleName(item.nomor)}>
            <Ionicons name="language-outline" size={12} color={pal.colors.primaryLight} />
            <Text style={styles.infoToggleText}>{isNameExpanded ? 'Tutup nama' : 'Nama Arab'}</Text>
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
      <View style={[styles.center, { backgroundColor: pal.colors.bg }]}>
        <ActivityIndicator size="large" color={pal.colors.primary} />
      </View>
    );
  }
  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: pal.colors.bg }]}>
        <Text style={{ color: pal.colors.text }}>{error}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: pal.colors.bg }}>
      <FlatList
        key={activeTab}
        data={activeTab === 'para' ? juzCards : activeTab === 'page' ? pageCards : pagedSurahs}
        numColumns={1}
        keyExtractor={(item) => String(activeTab === 'para' ? `juz-${item.juz}` : activeTab === 'page' ? `page-${item.page}` : item.nomor)}
        contentContainerStyle={[styles.list, { backgroundColor: pal.colors.bg }]}        renderItem={activeTab === 'para' ? renderJuzItem : activeTab === 'page' ? renderPageItem : renderItem}
        ListHeaderComponent={
          <View style={{ marginBottom: 12 }}>
            {/* Baris tab tampil di SEMUA tab agar navigasi konsisten */}
            <View style={styles.tabsRow}>
              <TouchableOpacity style={[styles.tabBtn, activeTab === 'surah' && styles.tabBtnActive]} onPress={() => setActiveTab('surah')}>
                <Text style={[styles.tabText, activeTab === 'surah' && styles.tabTextActive]}>Surah</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.tabBtn, activeTab === 'para' && styles.tabBtnActive]} onPress={() => setActiveTab('para')}>
                <Text style={[styles.tabText, activeTab === 'para' && styles.tabTextActive]}>Para</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.tabBtn, activeTab === 'page' && styles.tabBtnActive]} onPress={() => setActiveTab('page')}>
                <Text style={[styles.tabText, activeTab === 'page' && styles.tabTextActive]}>Page</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.tabBtn} onPress={() => navigation.navigate('QuranBookmarks')}>
                <Text style={styles.tabText}>Bookmark</Text>
              </TouchableOpacity>
            </View>

            {          activeTab === 'page' && (
              <View style={[styles.pageTabHeader, { marginTop: 10 }]}>
                <View style={styles.pageTabHeaderRow}>
                  <View style={styles.pageTabIconWrap}>
                    <Ionicons name="book-outline" size={16} color="#7c3aed" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pageTabTitle}>Halaman Mushaf</Text>
                    <Text style={styles.pageTabDesc}>{TOTAL_PAGES} halaman standar Madani — sesuai nomor halaman di mushaf cetak</Text>
                  </View>
                </View>
              </View>
            )}

            {activeTab === 'surah' && (
            <>
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


            {activeTab === 'surah' && (
              <View style={[styles.searchWrap, { backgroundColor: pal.colors.surface, borderColor: pal.colors.primary }]}>
                <View style={styles.searchIconWrap}>
                  <Ionicons name="search" size={18} color="#ffffff" />
                </View>
                <TextInput
                  placeholder="Cari surah — nomor, nama, arti..."
                  placeholderTextColor="#94a3b8"
                  value={query}
                  onChangeText={setQuery}
                  style={[styles.searchBox, { color: pal.colors.text }]}
                  returnKeyType="search"
                />
                {!!query && (
                  <TouchableOpacity onPress={() => setQuery('')} style={styles.searchClear} activeOpacity={0.7}>
                    <Ionicons name="close-circle" size={18} color="#94a3b8" />
                  </TouchableOpacity>
                )}
              </View>
            )}
            {activeTab === 'surah' && (
              <View style={styles.resultRow}>
                <Text style={styles.resultText}>{filteredSurahs.length} surah ditemukan</Text>
                <TouchableOpacity style={styles.refreshBtn} onPress={fetchList} activeOpacity={0.7}>
                  <Ionicons name="refresh" size={13} color={theme.colors.primaryDark} />
                  <Text style={styles.refreshText}>Refresh</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* === Panel Siapkan Offline === */}
            {activeTab === 'surah' && (
              <View style={styles.offlinePanel}>
                <View style={styles.offlineRow}>
                  <View style={styles.offlineInfo}>
                    <Text style={styles.offlineTitle}>
                      {offlineReady >= 114 ? 'Siap Offline ✓' : 'Siapkan untuk Offline'}
                    </Text>
                    <Text style={styles.offlineSubtitle}>
                      {offlineReady >= 114
                        ? 'Semua surah & tafsir tersimpan di perangkat'
                        : `${offlineReady}/114 surah tersimpan • buka tanpa internet`}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.offlineBtn, offlineDownloading && styles.offlineBtnDisabled]}
                    onPress={startOfflineDownload}
                    disabled={offlineDownloading}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={offlineDownloading ? 'cloud-download-outline' : offlineReady >= 114 ? 'checkmark-circle' : 'cloud-download-outline'}
                      size={14}
                      color="#ffffff"
                    />
                    <Text style={styles.offlineBtnText}>
                      {offlineDownloading ? 'Mengunduh…' : offlineReady >= 114 ? 'Perbarui' : 'Unduh Semua'}
                    </Text>
                  </TouchableOpacity>
                </View>
                {offlineDownloading && (
                  <View style={styles.offlineProgressWrap}>
                    <View style={[styles.offlineProgressBar, { width: `${Math.round(offlineProgress * 100)}%` }]} />
                  </View>
                )}
                {offlineDone && !offlineDownloading && (
                  <Text style={styles.offlineOk}>Semua data tersimpan — Quran bisa dibuka tanpa internet ✓</Text>
                )}
                {!!offlineErr && (
                  <Text style={styles.offlineErrText}>{offlineErr}</Text>
                )}

                {/* Audio offline dikelola di Pengaturan (per qari) */}
                <View style={styles.audioStatsRow}>
                  <Ionicons name="musical-notes" size={14} color={pal.colors.primary} />
                  <Text style={styles.audioStatsText}>
                    {audioStats.count > 0
                      ? `${audioStats.count} audio surah tersimpan • ${formatBytes(audioStats.totalBytes)}`
                      : `Belum ada audio offline — unduh per qari di Pengaturan`}
                  </Text>
                </View>
              </View>
            )}
            </>
            )}
          </View>
        }
        ListFooterComponent={activeTab === 'para' || activeTab === 'page' ? null : (
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
    </SafeAreaView>
  );
}

const makeStyles = (pal) => StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16 },
  // Pencarian menonjol dengan ikon ungu + badge jumlah hasil
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: pal.colors.surface, borderRadius: 16, borderWidth: 2, borderColor: pal.colors.primary, paddingVertical: 4, paddingRight: 8, ...theme.shadow.card },
  searchIconWrap: { width: 38, height: 38, borderRadius: 12, backgroundColor: pal.colors.primary, alignItems: 'center', justifyContent: 'center', marginLeft: 6 },
  searchBox: { flex: 1, paddingVertical: 8, paddingHorizontal: 10, color: pal.colors.text, fontWeight: '600', fontSize: 15 },
  searchClear: { padding: 4 },
  resultRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, paddingHorizontal: 4 },
  resultText: { color: pal.colors.muted, fontSize: 12, fontWeight: '600' },
  refreshBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: pal.colors.primaryLight + '2e', borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10, borderWidth: 1, borderColor: pal.colors.primaryLight },
  refreshText: { color: pal.colors.primaryDark, fontWeight: '700', fontSize: 12 },
  // Panel Siapkan Offline
  offlinePanel: { marginTop: 10, backgroundColor: pal.colors.surface, borderRadius: 14, borderWidth: 1, borderColor: pal.colors.primaryLight, padding: 12 },
  offlineRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  offlineInfo: { flex: 1, minWidth: 0, marginRight: 10 },
  offlineTitle: { fontWeight: '800', color: pal.colors.text, fontSize: 14 },
  offlineSubtitle: { color: pal.colors.muted, fontSize: 11, fontWeight: '600', marginTop: 2 },
  offlineBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: pal.colors.primary, paddingVertical: 9, paddingHorizontal: 14, borderRadius: 12 },
  offlineBtnDisabled: { opacity: 0.6 },
  offlineBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 12 },
  offlineProgressWrap: { height: 6, borderRadius: 3, backgroundColor: pal.colors.primaryLight + '2e', marginTop: 10, overflow: 'hidden' },
  offlineProgressBar: { height: 6, borderRadius: 3, backgroundColor: pal.colors.primary },
  audioStatsRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10,
    paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(124,58,237,0.12)',
  },
  audioStatsText: { flex: 1, fontSize: 11.5, color: pal.colors.muted },
  audioBatchBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: 'rgba(124,58,237,0.12)' },
  audioBatchText: { fontSize: 11.5, fontWeight: '700', color: pal.colors.primaryDark },
  audioBatchProgressWrap: {
    height: 6, borderRadius: 3, backgroundColor: 'rgba(124,58,237,0.15)', marginTop: 10, overflow: 'hidden',
  },
  audioDeleteBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: 'rgba(220,38,38,0.08)' },
  audioDeleteText: { fontSize: 11.5, fontWeight: '700', color: '#dc2626' },
  offlineOk: { color: '#047857', fontWeight: '700', fontSize: 12, marginTop: 8 },
  offlineErrText: { color: '#b91c1c', fontWeight: '700', fontSize: 12, marginTop: 8 },
  // Kartu item: badge nomor ungu + baris info rapi
  item: { backgroundColor: pal.colors.surface, borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: pal.colors.surfaceBorder, ...theme.shadow.card },  itemHeader: { flexDirection: 'row', alignItems: 'center' },
  itemNumberBadge: { width: 38, height: 38, borderRadius: 12, backgroundColor: pal.colors.primary, alignItems: 'center', justifyContent: 'center', marginRight: 12, ...theme.shadow.card },
  itemNumber: { fontWeight: '800', color: '#ffffff', fontSize: 15 },
  itemTextBox: { flex: 1, minWidth: 0 },
  itemLatin: { fontSize: 16, fontWeight: '800', color: pal.colors.text },
  itemArabic: { fontSize: 18, fontWeight: '700', textAlign: 'right', color: pal.colors.primaryDark, fontFamily: 'NotoNaskhArabic', marginLeft: 8 },
  itemMeta: { marginTop: 2, color: pal.colors.muted, fontSize: 12 },
  // Chip per surah di kartu Juz (tab Para)
  juzChipRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
  juzChip: {
    backgroundColor: pal.colors.primaryLight + '1f',
    borderRadius: 10,
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginRight: 6,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: pal.colors.surfaceBorder,
  },
  juzChipText: { color: pal.colors.primaryDark, fontSize: 12, fontWeight: '600' },
  itemActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 },
  infoToggle: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1, borderColor: pal.colors.primaryLight, backgroundColor: pal.colors.primaryLight + '1f', marginLeft: 8 },
  infoToggleText: { color: pal.colors.primaryDark, fontWeight: '700', fontSize: 11 },
  expandLoading: { marginTop: 8 },
  expandBox: { marginTop: 10, backgroundColor: pal.colors.surface, borderRadius: 12, padding: 10, borderWidth: 1, borderColor: pal.colors.surfaceBorder },
  expandTitle: { fontWeight: '700', marginBottom: 6, color: pal.colors.text },
  expandMeta: { color: pal.colors.muted, marginBottom: 2 },
  expandDescBox: { marginTop: 6, backgroundColor: pal.colors.primaryLight + '1f', padding: 8, borderRadius: 8 },
  expandDescTitle: { fontWeight: '700', color: pal.colors.text, marginBottom: 4 },
  expandDesc: { color: pal.colors.text },
  divider: { height: 1, backgroundColor: pal.colors.surfaceBorder, marginVertical: 10 },
  expandAyatArabic: { fontSize: 20, textAlign: 'right', lineHeight: 28, color: pal.colors.text, fontFamily: 'NotoNaskhArabic' },
  expandAyatLatin: { color: pal.colors.text, marginTop: 6 },
  expandAyatTrans: { color: pal.colors.text, marginTop: 4 },
  expandEmpty: { color: pal.colors.muted, fontStyle: 'italic' },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, marginRight: 8, marginBottom: 8, backgroundColor: pal.colors.primaryDark },
  detailBtn: { backgroundColor: '#6366f1' },
  tafsirBtn: { backgroundColor: pal.colors.primary },
  downloadBtn: { backgroundColor: pal.colors.primaryDark },
  actionText: { color: '#fff', fontWeight: '600' },
  previewHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pagerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  pagerBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, backgroundColor: pal.colors.surface, borderWidth: 1, borderColor: pal.colors.primaryLight, marginHorizontal: 8 },
  pagerBtnDisabled: { opacity: 0.5 },
  pagerText: { color: pal.colors.primary, fontWeight: '700' },
  pageInfoRow: { marginTop: 8, alignItems: 'center' },
  pageInfo: { color: pal.colors.muted, textAlign: 'center', fontWeight: '600' },
  footerRow: { marginTop: 12, alignItems: 'center' },
  footerText: { color: pal.colors.muted, fontSize: 12 },
  nameBox: { backgroundColor: pal.colors.surface, borderWidth: 1, borderColor: pal.colors.surfaceBorder, borderRadius: 10, padding: 10, marginTop: 8 },
  nameLabel: { fontSize: 12, color: pal.colors.muted, fontWeight: '700' },
  nameArabic: { fontSize: 18, fontWeight: '700', textAlign: 'right', color: pal.colors.text, fontFamily: 'NotoNaskhArabic' },
  nameLatin: { fontSize: 14, fontWeight: '600', color: pal.colors.text, marginBottom: 4 },
  cacheBadge: { alignSelf: 'flex-start', backgroundColor: '#fef3c7', borderColor: '#fde68a', borderWidth: 1, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8, marginTop: 8 },
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
  // qariChipText: { color: pal.colors.text },
  // qariChipTextActive: { color: '#fff', fontWeight: '600' },
  tabsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingHorizontal: 4 },
  tabBtn: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, borderColor: 'transparent' },
  tabBtnActive: { borderColor: pal.colors.primaryLight, backgroundColor: pal.colors.primaryLight + '1f' },
  tabText: { color: pal.colors.muted, fontWeight: '700', fontSize: 13 },
  tabTextActive: { color: pal.colors.primaryDark },
  // Kartu Juz (Para): identik dengan kartu Surah (kartu putih + badge ungu)

  // Kartu halaman mushaf memakai styles.item yang sama dengan kartu Surah
  pageTabHeader: {
    backgroundColor: pal.colors.surface, borderRadius: 14, borderWidth: 1, borderColor: pal.colors.surfaceBorder,
    padding: 12,
  },
  pageTabHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pageTabIconWrap: {
    width: 34, height: 34, borderRadius: 10, backgroundColor: pal.colors.primaryLight + '1f', borderWidth: 1,
    borderColor: pal.colors.surfaceBorder, alignItems: 'center', justifyContent: 'center',
  },
  pageTabTitle: { fontWeight: '800', color: pal.colors.text, fontSize: 14 },
  pageTabDesc: { color: pal.colors.muted, fontSize: 11.5, fontWeight: '600', marginTop: 2 },
});