import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet, TouchableOpacity, Share, Platform } from 'react-native';
import { 
  getHaditsArbainNomor, 
  getHaditsBmNomor,
  getHaditsPerawiNomor,
} from '../../api/hadits';
import { theme, getPalette } from '../../ui';
import { useAppearance, setTextScale as saveTextScale } from '../../api/appearance';
import { Ionicons } from '@expo/vector-icons'

function pickFields(payload) {
  const p = payload?.data ?? payload;
  if (!p) return {};
  const nomor = p?.no ?? p?.nomor ?? p?.number ?? null;
  const judul = p?.judul ?? p?.title ?? '';
  let perawi = p?.perawi ?? p?.rawi ?? p?.narrator ?? '';
  if (!perawi) {
    perawi = payload?.info?.perawi?.name ?? payload?.info?.perawi?.nama ?? payload?.info?.perawi?.slug ?? '';
  }
  const arab = p?.arab ?? p?.ar ?? p?.arabic ?? '';
  const latin = p?.latin ?? p?.tr ?? '';
  const indo = p?.indo ?? p?.id ?? p?.indonesian ?? '';
  return { nomor, judul, perawi, arab, latin, indo };
}

export default function HaditsDetailScreen({ route, navigation }) {
  const { nomor, collection = 'arbain', slug } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [currentNomor, setCurrentNomor] = useState(nomor || null);
  const [totalMax, setTotalMax] = useState(null);
  const [perawiSlug, setPerawiSlug] = useState(slug || null);
  // Kontrol ukuran font (terpusat di pengaturan tampilan — sinkron dengan semua layar bacaan)
  const { darkMode, textScale } = useAppearance();
  const pal = getPalette(darkMode);
  const increaseTextScale = () => saveTextScale(textScale + 0.1);
  const decreaseTextScale = () => saveTextScale(textScale - 0.1);

  useEffect(() => {
    // Set judul halaman sesuai koleksi
    const titleMap = {
      arbain: 'Detail Hadits - Arba’in',
      bm: 'Detail Hadits - Bulughul Maram',
      perawi: 'Detail Hadits - 9 Perawi',
    };
    navigation?.setOptions?.({ title: titleMap[collection] || 'Detail Hadits' });
  }, [collection, navigation]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        let res;
        if (collection === 'bm') {
          res = await getHaditsBmNomor(currentNomor || nomor);
        } else if (collection === 'perawi') {
          res = await getHaditsPerawiNomor(perawiSlug || slug, currentNomor || nomor);
        } else {
          // default: arbain
          res = await getHaditsArbainNomor(currentNomor || nomor);
        }
        setData(pickFields(res));
        // Tetapkan nomor & batas maksimal sesuai koleksi
        const normalizedNomor = Number(res?.data?.number ?? res?.data?.nomor ?? res?.data?.no ?? currentNomor ?? nomor);
        setCurrentNomor(isNaN(normalizedNomor) ? null : normalizedNomor);
        if (collection === 'arbain') setTotalMax(42);
        else if (collection === 'bm') setTotalMax(1597);
        else if (collection === 'perawi') {
          const tot = Number(res?.info?.perawi?.total);
          setTotalMax(!isNaN(tot) && tot > 0 ? tot : null);
          const reqSlug = res?.request?.slug;
          if (reqSlug) setPerawiSlug(reqSlug);
        }
      } catch (e) {
        setError(e?.message || 'Gagal memuat hadits');
      } finally {
        setLoading(false);
      }
    })();
  }, [nomor, collection, slug, currentNomor, perawiSlug]);

  const fetchByNumber = async (target) => {
    try {
      setLoading(true);
      setError(null);
      let res;
      if (collection === 'bm') res = await getHaditsBmNomor(target);
      else if (collection === 'perawi') res = await getHaditsPerawiNomor(perawiSlug || slug, target);
      else res = await getHaditsArbainNomor(target);
      setData(pickFields(res));
      const normalizedNomor = Number(res?.data?.number ?? res?.data?.nomor ?? res?.data?.no ?? target);
      setCurrentNomor(isNaN(normalizedNomor) ? target : normalizedNomor);
      if (collection === 'arbain') setTotalMax(42);
      else if (collection === 'bm') setTotalMax(1597);
      else if (collection === 'perawi') {
        const tot = Number(res?.info?.perawi?.total);
        setTotalMax(!isNaN(tot) && tot > 0 ? tot : totalMax);
        const reqSlug = res?.request?.slug;
        if (reqSlug) setPerawiSlug(reqSlug);
      }
    } catch (e) {
      setError(e?.message || 'Gagal memuat hadits');
    } finally {
      setLoading(false);
    }
  };

  const minNum = 1;
  const maxNum = totalMax ?? (collection === 'arbain' ? 42 : collection === 'bm' ? 1597 : null);
  const prevDisabled = !currentNomor || currentNomor <= minNum;
  const nextDisabled = !currentNomor || !maxNum || currentNomor >= maxNum;

  const goPrev = async () => {
    if (prevDisabled) return;
    const target = Math.max(minNum, (currentNomor || minNum) - 1);
    await fetchByNumber(target);
  };

  const goNext = async () => {
    if (nextDisabled) return;
    const target = Math.min(maxNum || (currentNomor || minNum), (currentNomor || minNum) + 1);
    await fetchByNumber(target);
  };

  // Navigasi keyboard di web: ArrowLeft = sebelumnya, ArrowRight = berikutnya
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handler = (e) => {
      const key = e?.key;
      if (key === 'ArrowLeft') {
        if (!prevDisabled) goPrev();
      } else if (key === 'ArrowRight') {
        if (!nextDisabled) goNext();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [prevDisabled, nextDisabled, currentNomor, totalMax, perawiSlug]);

  const shareHadits = async () => {
    try {
      const judul = data?.judul || `Hadits ${data?.nomor ?? ''}`;
      const msg = `${judul}${data?.perawi ? `\nPerawi: ${data.perawi}` : ''}\n\n${data?.arab ?? ''}\n\n${data?.latin ?? ''}\n\n${data?.indo ?? ''}`;
      await Share.share({ message: msg });
    } catch (e) {
      // Share dibatalkan pengguna: tidak perlu ditampilkan sebagai error.
    }
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
        <Text style={[styles.errorText, { color: pal.colors.muted }]}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: pal.colors.bg }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerRow}>
          <View style={[styles.numberPill, { backgroundColor: pal.colors.primaryLight + '33', borderColor: pal.colors.primaryLight }]}>
            <Text style={[styles.numberPillText, { color: pal.colors.primary }]}>
              Hadits {currentNomor ?? data?.nomor ?? '-'}
            </Text>
          </View>
          {!!(data?.perawi || perawiSlug) && (
            <Text style={[styles.perawiText, { color: pal.colors.muted }]} numberOfLines={2}>
              {data?.perawi || perawiSlug}
            </Text>
          )}
        </View>

        {!!data?.judul && (
          <Text style={[styles.judul, { color: pal.colors.text, fontSize: 18 * textScale }]}>
            {data.judul}
          </Text>
        )}

        {!!data?.arab && (
          <View style={[styles.card, { backgroundColor: pal.colors.surface, borderColor: pal.colors.surfaceBorder }]}>
            <Text style={[styles.arab, { color: pal.colors.text, fontSize: 24 * textScale }]}>
              {data.arab}
            </Text>
          </View>
        )}

        {!!data?.latin && (
          <View style={[styles.card, { backgroundColor: pal.colors.surface, borderColor: pal.colors.surfaceBorder }]}>
            <Text style={[styles.sectionLabel, { color: pal.colors.muted }]}>Latin</Text>
            <Text style={[styles.body, { color: pal.colors.text, fontSize: 15 * textScale }]}>
              {data.latin}
            </Text>
          </View>
        )}

        {!!data?.indo && (
          <View style={[styles.card, { backgroundColor: pal.colors.surface, borderColor: pal.colors.surfaceBorder }]}>
            <Text style={[styles.sectionLabel, { color: pal.colors.muted }]}>Terjemahan</Text>
            <Text style={[styles.body, { color: pal.colors.text, fontSize: 15 * textScale }]}>
              {data.indo}
            </Text>
          </View>
        )}

        {!data?.arab && !data?.latin && !data?.indo && (
          <Text style={[styles.body, { color: pal.colors.muted }]}>Isi hadits tidak tersedia.</Text>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <View style={[styles.actionRow, { backgroundColor: pal.colors.surface, borderColor: pal.colors.surfaceBorder }]}>
        <TouchableOpacity style={styles.iconBtn} onPress={decreaseTextScale} accessibilityLabel="Perkecil teks">
          <Text style={[styles.fontBtnText, { color: pal.colors.text }]}>A-</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn} onPress={increaseTextScale} accessibilityLabel="Perbesar teks">
          <Text style={[styles.fontBtnText, { color: pal.colors.text }]}>A+</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn} onPress={shareHadits} accessibilityLabel="Bagikan hadits">
          <Ionicons name="share-social-outline" size={20} color={pal.colors.text} />
        </TouchableOpacity>

        <View style={styles.flexSpacer} />

        <TouchableOpacity
          style={[styles.navBtn, prevDisabled && styles.navBtnDisabled]}
          onPress={goPrev}
          disabled={prevDisabled}
          accessibilityLabel="Hadits sebelumnya"
        >
          <Ionicons name="chevron-back" size={16} color={prevDisabled ? pal.colors.muted : pal.colors.primary} />
          <Text style={[styles.navBtnText, { color: prevDisabled ? pal.colors.muted : pal.colors.primary }]}>
            Sebelumnya
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navBtn, nextDisabled && styles.navBtnDisabled]}
          onPress={goNext}
          disabled={nextDisabled}
          accessibilityLabel="Hadits berikutnya"
        >
          <Text style={[styles.navBtnText, { color: nextDisabled ? pal.colors.muted : pal.colors.primary }]}>
            Berikutnya
          </Text>
          <Ionicons name="chevron-forward" size={16} color={nextDisabled ? pal.colors.muted : pal.colors.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText: { textAlign: 'center' },
  scrollContent: { padding: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  numberPill: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, marginRight: 10 },
  numberPillText: { fontWeight: '700', fontSize: 13 },
  perawiText: { flex: 1, fontSize: 13 },
  judul: { fontWeight: '700', marginBottom: 12 },
  card: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 12 },
  sectionLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 },
  arab: { textAlign: 'right', lineHeight: 44 },
  body: { lineHeight: 24 },
  bottomSpacer: { height: 16 },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  iconBtn: { paddingHorizontal: 9, paddingVertical: 6 },
  fontBtnText: { fontSize: 14, fontWeight: '700' },
  flexSpacer: { flex: 1 },
  navBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8 },
  navBtnDisabled: { opacity: 0.5 },
  navBtnText: { fontSize: 13, fontWeight: '700' },
});
