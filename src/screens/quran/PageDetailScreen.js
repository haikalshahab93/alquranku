// Halaman mushaf (tab Page): menampilkan ayat-ayat yang berada pada satu
// halaman standar Madani (1-604), terurut sesuai urutan baca — termasuk
// ayat dari beberapa surah di halaman yang sama (umum di Juz 30).
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getPageVerses, getPagePairs, TOTAL_PAGES } from '../../api/mushafPages';

const MODE_KEY = 'pagedetail:displayMode';

// Nomor ayat dalam angka Arab-Indic untuk tanda akhir ayat mushaf (۝١)
const toArabicDigits = (n) => String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]);
import { theme, getPalette } from '../../ui';
import { useAppearance, setTextScale as saveTextScale } from '../../api/appearance';

export default function PageDetailScreen({ route, navigation }) {
  const initialPage = Math.min(
    Math.max(parseInt(route?.params?.page, 10) || 1, 1),
    TOTAL_PAGES
  );
  const [page, setPage] = useState(initialPage);
  const [verses, setVerses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // textScale terpusat dari pengaturan tampilan (sinkron dengan layar Pengaturan)
  const { textScale, darkMode } = useAppearance();
  const pal = getPalette(darkMode);
  const styles = makeStyles(pal);
  // 'ayat' = Arab + latin + terjemahan per ayat; 'mushaf' = teks Arab mengalir
  // penuh seperti mushaf cetak (tanpa terjemahan di antara ayat).
  const [displayMode, setDisplayMode] = useState('ayat');

  useEffect(() => {
    navigation?.setOptions?.({ title: `Halaman ${page}` });
  }, [page, navigation]);

  useEffect(() => {
    AsyncStorage.getItem(MODE_KEY)
      .then((m) => { if (m === 'mushaf' || m === 'ayat') setDisplayMode(m); })
      .catch(() => {});
  }, []);

  const switchMode = (m) => {
    setDisplayMode(m);
    AsyncStorage.setItem(MODE_KEY, m).catch(() => {});
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const v = await getPageVerses(page);
        if (!alive) return;
        if (!v.length) {
          setError(`Data halaman ${page} tidak tersedia.`);
        }
        setVerses(v);
      } catch (e) {
        if (!alive) return;
        setError('Gagal memuat halaman. Periksa koneksi lalu coba lagi.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [page]);

  const goPrev = () => setPage((p) => Math.max(1, p - 1));
  const goNext = () => setPage((p) => Math.min(TOTAL_PAGES, p + 1));

  // Render tiap ayat: header surah ditampilkan sekali saat surah berubah,
  // nomor ayat dalam lingkaran ornamental, Arab + latin + terjemahan.
  const rows = [];
  let lastSurah = null;
  verses.forEach((v, i) => {
    if (v.surah !== lastSurah) {
      rows.push(
        <View key={`h-${v.surah}-${i}`} style={styles.surahDivider}>
          <View style={styles.surahDividerLine} />
          <Text style={styles.surahDividerText}>{v.surahName}</Text>
          <View style={styles.surahDividerLine} />
        </View>
      );
      lastSurah = v.surah;
    }
    rows.push(
      <View key={`${v.surah}:${v.ayat}`} style={styles.ayahBlock}>
        <View style={styles.ayahTopRow}>
          <View style={styles.ayahNumBadge}>
            <Text style={styles.ayahNumText}>{v.ayat}</Text>
          </View>
          <Text style={styles.ayahMeta}>
            {v.surahName} : {v.ayat}
          </Text>
        </View>
        <Text style={[styles.arab, { fontSize: 22 * textScale, lineHeight: 34 * textScale }]}>
          {v.arab}
        </Text>
        {!!v.latin && (
          <Text style={[styles.latin, { fontSize: 13 * textScale }]}>
            {v.latin}
          </Text>
        )}
        {!!v.indo && (
          <Text style={[styles.indo, { fontSize: 13.5 * textScale }]}>
            {v.indo}
          </Text>
        )}
      </View>
    );
  });

  // Mode mushaf: kelompokkan ayat per surah, satukan teksnya dengan tanda
  // akhir ayat (۝ + nomor Arab-Indic) di antara ayat.
  const mushafSegments = [];
  let seg = null;
  verses.forEach((v) => {
    if (!seg || seg.surah !== v.surah) {
      seg = { surah: v.surah, surahName: v.surahName, parts: [] };
      mushafSegments.push(seg);
    }
    seg.parts.push(`${v.arab} \u06DD${toArabicDigits(v.ayat)}`);
  });

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header halaman: nomor besar + info + navigasi cepat */}
        <View style={styles.pageHead}>
          <View style={styles.pageBadge}>
            <Text style={styles.pageBadgeNum}>{page}</Text>
            <Text style={styles.pageBadgeLabel}>HALAMAN</Text>
          </View>
          <View style={styles.pageHeadInfo}>
            <Text style={styles.pageMeta}>
              {verses.length ? `${verses.length} ayat • ${verses[0].surahName}${verses.length > 1 && verses[verses.length - 1].surah !== verses[0].surah ? ` → ${verses[verses.length - 1].surahName}` : ''}` : 'Memuat…'}
            </Text>
            {/* Toggle mode tampil: per ayat vs mushaf (teks mengalir) */}
            <View style={styles.modeRow}>
              <View style={styles.modeToggle}>
                <TouchableOpacity
                  style={[styles.modeBtn, displayMode !== 'mushaf' && styles.modeBtnActive]}
                  onPress={() => switchMode('ayat')}
                >
                  <Ionicons name="list" size={13} color={displayMode !== 'mushaf' ? '#fff' : pal.colors.primary} />
                  <Text style={[styles.modeBtnText, displayMode !== 'mushaf' && styles.modeBtnTextActive]}>
                    Per Ayat
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modeBtn, displayMode === 'mushaf' && styles.modeBtnActive]}
                  onPress={() => switchMode('mushaf')}
                >
                  <Ionicons name="book" size={13} color={displayMode === 'mushaf' ? '#fff' : pal.colors.primary} />
                  <Text style={[styles.modeBtnText, displayMode === 'mushaf' && styles.modeBtnTextActive]}>
                    Mushaf
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.fontRow}>
              <TouchableOpacity style={styles.fontBtn} onPress={() => saveTextScale(textScale - 0.1)}>
                <Text style={styles.fontBtnText}>A-</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.fontBtn} onPress={() => saveTextScale(textScale + 0.1)}>
                <Text style={styles.fontBtnText}>A+</Text>
              </TouchableOpacity>
              <Text style={styles.fontInfo}>{`Ukuran: ${textScale.toFixed(1)}x`}</Text>
            </View>
          </View>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={styles.errText}>{error}</Text>
          </View>
        ) : displayMode === 'mushaf' ? (
          <>
            {/* Blok 1: teks Arab mengalir seperti mushaf cetak */}
            <View style={[styles.card, styles.cardMushaf]}>
              <Text style={styles.mushafSectionTitle}>Teks Arab</Text>
              {mushafSegments.map((seg2) => (
                <View key={`m-${seg2.surah}`}>
                  {mushafSegments.length > 1 && (
                    <View style={styles.surahDivider}>
                      <View style={styles.surahDividerLine} />
                      <Text style={styles.surahDividerText}>{seg2.surahName}</Text>
                      <View style={styles.surahDividerLine} />
                    </View>
                  )}
                  <Text
                    style={[styles.arabMushaf, { fontSize: 22 * textScale, lineHeight: 42 * textScale }]}
                  >
                    {seg2.parts.join(' ')}
                  </Text>
                </View>
              ))}
            </View>
            {/* Blok 2: Arti (terjemahan) per ayat */}
            <View style={[styles.card, styles.cardMushaf, { marginTop: 12 }]}>
              <Text style={styles.mushafSectionTitle}>Arti</Text>
              {verses.map((v) => (
                !!v.indo && (
                  <Text key={`arti-${v.surah}-${v.ayat}`} style={[styles.mushafListText, { fontSize: 13.5 * textScale, lineHeight: 20 * textScale }]}>
                    <Text style={styles.mushafListNum}>{v.surahName} {v.ayat}. </Text>{v.indo}
                  </Text>
                )
              ))}
            </View>
            {/* Blok 3: Cara baca (latin) per ayat */}
            <View style={[styles.card, styles.cardMushaf, { marginTop: 12 }]}>
              <Text style={styles.mushafSectionTitle}>Cara baca</Text>
              {verses.map((v) => (
                !!v.latin && (
                  <Text key={`latin-${v.surah}-${v.ayat}`} style={[styles.mushafListText, { fontSize: 13.5 * textScale, lineHeight: 20 * textScale }]}>
                    <Text style={styles.mushafListNum}>{v.surahName} {v.ayat}. </Text>{v.latin}
                  </Text>
                )
              ))}
            </View>
          </>
        ) : (
          <View style={styles.card}>{rows}</View>
        )}

        {/* Navigasi bawah: halaman sebelum/berikutnya */}
        <View style={styles.navRow}>
          <TouchableOpacity
            style={[styles.navBtn, page <= 1 && styles.navBtnDisabled]}
            onPress={goPrev}
            disabled={page <= 1}
          >
            <Ionicons name="chevron-back" size={16} color={page <= 1 ? pal.colors.muted : pal.colors.primary} />
            <Text style={[styles.navBtnText, page <= 1 && styles.navBtnTextDisabled]}>Sebelumnya</Text>
          </TouchableOpacity>
          <Text style={styles.navInfo}>{page} / {TOTAL_PAGES}</Text>
          <TouchableOpacity
            style={[styles.navBtn, page >= TOTAL_PAGES && styles.navBtnDisabled]}
            onPress={goNext}
            disabled={page >= TOTAL_PAGES}
          >
            <Text style={[styles.navBtnText, page >= TOTAL_PAGES && styles.navBtnTextDisabled]}>Berikutnya</Text>
            <Ionicons name="chevron-forward" size={16} color={page >= TOTAL_PAGES ? pal.colors.muted : pal.colors.primary} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const makeStyles = (pal) => StyleSheet.create({
  container: { flex: 1, backgroundColor: pal.colors.bg },
  scroll: { padding: 16, paddingBottom: 32 },
  center: { paddingVertical: 40, alignItems: 'center' },
  errText: { color: '#b91c1c', fontWeight: '600', textAlign: 'center' },
  // Header halaman
  pageHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  pageBadge: {
    width: 64, height: 64, borderRadius: 18, backgroundColor: theme.colors.primary,
    alignItems: 'center', justifyContent: 'center', ...theme.shadow.card,
  },
  pageBadgeNum: { color: '#fff', fontSize: 24, fontWeight: '800', lineHeight: 28 },
  pageBadgeLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 8, fontWeight: '800', letterSpacing: 1 },
  pageHeadInfo: { flex: 1, minWidth: 0 },
  pageMeta: { color: pal.colors.text, fontWeight: '700', fontSize: 13 },
  // Toggle mode tampil (per ayat vs mushaf)
  modeRow: { flexDirection: 'row', marginTop: 8 },
  modeToggle: {
    flexDirection: 'row', backgroundColor: pal.colors.primaryLight + '2e', borderRadius: 10, padding: 2,
  },
  modeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 5,
    paddingHorizontal: 10, borderRadius: 8,
  },
  modeBtnActive: { backgroundColor: theme.colors.primary },
  modeBtnText: { fontSize: 11, fontWeight: '800', color: theme.colors.primaryDark },
  modeBtnTextActive: { color: '#fff' },
  cardMushaf: { paddingVertical: 16, paddingHorizontal: 16 },
  mushafSectionTitle: {
    fontSize: 12, fontWeight: '800', color: pal.colors.primary,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10,
  },
  mushafListText: { color: pal.colors.text, marginBottom: 8 },
  mushafListNum: { fontWeight: '800', color: pal.colors.primary },
  arabMushaf: {
    color: pal.colors.text, textAlign: 'justify', fontFamily: 'NotoNaskhArabic',
    writingDirection: 'rtl',
  },
  fontRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  fontBtn: {
    paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8,
    borderWidth: 1, borderColor: pal.colors.surfaceBorder, backgroundColor: pal.colors.surface, marginRight: 8,
  },
  fontBtnText: { fontWeight: '700', color: theme.colors.primary },
  fontInfo: { color: pal.colors.muted, fontSize: 12 },
  // Kartu berisi ayat-ayat halaman
  card: {
    backgroundColor: pal.colors.surface, borderRadius: 16, borderWidth: 1, borderColor: pal.colors.surfaceBorder,
    padding: 14, ...theme.shadow.card,
  },
  surahDivider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 10 },
  surahDividerLine: { flex: 1, height: 1, backgroundColor: pal.colors.surfaceBorder },
  surahDividerText: { color: pal.colors.primary, fontWeight: '800', fontSize: 13 },
  ayahBlock: { marginBottom: 16 },
  ayahTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  ayahNumBadge: {
    minWidth: 30, height: 24, borderRadius: 12, backgroundColor: pal.colors.primaryLight + '2e',
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8,
    borderWidth: 1, borderColor: theme.colors.primaryLight,
  },
  ayahNumText: { color: pal.colors.primary, fontWeight: '800', fontSize: 12 },
  ayahMeta: { color: pal.colors.muted, fontSize: 11, fontWeight: '600' },
  arab: { color: pal.colors.text, textAlign: 'right', fontFamily: 'NotoNaskhArabic' },
  latin: { color: pal.colors.muted, marginTop: 6 },
  indo: { color: pal.colors.text, marginTop: 4 },
  // Navigasi bawah
  navRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 16,
  },
  navBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 10,
    paddingHorizontal: 14, borderRadius: 12, backgroundColor: pal.colors.surface,
    borderWidth: 1, borderColor: theme.colors.primaryLight,
  },
  navBtnDisabled: { opacity: 0.5 },
  navBtnText: { color: pal.colors.primary, fontWeight: '700' },
  navBtnTextDisabled: { color: '#94a3b8' },
  navInfo: { color: pal.colors.muted, fontWeight: '700' },
});
