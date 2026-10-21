import React, { useEffect, useState, useRef } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, StyleSheet, Dimensions, ScrollView, Share } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { getSuratDetail, getTafsir } from '../../api/quran';
import { fetchChapterAudioData, findVerseTiming, wordPosAt, splitArabicWords, getPreferredKaraokeReciter } from '../../api/quranAudio';
import { getKaraokeAudioData, isAudioSavedOffline } from '../../api/offlineAudio';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme, getPalette } from '../../ui';
import { useAppearance, setTextScale as saveTextScale } from '../../api/appearance';
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'

// Nomor ayat dalam angka Arab-Indic untuk tanda akhir ayat mode mushaf (۝١)
const toArabicDigits = (n) => String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]);

// Label nama qari (sebelumnya dipakai tapi belum didefinisikan -> ReferenceError).
// Kalau sudah punya map sendiri di api/quran, hapus ini dan import dari sana.
const QARI_LABELS = {};

export default function SurahDetailScreen({ route, navigation }) {
  // Definisi fetchDetail ditempatkan di atas return agar bisa dipanggil dari effect & tombol
  // (lihat bagian bawah file untuk implementasi fungsinya)

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
  const [tafsirPageIndexByAyah, setTafsirPageIndexByAyah] = useState({});
  // textScale & dark mode dibaca TERPUSAT dari pengaturan tampilan,
  // sinkron otomatis dengan layar Pengaturan lewat event bus.
  const { darkMode, textScale } = useAppearance();
  const pal = getPalette(darkMode);
  const [fromCacheDetail, setFromCacheDetail] = useState(false);
  const [tafsirBoxWidths, setTafsirBoxWidths] = useState({});
  const tafsirScrollRefs = useRef({});
  const flatListRef = useRef(null);
  const lastAutoScrollAtRef = useRef(0);
  // Penanda: event "selesai" untuk pemutaran saat ini sudah ditangani (cegah dobel)
  const finishHandledRef = useRef(false);
  // updateInterval 250ms: event status mengalir berkala (native & web) supaya
  // marking karaoke bergerak halus mengikuti bacaan.
  const player = useAudioPlayer(null, { updateInterval: 250 });
  const playerStatus = useAudioPlayerStatus(player);
  const [bookmarksMap, setBookmarksMap] = useState({});
  const [activeCollection, setActiveCollection] = useState('My Favorite');
  // Progres baca (0..1) untuk wash-highlight ayat aktif + penanda ayat awal juz
  const [playProgress, setPlayProgress] = useState(0);
  const [rowWidth, setRowWidth] = useState(0);
  const [highlightAyah, setHighlightAyah] = useState(null);
  // === Mode Karaoke (sumber audio quran.com: 1 MP3/surah + timing per kata) ===
  const [karaokeMode, setKaraokeMode] = useState(false);
  const [karaokeLoading, setKaraokeLoading] = useState(false);
  const [karaokeData, setKaraokeData] = useState(null);
  const [karaokeErr, setKaraokeErr] = useState(null);
  const [activeVerseKey, setActiveVerseKey] = useState(null); // 'surah:ayat'
  const [activeWordPos, setActiveWordPos] = useState(-1); // posisi kata 1-based
  // === Mode tampil teks: 'ayat' (per ayat) / 'mushaf' (Arab mengalir + tanda akhir ayat) ===
  const [displayMode, setDisplayMode] = useState('ayat');

  // === Reciter karaoke: dipilih di layar Pengaturan, di sini hanya dipakai ===
  const [selectedKaraokeReciterId, setSelectedKaraokeReciterId] = useState(7);

  // === Audio offline: status unduhan per surah ===
  const [audioOffline, setAudioOffline] = useState(null); // meta tersimpan


  useEffect(() => {
    navigation.setOptions({ title: `${namaLatin ?? nama_latin ?? ''}` });
  }, [namaLatin, nama_latin, navigation]);

  // Cek status audio offline saat mount / reciter berubah
  useEffect(() => {
    let alive = true;
    isAudioSavedOffline(Number(nomor), selectedKaraokeReciterId).then((m) => { if (alive) setAudioOffline(m); }).catch(() => {});
    return () => { alive = false; };
  }, [nomor, selectedKaraokeReciterId]);

  const BOOKMARK_KEY = 'quran_bookmarks';
  const CURRENT_COLLECTION_KEY = 'quran_bookmarks_active_collection';
  const loadBookmarks = async () => {
    try {
      const colRaw = await AsyncStorage.getItem(CURRENT_COLLECTION_KEY);
      const col = colRaw || 'My Favorite';
      setActiveCollection(col);

      const raw = await AsyncStorage.getItem(BOOKMARK_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      let items = [];
      if (Array.isArray(parsed)) {
        // migrate array -> collections structure
        items = parsed;
        const migrated = { collections: { [col]: items } };
        await AsyncStorage.setItem(BOOKMARK_KEY, JSON.stringify(migrated));
      } else if (parsed && typeof parsed === 'object') {
        const collections = parsed.collections || {};
        items = Array.isArray(collections[col]) ? collections[col] : [];
      }
      const map = {};
      (Array.isArray(items) ? items : []).forEach((b) => {
        if (b && b.nomorSurah != null && b.ayahNumber != null) {
          map[`${b.nomorSurah}-${b.ayahNumber}`] = true;
        }
      });
      setBookmarksMap(map);
    } catch {
      setBookmarksMap({});
    }
  };
  useEffect(() => { loadBookmarks(); }, [nomor]);
  const isBookmarked = (ayahNumber) => !!bookmarksMap[`${nomor}-${ayahNumber}`];
  const toggleBookmarkAyah = async (ayahNumber) => {
    try {
      const colRaw = await AsyncStorage.getItem(CURRENT_COLLECTION_KEY);
      const col = colRaw || 'My Favorite';
      const raw = await AsyncStorage.getItem(BOOKMARK_KEY);
      let data = raw ? JSON.parse(raw) : null;
      if (Array.isArray(data)) {
        data = { collections: { [col]: data } };
      }
      if (!data || typeof data !== 'object') data = { collections: {} };
      if (!Array.isArray(data.collections[col])) data.collections[col] = [];

      const arr = data.collections[col];
      const idx = arr.findIndex((b) => b.nomorSurah === nomor && b.ayahNumber === ayahNumber);
      const metaNama = detail?.surat?.namaLatin || detail?.surat?.nama_latin || namaLatin || nama_latin || '';
      let nextArr;
      if (idx >= 0) {
        nextArr = [...arr.slice(0, idx), ...arr.slice(idx + 1)];
      } else {
        nextArr = [...arr, { nomorSurah: nomor, namaSurah: metaNama, ayahNumber, ts: Date.now(), collection: col }];
      }
      data.collections[col] = nextArr;
      await AsyncStorage.setItem(BOOKMARK_KEY, JSON.stringify(data));
      await loadBookmarks();
    } catch {}
  };

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

  // Auto scroll ke targetAyah setelah detail tersedia
  useEffect(() => {
    // Coerce ke Number: via hash/deep-link params datang sebagai string ("142")
    const targetAyah = Number(route?.params?.targetAyah);
    if (Number.isFinite(targetAyah) && targetAyah > 0 && detail?.ayat?.length > 0) {
      const idx = detail.ayat.findIndex((it) => (it?.nomorAyat != null ? it.nomorAyat : it?.nomor) === targetAyah);
      if (typeof idx === 'number' && idx >= 0) {
        setHighlightAyah(targetAyah);
        const jump = () => { try { flatListRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0.5 }); } catch (e) {} };
        // Dua percobaan: saat list siap & setelah layout jauh (target ayat bisa ribuan baris di bawah)
        const t1 = setTimeout(jump, 250);
        const t2 = setTimeout(jump, 900);
        return () => { clearTimeout(t1); clearTimeout(t2); };
      }
    }
  }, [detail, route?.params?.targetAyah]);
  // === Karaoke: hitung ayat & kata aktif dari posisi audio (detik) ===
  // Dipanggil dari dua sumber: event status player DAN polling berkala, agar
  // marking tetap bergerak walau event status tidak mengalir di sebagian platform.
  const updateKaraokeAt = (positionSec) => {
    if (!karaokeMode || !karaokeData || typeof positionSec !== 'number' || !Number.isFinite(positionSec)) return;
    const posMs = positionSec * 1000;
    const vts = karaokeData.verseTimings || [];
    let cur = null;
    for (const v of vts) {
      if (posMs >= v.timestamp_from) cur = v; else break;
    }
    if (!cur) cur = vts[0] || null;
    if (cur) {
      const newKey = cur.verse_key;
      const wPos = wordPosAt(cur, posMs);
      const keyChanged = newKey !== activeVerseKey;
      setActiveVerseKey(newKey);
      setActiveWordPos(wPos);
      if (keyChanged) {
        const ay = parseInt(String(newKey).split(':')[1], 10);
        const idx = detail?.ayat?.findIndex((it) => (it?.nomorAyat != null ? it.nomorAyat : it?.nomor) === ay);
        if (typeof idx === 'number' && idx >= 0 && displayMode !== 'mushaf') {
          // Batasi auto-scroll max 1x per 4 detik agar user tetap bisa menggulir manual
          const now = Date.now();
          if (now - lastAutoScrollAtRef.current > 4000) {
            lastAutoScrollAtRef.current = now;
            flatListRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0.5 });
          }
        }
        const metaNama = detail?.surat?.namaLatin || detail?.surat?.nama_latin || namaLatin || nama_latin || '';
        AsyncStorage.setItem('last_read', JSON.stringify({ nomor, namaLatin: metaNama, lastAyah: ay })).catch(() => {});
      }
    }
  };

  // Polling fallback posisi audio (400ms) — sumber kedua agar marking pasti bergerak
  useEffect(() => {
    if (!karaokeMode) return;
    const id = setInterval(() => {
      try {
        const t = typeof player.currentTime === 'number' ? player.currentTime : playerStatus.currentTime;
        updateKaraokeAt(t);
      } catch {}
    }, 400);
    return () => clearInterval(id);
  }, [karaokeMode, karaokeData, activeVerseKey, detail, displayMode, nomor]);

  // Sinkron flag isPlaying + akhir pemutaran.
  // Mode per-ayat: setelah ayat yang diputar selesai, audio BERHENTI (tidak lanjut ke ayat berikutnya).
  // Mode karaoke: bersihkan state saat audio satu surah selesai.
  useEffect(() => {
    if ('playing' in playerStatus) {
      setIsPlaying(!!playerStatus.playing);
    }
    // Progres wash-highlight ayat aktif mengikuti posisi audio
    if (
      playerStatus.playing &&
      playingAyahIndex != null &&
      typeof playerStatus.duration === 'number' && playerStatus.duration > 0 &&
      typeof playerStatus.currentTime === 'number'
    ) {
      const p = Math.min(1, Math.max(0, playerStatus.currentTime / playerStatus.duration));
      setPlayProgress((prev) => (Math.abs(prev - p) >= 0.01 ? Math.round(p * 100) / 100 : prev));
    }

    // Hanya relevan kalau memang ada pemutaran aktif (per-ayat atau karaoke).
    // Tanpa guard ini, sisa status audio lama bisa terbaca sebagai "selesai".
    if (playingAyahIndex == null && !karaokeMode) return;

    // Audio selesai (unit detik; toleransi 0.5s)
    const finished =
      playerStatus.didJustFinish === true ||
      (!playerStatus.playing &&
        typeof playerStatus.duration === 'number' &&
        typeof playerStatus.currentTime === 'number' &&
        playerStatus.duration > 0 &&
        playerStatus.currentTime >= playerStatus.duration - 0.5);

    if (!finished) {
      // Sedang diputar lagi -> siap menangani akhir pemutaran berikutnya
      finishHandledRef.current = false;
      return;
    }
    if (finishHandledRef.current) return; // sudah ditangani, jangan dobel
    finishHandledRef.current = true;

    // BERHENTI total: tidak ada auto-lanjut ke ayat berikutnya
    setPlayingAyahId(null);
    setPlayingAyahIndex(null);
    setIsPlaying(false);
    setPlayProgress(0);
    if (karaokeMode) {
      setKaraokeMode(false);
      setActiveVerseKey(null);
      setActiveWordPos(-1);
    }
    try { player.pause(); } catch {}
    try { player.seekTo(0); } catch {}
  }, [playerStatus.playing, playerStatus.didJustFinish, playerStatus.duration, detail?.ayat, playingAyahIndex, karaokeMode]);
  // Pakan utama marking karaoke: setiap event status player (tiap ~250ms),
  // hitung posisi ayat + kata aktif supaya marking bergerak mengikuti bacaan.
  useEffect(() => {
    if (!karaokeMode || typeof playerStatus.currentTime !== 'number') return;
    updateKaraokeAt(playerStatus.currentTime);
  }, [playerStatus.currentTime, playerStatus.playing, karaokeMode]);
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

  // === Reciter karaoke dimuat dari preferensi (dipilih di layar Pengaturan) ===
  // (Efek penyimpanan balik dihapus: setPreferredKaraokeReciter tidak di-import,
  //  dan reciter memang hanya diubah dari layar Pengaturan.)
  useEffect(() => {
    getPreferredKaraokeReciter()
      .then((id) => { if (id != null) setSelectedKaraokeReciterId(id); })
      .catch(() => {});
  }, []);

  // textScale tidak lagi disimpan di sini: modul appearance yang jadi satu sumber kebenaran
  // (skala tersimpan di AsyncStorage 'text_scale' — kunci yang sama dengan sebelumnya).

  // Muat & simpan preferensi mode tampil (dibagi dengan layar Halaman)
  useEffect(() => {
    AsyncStorage.getItem('pagedetail:displayMode')
      .then((m) => { if (m === 'mushaf' || m === 'ayat') setDisplayMode(m); })
      .catch(() => {});
  }, []);
  useEffect(() => {
    AsyncStorage.setItem('pagedetail:displayMode', displayMode).catch(() => {});
  }, [displayMode]);

  const increaseTextScale = () => {
    saveTextScale(textScale + 0.1);
  };
  const decreaseTextScale = () => {
    saveTextScale(textScale - 0.1);
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

  // === Mode Karaoke: satu MP3 per surah dari quran.com + timing per kata ===
  // reciterId: id reciter quran.com (default 7 = Mishary Al-`Afasy). Suara berubah saat reciter berubah.
  const startKaraoke = async (fromAyahIndex = 0, reciterId = selectedKaraokeReciterId) => {
    try {
      setKaraokeLoading(true);
      setKaraokeErr(null);
      finishHandledRef.current = false;
      // Gunakan cache yang ada; jika tidak ada atau reciter berbeda, fetch ulang
      const cached = karaokeData && karaokeData.reciterId === reciterId ? karaokeData : null;
      const data = cached || (await getKaraokeAudioData(Number(nomor), reciterId)); // offline dulu, baru online
      setKaraokeData(data);
      setKaraokeMode(true);
      // Karaoke tetap di mode tampil aktif — di mode Mushaf pun marking tetap jalan
      const startIdx = Math.max(0, Math.min(fromAyahIndex, data.verseTimings.length - 1));
      const timing = data.verseTimings[startIdx];
      setActiveVerseKey(timing.verse_key);
      setActiveWordPos(-1);
      setPlayingAyahIndex(null);
      setPlayingAyahId(null);
      setPlayProgress(0);
      await stopCurrent();
      player.replace({ uri: data.audioUrl });
      try { await player.seekTo(Math.max(0, timing.timestamp_from / 1000)); } catch (e) {}
      player.play();
      const ayNumber = parseInt(String(timing.verse_key).split(':')[1], 10);
      const idx = detail?.ayat?.findIndex((it) => (it?.nomorAyat != null ? it.nomorAyat : it?.nomor) === ayNumber);
      // Di mode Mushaf seluruh surah satu kartu — tidak perlu scroll
      if (typeof idx === 'number' && idx >= 0 && displayMode !== 'mushaf') {
        flatListRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0.5 });
      }
    } catch (e) {
      setKaraokeMode(false);
      setKaraokeErr('Audio Karaoke (quran.com) gagal dimuat. Periksa koneksi atau gunakan pemutar biasa.');
    } finally {
      setKaraokeLoading(false);
    }
  };

  const stopKaraoke = async () => {
    setKaraokeMode(false);
    setActiveVerseKey(null);
    setActiveWordPos(-1);
    try { player.pause(); } catch (e) {}
  };

  // Play/pause dari tombol melayang saat karaoke aktif (kedua mode tampil)
  const toggleKaraokePause = () => {
    try {
      if (playerStatus.playing) player.pause();
      else player.play();
    } catch (e) {}
  };

  // Ganti mode tampil; karaoke tetap berjalan di kedua mode (marking menyesuaikan)
  const switchMode = (m) => {
    setDisplayMode(m);
  };

  const playAyah = async (index) => {
    try {
      const url = getAyahAudioUrl(index);
      if (!url) return;
      finishHandledRef.current = false;
      await stopCurrent();
      player.replace({ uri: url });
      setPlayingAyahIndex(index);
      setPlayingAyahId(detail.ayat[index].id);
      setPlayProgress(0);
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
      } catch (e) {
        console.log('Audio error', e);
      }
    } catch (e) {
      // silent
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

  const shareAyah = async (ayahNumber, arabText, latinText, indoText) => {
    try {
      const title = `${detail?.namaLatin ?? detail?.nama_latin} - Ayat ${ayahNumber}`
      const message = `${title}\n\n${arabText || ''}\n${latinText || ''}\n${indoText || ''}`
      await Share.share({ title, message })
    } catch (e) {
      // silent
    }
  }

  // Mode mushaf: teks Arab mengalir per kata (bisa di-highlight saat karaoke)
  // + tanda akhir ayat (۝ + nomor Arab-Indic) sebagai pemisah antar ayat.
  const mushafWords = [];
  (detail?.ayat || []).forEach((a, i) => {
    const n = (a?.nomorAyat != null ? a.nomorAyat : (a?.nomor != null ? a.nomor : i + 1));
    const words = splitArabicWords(a?.teksArab ?? a?.teks_arab ?? '');
    words.forEach((w, wi) => {
      mushafWords.push({ ayat: n, pos: wi + 1, word: w });
    });
    mushafWords.push({ marker: true, ayat: n, text: `\u06DD${toArabicDigits(n)}` });
  });

  const renderItem = ({ item, index }) => {
    const isActive = index === playingAyahIndex;
    const hasAudio = !!getAyahAudioUrl(index);
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

    const isTargetHighlight = highlightAyah != null && ayahNumber === highlightAyah && !isActive;
    // Dark mode: permukaan kartu mengikuti palet; highlight aktif/tetap ungu lembut
    const ayahCardStyle = [styles.ayat, isActive && styles.ayatActive, isTargetHighlight && styles.ayatTargetHighlight];
    if (pal.dark) ayahCardStyle.push({ backgroundColor: pal.colors.surface });

    return (
      <View
        style={ayahCardStyle}
        onLayout={(e) => {
          const w = e?.nativeEvent?.layout?.width;
          if (w && w > 0 && rowWidth !== w) setRowWidth(w);
        }}
      >
        {/* Wash-highlight karaoke: sapuan lembut dari kanan ke kiri mengikuti posisi audio */}
        {isActive && rowWidth > 0 && (
          <View
            style={[styles.washHighlight, { width: Math.max(0, Math.min(rowWidth, rowWidth * playProgress)), pointerEvents: 'none' }]}
          />
        )}
        {/* Tafsir toggle dan konten tafsir tetap seperti sebelumnya */}
        {tafsirForAyah ? (
          <View style={styles.header}>
            <TouchableOpacity
              style={[
                styles.tafsirToggle,
                { backgroundColor: pal.colors.surface, borderWidth: 1, borderColor: pal.colors.surfaceBorder },
                isTafsirExpanded && { borderColor: pal.colors.primary },
              ]}
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
                      <Text style={[styles.tafsirContent, { fontSize: 14 * textScale, lineHeight: 20 * textScale }, pal.dark && { color: pal.colors.text }]}>{chunk}</Text>
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
        <View style={styles.ayatTopRow}>
          <View style={[styles.numberPill, { backgroundColor: pal.colors.primaryLight + '2e', borderColor: pal.colors.primaryLight }]}>
            <Text style={[styles.numberPillText, { color: pal.colors.primary }]}>{ayahNumber}</Text>
          </View>
          <View style={styles.actionRow}>
            <TouchableOpacity style={[styles.iconBtn, { backgroundColor: pal.colors.surface, borderColor: pal.colors.surfaceBorder }]} onPress={() => shareAyah(ayahNumber, arabText, latinText, indoText)}>
              <Ionicons name="share-social-outline" size={20} color={pal.colors.primary} />
            </TouchableOpacity>
            {hasAudio ? (
              <TouchableOpacity style={[styles.iconBtn, { backgroundColor: pal.colors.surface, borderColor: pal.colors.surfaceBorder }]} onPress={() => (karaokeMode ? startKaraoke(index) : (isActive ? togglePlayPause() : playAyah(index)))}>
                <Ionicons name={isActive && isPlaying ? 'pause-circle-outline' : 'play-circle-outline'} size={22} color={pal.colors.primary} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
        {arabText ? (
          karaokeMode && activeVerseKey === `${nomor}:${ayahNumber}` && karaokeData ? (
            (() => {
              const timing = findVerseTiming(karaokeData, Number(nomor), ayahNumber);
              const words = splitArabicWords(arabText);
              if (!timing || !words.length) {
                return <Text style={[styles.arab, { fontSize: 22 * textScale, lineHeight: 30 * textScale }, pal.dark && { color: pal.colors.text }]}>{arabText}</Text>;
              }
              return (
                <View style={styles.karaokeWrap}>
                  {words.map((w, wi) => (
                    <Text
                      key={`karaoke-word-${wi}`}
                      style={[
                        styles.karaokeWord,
                        { fontSize: 22 * textScale, lineHeight: 32 * textScale },
                        pal.dark && { color: pal.colors.text },
                        wi + 1 === activeWordPos && styles.karaokeWordActive,
                      ]}
                    >
                      {w}{' '}
                    </Text>
                  ))}
                </View>
              );
            })()
          ) : (
            <Text style={[styles.arab, { fontSize: 22 * textScale, lineHeight: 30 * textScale }, pal.dark && { color: pal.colors.text }]}>{arabText}</Text>
          )
        ) : null}
        {latinText ? <Text style={[styles.latin, { fontSize: 14 * textScale, lineHeight: 20 * textScale }, pal.dark && { color: pal.colors.muted }]}>{latinText}</Text> : null}
        {indoText ? <Text style={[styles.terjemahan, { fontSize: 14 * textScale, lineHeight: 20 * textScale }, pal.dark && { color: pal.colors.text }]}>{indoText}</Text> : null}
      </View>
    );
  };

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16 },
  header: { paddingBottom: 12, borderBottomWidth: 1, borderColor: '#eee', marginBottom: 12 },
  title: { fontSize: 20, fontWeight: '700' },
  meta: { color: '#666', marginTop: 4 },
  selectedQari: { marginTop: 4, color: '#0f766e', fontWeight: '600' },
  ayat: { marginBottom: 16, backgroundColor: '#fff', borderRadius: 12, padding: 12, elevation: 1 },
  qariSection: { marginTop: 8 },
  qariDropdownToggle: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', alignSelf: 'flex-start', backgroundColor: '#f1f5f9', flexDirection: 'row', alignItems: 'center', gap: 4 },
  voiceGroupLabel: { fontSize: 11, fontWeight: '800', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, paddingVertical: 8, paddingHorizontal: 4, backgroundColor: '#f9fafb' },
  voiceGroupEmpty: { fontSize: 12, color: '#9ca3af', paddingVertical: 6, paddingHorizontal: 12 },
  voiceGroupError: { fontSize: 12, color: '#b91c1c', paddingVertical: 6, paddingHorizontal: 12 },
  voiceGroupHint: { fontSize: 11, color: '#6b7280', padding: 10, backgroundColor: '#f5f3ff' },
  qariDropdownText: { color: '#0f766e', fontWeight: '600' },
  qariDropdown: { marginTop: 8, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, backgroundColor: '#fff', overflow: 'hidden' },
  qariOption: { paddingVertical: 8, paddingHorizontal: 12 },
  qariOptionActive: { backgroundColor: theme.colors.primary },
  qariOptionText: { color: '#333' },
  qariOptionTextActive: { color: '#fff', fontWeight: '600' },
  ayatNumber: { color: '#555', fontWeight: '600', marginBottom: 4 },
  arab: { fontSize: 22, textAlign: 'right', lineHeight: 30, fontFamily: 'NotoNaskhArabic' },
  latin: { color: '#444', marginTop: 8 },
  terjemahan: { color: '#222', marginTop: 4 },
  audioBtn: { marginTop: 8, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: theme.colors.primaryDark, alignSelf: 'flex-start' },
  audioText: { color: '#fff', fontWeight: '600' },
  tafsirBtn: { marginTop: 8, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#10b981', alignSelf: 'flex-start' },
  tafsirText: { color: '#fff', fontWeight: '600' },
  tafsirToggle: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#f1f5f9', alignSelf: 'flex-start', marginTop: 8 },
  tafsirToggleActive: { backgroundColor: '#ede9fe' },
  tafsirToggleText: { color: theme.colors.primary, fontWeight: '600' },
  tafsirToggleTextActive: { color: theme.colors.primaryDark, fontWeight: '700' },
  ayatActive: { backgroundColor: '#ede9fe', borderLeftWidth: 3, borderLeftColor: theme.colors.primaryLight, paddingLeft: 8, borderRadius: 8 },
  // Kartu target juz/bookmark sebelum diputar
  ayatTargetHighlight: { borderWidth: 2, borderColor: theme.colors.primary, backgroundColor: '#faf7ff' },
  // Sapuan karaoke: menempel di tepi kanan (RTL), lebar tumbuh mengikuti progres audio
  washHighlight: { position: 'absolute', top: 0, bottom: 0, right: 0, backgroundColor: 'rgba(139,92,246,0.16)', borderRadius: 12, overflow: 'hidden' },
  // Karaoke: teks Arab dipecah per kata, RTL (row-reverse agar kata pertama di kanan)
  karaokeWrap: { flexDirection: 'row-reverse', flexWrap: 'wrap' },
  karaokeWord: { fontFamily: 'NotoNaskhArabic', textAlign: 'right', color: '#111', paddingHorizontal: 2 },
  karaokeWordActive: { color: '#ffffff', backgroundColor: theme.colors.primary, borderRadius: 6, overflow: 'hidden' },
  karaokeBtn: { backgroundColor: '#6d28d9' },
  karaokeBtnActive: { backgroundColor: '#059669' },
  karaokeErr: { color: '#b91c1c', marginTop: 6, fontWeight: '600' },
  offlineAudioRow: { paddingHorizontal: 16, marginTop: 8 },
  offlineAudioBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10,
    backgroundColor: 'rgba(124,58,237,0.08)', borderWidth: 1, borderColor: 'rgba(124,58,237,0.25)',
  },
  offlineAudioProgressTrack: {
    height: 6, borderRadius: 3, backgroundColor: 'rgba(124,58,237,0.15)', overflow: 'hidden', marginBottom: 6,
  },
  offlineAudioProgressBar: { height: 6, borderRadius: 3, backgroundColor: theme.colors.primary },
  offlineAudioStatusText: { fontSize: 12, color: '#a5b4fc' },
  qariRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  qariChip: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 16, borderWidth: 1, borderColor: '#ddd', marginRight: 8, marginBottom: 8 },
  qariChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  qariChipText: { color: '#333' },
  qariChipTextActive: { color: '#fff', fontWeight: '600' },
  controlsRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  ctrlBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: theme.colors.primaryDark, marginRight: 8, marginBottom: 8, alignSelf: 'flex-start' },
  ctrlText: { color: '#fff', fontWeight: '600' },
  playAllBtn: { backgroundColor: theme.colors.primaryDark },
  stopBtn: { backgroundColor: '#ef4444' },
  tafsirNavRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  navBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: theme.colors.primaryDark, marginRight: 8, marginBottom: 8, alignSelf: 'flex-start' },
  navText: { color: '#fff', fontWeight: '600' },
  navTextDisabled: { color: '#94a3b8' },
  contextBox: { backgroundColor: '#f8fafc', padding: 8, borderRadius: 8, marginTop: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  contextLabel: { fontSize: 12, color: '#64748b', marginBottom: 4, fontWeight: '700' },
  tafsirContextText: { color: '#374151' },
  tafsirBox: { marginTop: 8, padding: 8, borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb' },
  tafsirContent: { color: '#111827' },
  pageNavRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  pageBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#f1f5f9' },
  pageBtnText: { color: theme.colors.primary, fontWeight: '600' },
  pageBtnTextDisabled: { color: '#94a3b8' },
  pageIndicator: { textAlign: 'center', color: '#64748b', marginTop: 4 },
  fontRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, alignItems: 'center' },
  fontBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#f1f5f9', marginRight: 8, marginBottom: 8, alignSelf: 'flex-start' },
  fontBtnText: { color: theme.colors.primary, fontWeight: '600' },
  fontInfo: { color: '#64748b', fontWeight: '600' },
  cacheBadge: { alignSelf: 'flex-start', backgroundColor: '#fef3c7', borderColor: '#fde68a', borderWidth: 1, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8, marginTop: 8 },
  cacheText: { color: '#92400e', fontWeight: '700' },
  headerCard: { borderRadius: 16, paddingVertical: 18, paddingHorizontal: 20, marginBottom: 12 },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
  headerSubtitle: { color: '#f5f3ff', marginTop: 4, fontSize: 14 },
  headerMeta: { color: '#ede9fe', marginTop: 6, fontWeight: '700' },
  basmalah: { color: '#fff', fontSize: 24, textAlign: 'center', marginTop: 12, fontFamily: 'NotoNaskhArabic' },
  ayatTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  numberPill: { backgroundColor: '#ede9fe', borderColor: '#ddd6fe', borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, minWidth: 32, alignItems: 'center' },
  numberPillText: { color: '#6B21A8', fontWeight: '800' },
  actionRow: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { padding: 8, marginLeft: 4, borderRadius: 999, backgroundColor: '#f5f3ff', borderWidth: 1, borderColor: '#ede9fe' },
  // Toggle mode tampil (Per Ayat / Mushaf) — konsisten dgn layar Halaman
  modeRow: { flexDirection: 'row', marginTop: 8, marginBottom: 4 },
  modeToggle: { flexDirection: 'row', backgroundColor: '#ede9fe', borderRadius: 10, padding: 2 },
  modeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 8 },
  modeBtnActive: { backgroundColor: theme.colors.primary },
  modeBtnText: { fontSize: 11, fontWeight: '800', color: theme.colors.primaryDark },
  modeBtnTextActive: { color: '#fff' },
  // Teks mengalir mode Mushaf: 3 blok terpisah (Arab → Arti → Cara baca)
  mushafCard: { paddingVertical: 16, paddingHorizontal: 16 },
  mushafSectionTitle: {
    fontSize: 12, fontWeight: '800', color: theme.colors.primaryDark,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10,
  },
  mushafListText: { color: '#1f2937', marginBottom: 8 },
  mushafListNum: { fontWeight: '800', color: theme.colors.primaryDark },
  arabMushafWord: {
    fontFamily: 'NotoNaskhArabic', color: '#111', paddingHorizontal: 2,
    borderRadius: 6,
  },
  mushafAyatActive: { color: theme.colors.primaryDark, backgroundColor: '#ede9fe' },
  arabMushafMarker: {
    fontFamily: 'NotoNaskhArabic', color: theme.colors.primary, paddingHorizontal: 2,
  },
  // Tombol play/pause melayang saat karaoke
  floatWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 18,
    alignItems: 'center',
  },
  floatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 26,
    borderRadius: 28,
    boxShadow: '0 4px 12px rgba(139, 92, 246, 0.45)',
    elevation: 6,
    gap: 8,
  },
  floatText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  // Dark mode: ganti gaya kartu tampilan Mushaf
  themeMobile: { flex: 1, backgroundColor: pal.colors.bg },
  // Gaya untuk tampilan list ayat (di luar renderMushaf)
  ayatList: { padding: 16 },
});
const stylesMobile = StyleSheet.create({
  // Kartu tunggal mode Mushaf: seluruh surah sebagai teks Arab mengalir
  mushafCard: { paddingVertical: 16, paddingHorizontal: 16 },
  mushafSectionTitle: {
    fontSize: 12, fontWeight: '800', color: theme.colors.primaryDark,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10,
  },
  mushafListText: { color: '#1f2937', marginBottom: 8 },
  mushafListNum: { fontWeight: '800', color: theme.colors.primaryDark },
  arabMushafWord: {
    fontFamily: 'NotoNaskhArabic', color: '#111', paddingHorizontal: 2,
    borderRadius: 6,
  },
  mushafAyatActive: { color: theme.colors.primaryDark, backgroundColor: '#ede9fe' },
  arabMushafMarker: {
    fontFamily: 'NotoNaskhArabic', color: theme.colors.primary, paddingHorizontal: 2,
  },
});
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Mode Mushaf: teks Arab mengalir dulu (lengkap), lalu Arti, lalu Cara baca —
  // blok terpisah agar nyaman dibaca. Saat karaoke: kata aktif ditandai di blok Arab.
  const renderMushaf = () => {
    return (
      <>
        <View style={[styles.ayat, styles.mushafCard, pal.dark && { backgroundColor: '#1a1130' }]}>
          <Text style={styles.mushafSectionTitle}>Teks Arab</Text>
          <View style={styles.karaokeWrap}>
            {mushafWords.map((w, i) => {
              if (w.marker) {
                return (
                  <Text key={`mk-${w.ayat}-${i}`} style={[styles.arabMushafMarker, { fontSize: 20 * textScale }]}>
                    {w.text}{' '}
                  </Text>
                );
              }
              const isAyatActive = activeVerseKey === `${nomor}:${w.ayat}`;
              const isWordActive = isAyatActive && w.pos === activeWordPos;
              return (
                <Text
                  key={`mw-${w.ayat}-${w.pos}-${i}`}
                  style={[
                    styles.arabMushafWord,
                    { fontSize: 22 * textScale, lineHeight: 42 * textScale },
                    pal.dark && { color: pal.colors.text },
                    isAyatActive && styles.mushafAyatActive,
                    isWordActive && styles.karaokeWordActive,
                  ]}
                >
                  {w.word}{' '}
                </Text>
              );
            })}
          </View>
        </View>
        <View style={[styles.ayat, styles.mushafCard, pal.dark && { backgroundColor: '#1a1130' }]}>
          <Text style={styles.mushafSectionTitle}>Arti</Text>
          {(detail?.ayat || []).map((a, i) => {
            const n = (a?.nomorAyat != null ? a.nomorAyat : (a?.nomor != null ? a.nomor : i + 1));
            const t = a?.teksIndonesia ?? a?.teks_terjemahan;
            if (!t) return null;
            return (
              <Text key={`arti-${n}`} style={[styles.mushafListText, { fontSize: 14 * textScale, lineHeight: 21 * textScale }, pal.dark && { color: pal.colors.text }]}>
                <Text style={styles.mushafListNum}>{n}. </Text>{t}
              </Text>
            );
          })}
        </View>
        <View style={[styles.ayat, styles.mushafCard, pal.dark && { backgroundColor: '#1a1130' }]}>
          <Text style={styles.mushafSectionTitle}>Cara baca</Text>
          {(detail?.ayat || []).map((a, i) => {
            const n = (a?.nomorAyat != null ? a.nomorAyat : (a?.nomor != null ? a.nomor : i + 1));
            const t = a?.teksLatin ?? a?.teks_latin;
            if (!t) return null;
            return (
              <Text key={`latin-${n}`} style={[styles.mushafListText, { fontSize: 14 * textScale, lineHeight: 21 * textScale }, pal.dark && { color: pal.colors.muted }]}>
                <Text style={styles.mushafListNum}>{n}. </Text>{t}
              </Text>
            );
          })}
        </View>
      </>
    );
  };

  return (
    <View style={{ flex: 1 }}>
    <FlatList
      ref={flatListRef}
      data={displayMode === 'mushaf' ? [{ __mushaf: true }] : detail?.ayat}
      keyExtractor={(item, index) => `${item?.id ?? item?.nomor ?? item?.nomorAyat ?? 'ayah'}-${index}`}
      renderItem={displayMode === 'mushaf' ? renderMushaf : renderItem}
    contentContainerStyle={styles.list}
    initialNumToRender={12}
    windowSize={10}
    removeClippedSubviews
    onScrollToIndexFailed={(info) => {
      // Pola robust: lompat kasar ke offset perkiraan dulu, lalu presisi setelah layout terukur
      try {
        const offset = info.averageItemLength * info.index;
        flatListRef.current?.scrollToOffset({ offset, animated: false });
      } catch (e) {}
      setTimeout(() => {
        try { flatListRef.current?.scrollToIndex({ index: info.index, animated: true, viewPosition: 0.5 }); } catch (e) {}
      }, 400);
    }}
    ListHeaderComponent={() => (
      <View>
        <LinearGradient
          colors={["#8B5CF6", "#A78BFA"]}
          start={[0, 0]}
          end={[1, 1]}
          style={styles.headerCard}
        >
          <Text style={styles.headerTitle}>{detail?.namaLatin ?? detail?.nama_latin}</Text>
          <Text style={styles.headerSubtitle}>{detail?.arti}</Text>
          <Text style={styles.headerMeta}>{`${(detail?.tempatTurun ?? detail?.tempat_turun)?.toUpperCase()} • ${(detail?.jumlahAyat ?? detail?.jumlah_ayat)} AYAT`}</Text>
          {nomor !== 9 ? (
            <Text style={styles.basmalah}>بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</Text>
          ) : null}
        </LinearGradient>

        <View style={styles.header}>
          {fromCacheDetail ? (
            <View style={styles.cacheBadge}><Text style={styles.cacheText}>Data dari Cache</Text></View>
          ) : null}
          {/* === Toggle mode tampil: Per Ayat / Mushaf (konsisten dgn layar Halaman) === */}
          <View style={styles.modeRow}>
            <View style={[styles.modeToggle, { backgroundColor: pal.colors.primaryLight + '2e' }]}>
              <TouchableOpacity
                style={[styles.modeBtn, displayMode !== 'mushaf' && styles.modeBtnActive]}
                onPress={() => switchMode('ayat')}
              >
                <Ionicons name="list" size={13} color={displayMode !== 'mushaf' ? '#fff' : pal.colors.primary} />
                <Text style={[styles.modeBtnText, { color: displayMode !== 'mushaf' ? '#fff' : pal.colors.primary }, displayMode !== 'mushaf' && styles.modeBtnTextActive]}>Per Ayat</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeBtn, displayMode === 'mushaf' && styles.modeBtnActive]}
                onPress={() => switchMode('mushaf')}
              >
                <Ionicons name="book" size={13} color={displayMode === 'mushaf' ? '#fff' : pal.colors.primary} />
                <Text style={[styles.modeBtnText, { color: displayMode === 'mushaf' ? '#fff' : pal.colors.primary }, displayMode === 'mushaf' && styles.modeBtnTextActive]}>Mushaf</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.controlsRow}>
            <TouchableOpacity
              style={[styles.ctrlBtn, styles.karaokeBtn, karaokeMode && styles.karaokeBtnActive]}
              onPress={() => (karaokeMode ? stopKaraoke() : startKaraoke(playingAyahIndex != null ? playingAyahIndex : 0))}
              disabled={karaokeLoading}
            >
              <Text style={styles.ctrlText}>{karaokeLoading ? 'Memuat Karaoke…' : karaokeMode ? 'Karaoke Aktif ✓' : 'Mode Karaoke'}</Text>
            </TouchableOpacity>
          </View>
          {/* Status audio offline (unduhan dikelola dari Pengaturan → Unduh Semua Audio) */}
          {audioOffline ? (
            <View style={styles.offlineAudioRow}>
              <View style={[styles.offlineAudioBtn, { opacity: 0.9 }]}>
                <Ionicons name="checkmark-circle" size={16} color="#4ade80" />
                <Text style={styles.offlineAudioStatusText}>Audio surah ini sudah diunduh</Text>
              </View>
            </View>
          ) : null}
          {!!karaokeErr && (
            <Text style={styles.karaokeErr}>{karaokeErr}</Text>
          )}
          <View style={styles.fontRow}>
            <TouchableOpacity style={[styles.fontBtn, { backgroundColor: pal.colors.surface, borderWidth: 1, borderColor: pal.colors.surfaceBorder }]} onPress={decreaseTextScale}>
              <Text style={[styles.fontBtnText, { color: pal.colors.primary }]}>A-</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.fontBtn, { backgroundColor: pal.colors.surface, borderWidth: 1, borderColor: pal.colors.surfaceBorder }]} onPress={increaseTextScale}>
              <Text style={[styles.fontBtnText, { color: pal.colors.primary }]}>A+</Text>
            </TouchableOpacity>
            <Text style={styles.fontInfo}>{`Ukuran: ${textScale.toFixed(1)}x`}</Text>
          </View>
          <TouchableOpacity style={styles.tafsirBtn} onPress={() => navigation.navigate('Tafsir', { nomor })}>
            <Text style={styles.tafsirText}>Lihat Tafsir</Text>
          </TouchableOpacity>
        </View>
      </View>
    )}
    />
    {/* Tombol play/pause melayang — tampil hanya saat Karaoke aktif */}
    {karaokeMode && (
      <View style={[styles.floatWrap, { pointerEvents: 'box-none' }]}>
        <TouchableOpacity
          style={styles.floatBtn}
          onPress={toggleKaraokePause}
          activeOpacity={0.85}
        >
          <Ionicons
            name={playerStatus.playing ? 'pause' : 'play'}
            size={26}
            color="#fff"
          />
          <Text style={styles.floatText}>
            {playerStatus.playing ? 'Jeda' : 'Lanjut'}
          </Text>
        </TouchableOpacity>
      </View>
    )}
    </View>
  );
}