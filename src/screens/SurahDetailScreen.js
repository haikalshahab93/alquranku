import React, { useEffect, useState, useRef } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, StyleSheet } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { getSuratDetail, getTafsir } from '../api/equran';
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
  const flatListRef = useRef(null);
  const player = useAudioPlayer();
  const playerStatus = useAudioPlayerStatus(player);

  useEffect(() => {
    navigation.setOptions({ title: `${namaLatin ?? nama_latin ?? ''}` });
  }, [namaLatin, nama_latin, navigation]);

  useEffect(() => {
    (async () => {
      try {
        const data = await getSuratDetail(nomor);
        setDetail(data);
        const ayah0 = data?.ayat?.[0];
        const audioObj0 = ayah0?.audio || {};
        const keys = Object.keys(audioObj0);
        const qariKeys = Array.from(new Set(keys.filter(Boolean)));
        setAvailableQaris(qariKeys);
        // Build labels for qari keys, parsing from URL if needed
        const labelMap = {};
        qariKeys.forEach((k) => {
          const url = audioObj0[k];
          let label = QARI_LABELS[k];
          if (!label && typeof url === 'string') {
            try {
              const m = url.match(/audio-partial\/(.+?)\//);
              if (m && m[1]) {
                label = decodeURIComponent(m[1]).replace(/-/g, ' ');
              }
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
    })();
  }, [nomor]);

  // Sinkronkan status player ke state isPlaying dan auto-next saat selesai
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

  // Load saved Qari preference
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

  // Simpan preferensi Qari saat berubah
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

  // Restart ayat aktif dengan Qari baru saat Qari berubah
  useEffect(() => {
    if (selectedQari && playingAyahIndex != null) {
      playAyah(playingAyahIndex);
    }
  }, [selectedQari]);

  const getAyahAudioUrl = (index) => {
    const ayah = detail?.ayat?.[index];
    if (!ayah || !ayah.audio) return null;
    const audioObj = ayah.audio;
    // Prefer selected Qari if available for this ayah
    if (selectedQari && typeof audioObj[selectedQari] === 'string' && audioObj[selectedQari]) {
      return audioObj[selectedQari];
    }
    // Fallback: iterate through available qari keys for this surah
    for (const k of availableQaris) {
      if (typeof audioObj[k] === 'string' && audioObj[k]) return audioObj[k];
    }
    // Final fallback: any available string value
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
    }
  };

  // Sinkronkan tafsir ke map per ayat
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
        // Abaikan error tafsir agar layar detail tetap berfungsi
        setTafsirMap({});
      }
    })();
  }, [nomor]);

  // Pastikan pemutar berhenti saat komponen di-unmount (Android safety)
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
    return (
      <View style={[styles.ayat, isActive && styles.ayatActive]}>
        {tafsirForAyah ? (
          <View style={styles.header}>
            <TouchableOpacity
              style={[styles.tafsirToggle, isTafsirExpanded && styles.tafsirToggleActive]}
              onPress={() => setExpandedTafsirAyahs((prev) => ({ ...prev, [ayahNumber]: !isTafsirExpanded }))}
            >
              <Text style={[styles.tafsirToggleText, isTafsirExpanded && styles.tafsirToggleTextActive]}>{isTafsirExpanded ? `Tutup Tafsir Ayat ${ayahNumber}` : `Lihat Tafsir Ayat ${ayahNumber}`}</Text>
            </TouchableOpacity>
            {isTafsirExpanded && (
              <View style={styles.tafsirBox}>
                <Text style={styles.tafsirContent}>{tafsirForAyah}</Text>
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
        {arabText ? <Text style={styles.arab}>{arabText}</Text> : null}
        {latinText ? <Text style={styles.latin}>{latinText}</Text> : null}
        {indoText ? <Text style={styles.terjemahan}>{indoText}</Text> : null}
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
          {selectedQari && (
            <Text style={styles.selectedQari}>Qari yang dipilih: {qariLabelsMap[selectedQari] || selectedQari}</Text>
          )}
          {availableQaris.length > 0 && (
            <View style={styles.qariRow}>
              {availableQaris.filter(Boolean).map((q, i) => (
                <TouchableOpacity key={`${q}-${i}`} style={[styles.qariChip, selectedQari === q && styles.qariChipActive]} onPress={() => setSelectedQari(q)}>
                  <Text style={[styles.qariChipText, selectedQari === q && styles.qariChipTextActive]}>{qariLabelsMap[q] || q}</Text>
                </TouchableOpacity>
              ))}
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
  ayatNumber: { color: '#555', fontWeight: '600', marginBottom: 4 },
  arab: { fontSize: 22, textAlign: 'right', lineHeight: 30 },
  latin: { color: '#444', marginTop: 8 },
  terjemahan: { color: '#222', marginTop: 4 },
  audioBtn: { marginTop: 8, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#0ea5e9', alignSelf: 'flex-start' },
  audioText: { color: '#fff', fontWeight: '600' },
  tafsirBtn: { marginTop: 8, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#10b981', alignSelf: 'flex-start' },
  tafsirText: { color: '#fff', fontWeight: '600' },
  ayatActive: { backgroundColor: '#f0f9ff', borderLeftWidth: 3, borderLeftColor: '#0ea5e9', paddingLeft: 8, borderRadius: 8 },
  qariRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  qariChip: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 16, borderWidth: 1, borderColor: '#ddd', marginRight: 8, marginBottom: 8 },
  qariChipActive: { backgroundColor: '#0ea5e9', borderColor: '#0ea5e9' },
  qariChipText: { color: '#333' },
  qariChipTextActive: { color: '#fff', fontWeight: '600' },
  controlsRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  ctrlBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, marginRight: 8, marginBottom: 8, backgroundColor: '#374151' },
  playAllBtn: { backgroundColor: '#6366f1' },
  stopBtn: { backgroundColor: '#ef4444' },
  ctrlText: { color: '#fff', fontWeight: '600' },
});