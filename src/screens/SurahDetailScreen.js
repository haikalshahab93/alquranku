import React, { useEffect, useState, useRef } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { getSuratDetail, getTafsir } from '../api/quran';
import AsyncStorage from '@react-native-async-storage/async-storage';

const QARI_LABELS = {
  alafasy: 'Al-Afasy',
  juhany: 'Al-Juhany',
  qasim: 'Al-Qasim',
  sudais: 'As-Sudais',
  dossari: 'Al-Dossari',
};

export default function SurahDetailScreen({ route, navigation }) {
  const { nomor, nama_latin, namaLatin } = route.params;
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState(null);
  const [playingAyahId, setPlayingAyahId] = useState(null);
  const [playingAyahIndex, setPlayingAyahIndex] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [availableQaris, setAvailableQaris] = useState([]);
  const [selectedQari, setSelectedQari] = useState(null);
  const [qariLabelsMap, setQariLabelsMap] = useState({});
  const [tafsirMap, setTafsirMap] = useState({});
  const [expandedTafsirAyahs, setExpandedTafsirAyahs] = useState({});
  const [qariDropdownOpen, setQariDropdownOpen] = useState(false);
  const [tafsirPageIndexByAyah, setTafsirPageIndexByAyah] = useState({});
  const [textScale, setTextScale] = useState(1);
  const [fromCacheDetail, setFromCacheDetail] = useState(false);
  const [tafsirBoxWidths, setTafsirBoxWidths] = useState({});
  const tafsirScrollRefs = useRef({});
  const flatListRef = useRef(null);
  const player = useAudioPlayer();
  const playerStatus = useAudioPlayerStatus(player);

  useEffect(() => {
    navigation.setOptions({ title: `${namaLatin ?? nama_latin ?? ''}` });
  }, [namaLatin, nama_latin, navigation]);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const data = await getSuratDetail(nomor);
      setDetail(data);
      setFromCacheDetail(!!data?.__fromCache);
      const ayah0 = data?.ayat?.[0];
      const audioObj0 = ayah0?.audio || {};
      const keys = Object.keys(audioObj0);
      const qariKeys = Array.from(new Set(keys.filter(Boolean)));
      setAvailableQaris(qariKeys);
      const labelMap = {};
      qariKeys.forEach((k) => {
        const url = audioObj0[k];
        let label = QARI_LABELS[k];
        if (!label && typeof url === 'string') {
          try {
            const m = url.match(/audio-partial\/(.+?)\//);
            if (m && m[1]) label = decodeURIComponent(m[1]).replace(/-/g, ' ');
          } catch {}
        }
        labelMap[k] = label || k;
      });
      setQariLabelsMap(labelMap);
      setSelectedQari(qariKeys.includes('alafasy') ? 'alafasy' : (qariKeys[0] || null));
    } catch (e) {
      setError('Gagal memuat detail surat');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [nomor]);

  useEffect(() => {
    if ('playing' in playerStatus) {
      setIsPlaying(!!playerStatus.playing);
    }
    const finished =
      !playerStatus.playing &&
      typeof playerStatus.duration === 'number' &&
      typeof playerStatus.position === 'number' &&
      playerStatus.duration > 0 &&
      playerStatus.position >= playerStatus.duration - 500;
    if (finished) {
      const next = (playingAyahIndex != null ? playingAyahIndex + 1 : null);
      if (next != null && detail?.ayat && next < detail.ayat.length) {
        playAyah(next);
      } else {
        setPlayingAyahId(null);
        setPlayingAyahIndex(null);
        setIsPlaying(false);
        try { player.seekTo(0); } catch {}
      }
    }
  }, [playerStatus.playing, playerStatus.position, playerStatus.duration]);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem('preferred_qari');
        if (saved) {
          setSelectedQari(saved);
        }
      } catch (e) {
        console.warn('Failed to load preferred qari', e);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (selectedQari) {
        try {
          await AsyncStorage.setItem('preferred_qari', selectedQari);
        } catch (e) {
          console.warn('Failed to save preferred qari', e);
        }
      }
    })();
  }, [selectedQari]);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem('text_scale');
        if (saved) {
          const v = parseFloat(saved);
          if (!Number.isNaN(v)) {
            const clamped = Math.min(1.6, Math.max(0.8, v));
            setTextScale(clamped);
          }
        }
      } catch (e) {
        console.warn('Failed to load text scale', e);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await AsyncStorage.setItem('text_scale', String(textScale));
      } catch (e) {
        console.warn('Failed to save text scale', e);
      }
    })();
  }, [textScale]);

  const increaseTextScale = () => {
    setTextScale((s) => Math.min(1.6, Math.round((s + 0.1) * 10) / 10));
  };
  const decreaseTextScale = () => {
    setTextScale((s) => Math.max(0.8, Math.round((s - 0.1) * 10) / 10));
  };

  useEffect(() => {
    if (selectedQari && playingAyahIndex != null) {
      playAyah(playingAyahIndex);
    }
  }, [selectedQari]);

  const getAyahAudioUrl = (index) => {
    const ayah = detail?.ayat?.[index];
    if (!ayah || !ayah.audio) return null;
    const audioObj = ayah.audio;
    if (selectedQari && typeof audioObj[selectedQari] === 'string' && audioObj[selectedQari]) {
      return audioObj[selectedQari];
    }
    for (const k of availableQaris) {
      if (typeof audioObj[k] === 'string' && audioObj[k]) return audioObj[k];
    }
    for (const val of Object.values(audioObj)) {
      if (typeof val === 'string' && val) return val;
    }
    return null;
  };

  const stopCurrent = async () => {
    try { player.pause(); } catch {}
    try { player.seekTo(0); } catch {}
  };

  const playAyah = async (index) => {
    try {
      const url = getAyahAudioUrl(index);
      if (!url) return;
      await stopCurrent();
      player.replace({ uri: url });
      setPlayingAyahIndex(index);
      setPlayingAyahId(detail.ayat[index].id);
      flatListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
      player.seekTo(0);
      player.play();

      // Simpan progress "terakhir dibaca" setiap kali memutar ayat
      try {
        const metaNama = detail?.surat?.namaLatin || detail?.surat?.nama_latin || namaLatin || nama_latin || '';
        await AsyncStorage.setItem('last_read', JSON.stringify({
          nomor,
          namaLatin: metaNama,
          lastAyah: (detail?.ayat?.[index]?.nomorAyat || detail?.ayat?.[index]?.nomor_ayat || index + 1),
        }));
      } catch {}
    } catch (e) {
      console.log('Audio error', e);
    }
  };

  const togglePlayPause = async () => {
    if (playerStatus.playing) {
      player.pause();
      setIsPlaying(false);
    } else {
      player.play();
      setIsPlaying(true);
      // Saat melanjutkan, update last_read ke ayat aktif
      try {
        const metaNama = detail?.surat?.namaLatin || detail?.surat?.nama_latin || namaLatin || nama_latin || '';
        await AsyncStorage.setItem('last_read', JSON.stringify({
          nomor,
          namaLatin: metaNama,
          lastAyah: (detail?.ayat?.[playingAyahIndex]?.nomorAyat || detail?.ayat?.[playingAyahIndex]?.nomor_ayat || (playingAyahIndex != null ? playingAyahIndex + 1 : 1)),
        }));
      } catch {}
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const tafsir = await getTafsir(nomor);
        const extractTafsirList = (d) => {
          if (!d) return null;
          if (Array.isArray(d?.tafsir)) return d.tafsir;
          if (Array.isArray(d?.tafsir?.kemenag)) return d.tafsir.kemenag;
          if (Array.isArray(d?.tafsir?.id)) return d.tafsir.id;
          return null;
        };
        const list = extractTafsirList(tafsir);
        if (Array.isArray(list)) {
          const map = {};
          list.forEach((it) => {
            const a = it?.ayat;
            const t = it?.teks || it?.tafsir || it?.content || '';
            if (a != null && t) map[a] = t;
          });
          setTafsirMap(map);
        } else {
          setTafsirMap({});
        }
      } catch (e) {
        setTafsirMap({});
      }
    })();
  }, [nomor]);

  useEffect(() => {
    return () => {
      try { player.pause(); } catch {}
      try { player.seekTo(0); } catch {}
    };
  }, [player]);

  const renderItem = ({ item, index }) => {
    const isActive = index === playingAyahIndex;
    const hasAudio = !!getAyahAudioUrl(index);
    const qariName = qariLabelsMap[selectedQari] || selectedQari;
    const ayahNumber = (item?.nomorAyat != null ? item.nomorAyat : (item?.nomor != null ? item.nomor : index + 1));
    const arabText = item?.teksArab ?? item?.teks_arab;
    const latinText = item?.teksLatin ?? item?.teks_latin;
    const indoText = item?.teksIndonesia ?? item?.teks_terjemahan;
    const tafsirForAyah = tafsirMap[ayahNumber];
    const isTafsirExpanded = !!expandedTafsirAyahs[ayahNumber];

    const computeCharsPerPage = () => {
      const { height, width } = Dimensions.get('window');
      const maxHeight = Math.floor(height * 0.6);
      const fontSize = 14 * textScale;
      const lineHeight = 20 * textScale;
      const linesPerPage = Math.max(8, Math.floor(maxHeight / lineHeight));
      const charsPerLine = Math.max(18, Math.floor(width / (fontSize * 0.6)));
      return Math.floor(linesPerPage * charsPerLine * 0.9);
    };
    const splitTextIntoChunks = (text, size) => {
      if (!text) return [];
      const chunks = [];
      let i = 0;
      while (i < text.length) {
        const end = Math.min(i + size, text.length);
        let cut = end;
        if (end < text.length) {
          const lastSpace = text.lastIndexOf(' ', end - 1);
          if (lastSpace > i + Math.floor(size * 0.5)) {
            cut = lastSpace;
          }
        }
        chunks.push(text.slice(i, cut).trim());
        i = cut;
      }
      return chunks.filter(Boolean);
    };
    const charsPerPage = computeCharsPerPage();
    const tafsirChunks = isTafsirExpanded && tafsirForAyah ? splitTextIntoChunks(tafsirForAyah, charsPerPage) : [];
    const currentPage = tafsirPageIndexByAyah[ayahNumber] ?? 0;
    const maxPageIndex = Math.max(0, tafsirChunks.length - 1);
    const currentChunk = tafsirChunks[currentPage] ?? (tafsirForAyah || '');

    return (
      <View style={[styles.ayat, isActive && styles.ayatActive]}>
        {tafsirForAyah ? (
          <View style={styles.header}>
            <TouchableOpacity
              style={[styles.tafsirToggle, isTafsirExpanded && styles.tafsirToggleActive]}
              onPress={() => {
                const nextExpanded = !isTafsirExpanded;
                setExpandedTafsirAyahs((prev) => ({ ...prev, [ayahNumber]: nextExpanded }));
                if (nextExpanded) {
                  setTafsirPageIndexByAyah((prev) => ({ ...prev, [ayahNumber]: 0 }));
                }
              }}
            >
              <Text style={[styles.tafsirToggleText, isTafsirExpanded && styles.tafsirToggleTextActive]}>{isTafsirExpanded ? `Tutup Tafsir Ayat ${ayahNumber}` : `Lihat Tafsir Ayat ${ayahNumber}`}</Text>
            </TouchableOpacity>
            {isTafsirExpanded && (
              <View
                style={[
                  styles.tafsirBox,
                  { maxHeight: Math.floor(Dimensions.get('window').height * 1.0), overflow: 'hidden' },
                ]}
                onLayout={(e) => {
                  const w = e?.nativeEvent?.layout?.width;
                  if (w && w > 0) setTafsirBoxWidths((prev) => ({ ...prev, [ayahNumber]: w }));
                }}
              >
                <ScrollView
                  ref={(el) => { tafsirScrollRefs.current[ayahNumber] = el; }}
                  horizontal
                  pagingEnabled
                  scrollEnabled={false}
                  showsHorizontalScrollIndicator={false}
                  onLayout={(e) => {
                    const w = e.nativeEvent.layout.width;
                    setTafsirBoxWidths((prev) => ({ ...prev, [ayahNumber]: w }));
                  }}
                  onMomentumScrollEnd={(e) => {
                    const w = tafsirBoxWidths[ayahNumber] || 1;
                    const x = e.nativeEvent.contentOffset.x;
                    const idx = Math.round(x / Math.max(1, w));
                    setTafsirPageIndexByAyah((prev) => ({ ...prev, [ayahNumber]: idx }));
                  }}
                >
                  {tafsirChunks.map((chunk, i) => (
                    <View key={`tafsir-chunk-${ayahNumber}-${i}`} style={{ width: tafsirBoxWidths[ayahNumber] || '100%' }}>
                      <Text style={[styles.tafsirContent, { fontSize: 14 * textScale, lineHeight: 20 * textScale }]}>{chunk}</Text>
                    </View>
                  ))}
                </ScrollView>
                <View style={styles.pageNavRow}>
                  <TouchableOpacity
                    style={styles.pageBtn}
                    onPress={() => {
                      const target = Math.max(0, currentPage - 1);
                      const w = tafsirBoxWidths[ayahNumber] || 0;
                      tafsirScrollRefs.current[ayahNumber]?.scrollTo({ x: target * w, y: 0, animated: true });
                      setTafsirPageIndexByAyah((prev) => ({ ...prev, [ayahNumber]: target }));
                    }}
                    disabled={currentPage <= 0}
                  >
                    <Text style={[styles.pageBtnText, currentPage <= 0 && styles.pageBtnTextDisabled]}>Sebelum</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.pageBtn}
                    onPress={() => {
                      const target = Math.min(maxPageIndex, currentPage + 1);
                      const w = tafsirBoxWidths[ayahNumber] || 0;
                      tafsirScrollRefs.current[ayahNumber]?.scrollTo({ x: target * w, y: 0, animated: true });
                      setTafsirPageIndexByAyah((prev) => ({ ...prev, [ayahNumber]: target }));
                    }}
                    disabled={currentPage >= maxPageIndex}
                  >
                    <Text style={[styles.pageBtnText, currentPage >= maxPageIndex && styles.pageBtnTextDisabled]}>Sesudah</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.pageIndicator}>{`Halaman ${Math.min(currentPage + 1, Math.max(1, tafsirChunks.length || 1))}/${Math.max(1, tafsirChunks.length || 1)}`}</Text>
              </View>
            )}
          </View>
        ) : null}
        <Text style={styles.ayatNumber}>Ayat {ayahNumber}</Text>
        {hasAudio && (
          <TouchableOpacity
            style={styles.audioBtn}
            onPress={() => (isActive ? togglePlayPause() : playAyah(index))}
          >
            <Text style={styles.audioText}>{isActive ? (isPlaying ? 'Pause' : 'Resume') : `Play Ayat ${ayahNumber}${qariName ? ` - ${qariName}` : ''}`}</Text>
          </TouchableOpacity>
        )}
        {arabText ? <Text style={[styles.arab, { fontSize: 22 * textScale, lineHeight: 30 * textScale }]}>{arabText}</Text> : null}
        {latinText ? <Text style={[styles.latin, { fontSize: 14 * textScale, lineHeight: 20 * textScale }]}>{latinText}</Text> : null}
        {indoText ? <Text style={[styles.terjemahan, { fontSize: 14 * textScale, lineHeight: 20 * textScale }]}>{indoText}</Text> : null}
      </View>
    );
  };

  const stopPlayback = async () => {
    await stopCurrent();
    setPlayingAyahId(null);
    setPlayingAyahIndex(null);
    setIsPlaying(false);
  };

  const playSurah = () => {
    if (!detail?.ayat?.length) return;
    playAyah(0);
  };

  const playPrev = () => {
    if (!detail?.ayat?.length) return;
    const prev = (playingAyahIndex != null ? playingAyahIndex - 1 : detail.ayat.length - 1);
    if (prev >= 0) {
      playAyah(prev);
    }
  };

  const playNext = () => {
    if (!detail?.ayat?.length) return;
    const next = (playingAyahIndex != null ? playingAyahIndex + 1 : 0);
    if (next < detail.ayat.length) {
      playAyah(next);
    }
  };

  const navigateTafsir = (currentAyah, direction) => {
    if (!detail?.ayat?.length) return;
    const total = detail.ayat.length;
    let target = currentAyah;
    if (direction === 'prev') target = Math.max(1, currentAyah - 1);
    if (direction === 'next') target = Math.min(total, currentAyah + 1);
    setExpandedTafsirAyahs((prev) => ({ ...prev, [currentAyah]: false, [target]: true }));
    setTafsirPageIndexByAyah((prev) => ({ ...prev, [target]: 0 }));
    const idx = target - 1;
    flatListRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0.1 });
  };

  if (loading && !detail) {
    return (
      <View style={styles.center}><ActivityIndicator size="large" /></View>
    );
  }

  return (
    <FlatList
      ref={flatListRef}
      data={detail?.ayat}
      keyExtractor={(item, index) => `${item?.id ?? item?.nomor ?? item?.nomorAyat ?? 'ayah'}-${index}`}
      renderItem={renderItem}
      contentContainerStyle={styles.list}
      initialNumToRender={12}
      windowSize={10}
      removeClippedSubviews
      ListHeaderComponent={() => (
        <View style={styles.header}>
          <Text style={styles.title}>{detail?.namaLatin ?? detail?.nama_latin} ({detail?.nama})</Text>
          <Text style={styles.meta}>{detail?.arti} • {(detail?.jumlahAyat ?? detail?.jumlah_ayat)} ayat • {(detail?.tempatTurun ?? detail?.tempat_turun)}</Text>
          {fromCacheDetail ? (
            <View style={styles.cacheBadge}><Text style={styles.cacheText}>Data dari Cache</Text></View>
          ) : null}
          {availableQaris.length > 0 && (
            <View style={styles.qariSection}>
              <TouchableOpacity style={styles.qariDropdownToggle} onPress={() => setQariDropdownOpen((o) => !o)}>
                <Text style={styles.qariDropdownText}>Qari: {qariLabelsMap[selectedQari] || selectedQari || 'Pilih'}</Text>
              </TouchableOpacity>
              {qariDropdownOpen && (
                <View style={styles.qariDropdown}>
                  {availableQaris.filter(Boolean).map((q, i) => (
                    <TouchableOpacity
                      key={`${q}-${i}`}
                      style={[styles.qariOption, selectedQari === q && styles.qariOptionActive]}
                      onPress={() => { setSelectedQari(q); setQariDropdownOpen(false); }}
                    >
                      <Text style={[styles.qariOptionText, selectedQari === q && styles.qariOptionTextActive]}>{qariLabelsMap[q] || q}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}
          <View style={styles.controlsRow}>
            <TouchableOpacity style={[styles.ctrlBtn, styles.playAllBtn]} onPress={playSurah}>
              <Text style={styles.ctrlText}>Putar Surat</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.ctrlBtn]} onPress={playPrev}>
              <Text style={styles.ctrlText}>Sebelumnya</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.ctrlBtn]} onPress={playNext}>
              <Text style={styles.ctrlText}>Berikutnya</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.ctrlBtn, styles.stopBtn]} onPress={stopPlayback}>
              <Text style={styles.ctrlText}>Hentikan</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.ctrlBtn]} onPress={fetchDetail}>
              <Text style={styles.ctrlText}>Refresh</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.fontRow}>
            <TouchableOpacity style={styles.fontBtn} onPress={decreaseTextScale}>
              <Text style={styles.fontBtnText}>A-</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.fontBtn} onPress={increaseTextScale}>
              <Text style={styles.fontBtnText}>A+</Text>
            </TouchableOpacity>
            <Text style={styles.fontInfo}>{`Ukuran: ${textScale.toFixed(1)}x`}</Text>
          </View>
          <TouchableOpacity style={styles.tafsirBtn} onPress={() => navigation.navigate('Tafsir', { nomor })}>
            <Text style={styles.tafsirText}>Lihat Tafsir</Text>
          </TouchableOpacity>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16 },
  header: { paddingBottom: 12, borderBottomWidth: 1, borderColor: '#eee', marginBottom: 12 },
  title: { fontSize: 20, fontWeight: '700' },
  meta: { color: '#666', marginTop: 4 },
  selectedQari: { marginTop: 4, color: '#0f766e', fontWeight: '600' },
  ayat: { marginBottom: 16, backgroundColor: '#fff', borderRadius: 12, padding: 12, elevation: 1 },
  qariSection: { marginTop: 8 },
  qariDropdownToggle: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', alignSelf: 'flex-start', backgroundColor: '#f1f5f9' },
  qariDropdownText: { color: '#0f766e', fontWeight: '600' },
  qariDropdown: { marginTop: 8, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, backgroundColor: '#fff', overflow: 'hidden' },
  qariOption: { paddingVertical: 8, paddingHorizontal: 12 },
  qariOptionActive: { backgroundColor: '#0ea5e9' },
  qariOptionText: { color: '#333' },
  qariOptionTextActive: { color: '#fff', fontWeight: '600' },
  ayatNumber: { color: '#555', fontWeight: '600', marginBottom: 4 },
  arab: { fontSize: 22, textAlign: 'right', lineHeight: 30, fontFamily: 'NotoNaskhArabic' },
  latin: { color: '#444', marginTop: 8 },
  terjemahan: { color: '#222', marginTop: 4 },
  audioBtn: { marginTop: 8, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#0ea5e9', alignSelf: 'flex-start' },
  audioText: { color: '#fff', fontWeight: '600' },
  tafsirBtn: { marginTop: 8, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#10b981', alignSelf: 'flex-start' },
  tafsirText: { color: '#fff', fontWeight: '600' },
  tafsirToggle: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#f1f5f9', alignSelf: 'flex-start', marginTop: 8 },
  tafsirToggleActive: { backgroundColor: '#e0f2fe' },
  tafsirToggleText: { color: '#0ea5e9', fontWeight: '600' },
  tafsirToggleTextActive: { color: '#0284c7', fontWeight: '700' },
  ayatActive: { backgroundColor: '#f0f9ff', borderLeftWidth: 3, borderLeftColor: '#0ea5e9', paddingLeft: 8, borderRadius: 8 },
  qariRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  qariChip: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 16, borderWidth: 1, borderColor: '#ddd', marginRight: 8, marginBottom: 8 },
  qariChipActive: { backgroundColor: '#0ea5e9', borderColor: '#0ea5e9' },
  qariChipText: { color: '#333' },
  qariChipTextActive: { color: '#fff', fontWeight: '600' },
  controlsRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  ctrlBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#0ea5e9', marginRight: 8, marginBottom: 8, alignSelf: 'flex-start' },
  ctrlText: { color: '#fff', fontWeight: '600' },
  playAllBtn: { backgroundColor: '#0ea5e9' },
  stopBtn: { backgroundColor: '#ef4444' },
  tafsirNavRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  navBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#0ea5e9', marginRight: 8, marginBottom: 8, alignSelf: 'flex-start' },
  navText: { color: '#fff', fontWeight: '600' },
  navTextDisabled: { color: '#94a3b8' },
  contextBox: { backgroundColor: '#f8fafc', padding: 8, borderRadius: 8, marginTop: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  contextLabel: { fontSize: 12, color: '#64748b', marginBottom: 4, fontWeight: '700' },
  tafsirContextText: { color: '#374151' },
  tafsirBox: { marginTop: 8, padding: 8, borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb' },
  tafsirContent: { color: '#111827' },
  pageNavRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  pageBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#f1f5f9' },
  pageBtnText: { color: '#0ea5e9', fontWeight: '600' },
  pageBtnTextDisabled: { color: '#94a3b8' },
  pageIndicator: { textAlign: 'center', color: '#64748b', marginTop: 4 },
  fontRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, alignItems: 'center' },
  fontBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#f1f5f9', marginRight: 8, marginBottom: 8, alignSelf: 'flex-start' },
  fontBtnText: { color: '#0ea5e9', fontWeight: '600' },
  fontInfo: { color: '#64748b', fontWeight: '600' },
  cacheBadge: { alignSelf: 'flex-start', backgroundColor: '#fef3c7', borderColor: '#fde68a', borderWidth: 1, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8, marginTop: 8 },
  cacheText: { color: '#92400e', fontWeight: '700' },
});