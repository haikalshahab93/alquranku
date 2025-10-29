import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { 
  getHaditsArbainNomor, 
  getHaditsArbainAcak,
  getHaditsBmNomor,
  getHaditsBmAcak,
  getHaditsPerawiNomor,
  getHaditsPerawiAcak,
} from '../api/hadits';

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
  const { nomor, random, collection = 'arbain', slug } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [currentNomor, setCurrentNomor] = useState(nomor || null);
  const [totalMax, setTotalMax] = useState(null);
  const [perawiSlug, setPerawiSlug] = useState(slug || null);
  // Kontrol ukuran font (serasi dengan SurahDetail)
  const [textScale, setTextScale] = useState(1.0);
  const increaseTextScale = () => setTextScale((s) => Math.min(2, +(s + 0.1).toFixed(1)));
  const decreaseTextScale = () => setTextScale((s) => Math.max(0.8, +(s - 0.1).toFixed(1)));

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
          res = random ? await getHaditsBmAcak() : await getHaditsBmNomor(currentNomor || nomor);
        } else if (collection === 'perawi') {
          res = random ? await getHaditsPerawiAcak() : await getHaditsPerawiNomor(perawiSlug || slug, currentNomor || nomor);
        } else {
          // default: arbain
          res = random ? await getHaditsArbainAcak() : await getHaditsArbainNomor(currentNomor || nomor);
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
  }, [nomor, random, collection, slug, currentNomor, perawiSlug]);

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

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" /></View>;
  if (error) return <View style={styles.center}><Text>{error}</Text></View>;
  if (!data) return null;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.navRow}>
        <TouchableOpacity style={[styles.ctrlBtn, prevDisabled && styles.ctrlBtnDisabled]} onPress={goPrev} disabled={prevDisabled}>
          <Text style={[styles.ctrlText, prevDisabled && styles.ctrlTextDisabled]}>Sebelumnya</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.ctrlBtn, nextDisabled && styles.ctrlBtnDisabled]} onPress={goNext} disabled={nextDisabled}>
          <Text style={[styles.ctrlText, nextDisabled && styles.ctrlTextDisabled]}>Berikutnya</Text>
        </TouchableOpacity>
      </View>

      {/* Kontrol ukuran font (serasi dengan SurahDetail) */}
      <View style={styles.fontRow}>
        <TouchableOpacity style={styles.fontBtn} onPress={decreaseTextScale}>
          <Text style={styles.fontBtnText}>A-</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.fontBtn} onPress={increaseTextScale}>
          <Text style={styles.fontBtnText}>A+</Text>
        </TouchableOpacity>
        <Text style={styles.fontInfo}>{`Ukuran: ${textScale.toFixed(1)}x`}</Text>
      </View>

      <Text style={styles.title}>{data.judul || `Hadits ${data.nomor ?? ''}`}</Text>
      {!!data.perawi && <Text style={styles.perawi}>Perawi: {data.perawi}</Text>}
      {!!data.arab && <Text style={[styles.arab, { fontSize: 20 * textScale, lineHeight: 30 * textScale }]}>{data.arab}</Text>}
      {!!data.latin && <Text style={[styles.latin, { fontSize: 14 * textScale, lineHeight: 22 * textScale }]}>{data.latin}</Text>}
      {!!data.indo && <Text style={[styles.indo, { fontSize: 14 * textScale, lineHeight: 22 * textScale }]}>{data.indo}</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { padding: 16, backgroundColor: '#fff' },
  navRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, marginBottom: 12 },
  ctrlBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#0ea5e9', marginRight: 8, marginBottom: 8, alignSelf: 'flex-start' },
  ctrlBtnDisabled: { backgroundColor: '#e2e8f0' },
  ctrlText: { color: '#fff', fontWeight: '600' },
  ctrlTextDisabled: { color: '#64748b' },
  // Kontrol ukuran font (serasi dengan SurahDetail)
  fontRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  fontBtn: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', backgroundColor: '#f1f5f9', marginRight: 8 },
  fontBtnText: { fontWeight: '700', color: '#0ea5e9' },
  fontInfo: { color: '#64748b' },
  title: { fontSize: 20, fontWeight: '700', color: '#111' },
  perawi: { color: '#666', marginTop: 4 },
  arab: { marginTop: 12, color: '#111', textAlign: 'right', fontFamily: 'NotoNaskhArabic' },
  latin: { marginTop: 10, color: '#111' },
  indo: { marginTop: 10, color: '#111' },
});