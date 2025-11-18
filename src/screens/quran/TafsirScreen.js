import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions } from 'react-native';
import { getTafsir } from '../../api/quran';
import { theme } from '../../ui';

export default function TafsirScreen({ route }) {
  const { nomor } = route.params;
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  // Per-ayat tafsir state agar halaman tidak terlalu panjang
  const [tafsirList, setTafsirList] = useState([]);
  const [tafsirMap, setTafsirMap] = useState({});
  const [currentAyah, setCurrentAyah] = useState(1);
  const [fromCache, setFromCache] = useState(false);

  const { height: windowHeight } = useWindowDimensions();
  const contentMaxHeight = Math.max(280, Math.floor(windowHeight * 0.6));

  useEffect(() => {
    (async () => {
      try {
        const tafsir = await getTafsir(nomor);
        setData(tafsir);
        setFromCache(!!tafsir?.__fromCache);
        // Ekstrak daftar tafsir per ayat dari berbagai bentuk API (camelCase/snake_case atau nested)
        const list = Array.isArray(tafsir?.tafsir)
          ? tafsir.tafsir
          : Array.isArray(tafsir?.tafsir?.kemenag)
          ? tafsir.tafsir.kemenag
          : Array.isArray(tafsir?.tafsir?.id)
          ? tafsir.tafsir.id
          : null;
        if (Array.isArray(list)) {
          setTafsirList(list);
          const map = {};
          list.forEach((it) => {
            const a = it?.ayat;
            const t = it?.teks || it?.tafsir || it?.content || '';
            if (a != null && t) map[a] = t;
          });
          setTafsirMap(map);
          const firstAyah = list[0]?.ayat || 1;
          setCurrentAyah(firstAyah || 1);
        } else {
          setTafsirList([]);
          setTafsirMap({});
          setCurrentAyah(1);
        }
      } catch (e) {
        setError('Gagal memuat tafsir');
      } finally {
        setLoading(false);
      }
    })();
  }, [nomor]);

  const hasList = Array.isArray(tafsirList) && tafsirList.length > 0;
  const minAyah = hasList ? (tafsirList[0]?.ayat || 1) : 1;
  const maxAyah = hasList
    ? (tafsirList[tafsirList.length - 1]?.ayat || (data?.jumlah_ayat ?? data?.jumlahAyat ?? 0))
    : (data?.jumlah_ayat ?? data?.jumlahAyat ?? 0);

  const goPrev = () => {
    if (!hasList) return;
    setCurrentAyah((prev) => Math.max(prev - 1, minAyah));
  };
  const goNext = () => {
    if (!hasList) return;
    setCurrentAyah((prev) => Math.min(prev + 1, maxAyah || prev + 1));
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" /></View>;
  if (error) return <View style={styles.center}><Text>{error}</Text></View>;
  if (!data) return null;

  const surahLatin = data?.namaLatin ?? data?.nama_latin;
  const jumlahAyat = data?.jumlahAyat ?? data?.jumlah_ayat;
  const tempatTurun = data?.tempatTurun ?? data?.tempat_turun;
  const currentText = hasList ? tafsirMap[currentAyah] : (data?.tafsir || '');
  const prevText = hasList ? tafsirMap[currentAyah - 1] : null;
  const nextText = hasList ? tafsirMap[currentAyah + 1] : null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tafsir Surat {surahLatin} ({data?.nama})</Text>
      <Text style={styles.meta}>{data?.arti} • {jumlahAyat} ayat • {tempatTurun}</Text>

      {fromCache ? (
        <View style={styles.cacheBadge}><Text style={styles.cacheText}>Data dari Cache</Text></View>
      ) : null}

      {hasList ? (
        <View>
          <View style={styles.navRow}>
            <TouchableOpacity style={styles.navBtn} onPress={goPrev} disabled={currentAyah <= minAyah}>
              <Text style={[styles.navText, currentAyah <= minAyah && styles.navTextDisabled]}>Sebelumnya</Text>
            </TouchableOpacity>
            <Text style={styles.ayatLabel}>Ayat {currentAyah}</Text>
            <TouchableOpacity style={styles.navBtn} onPress={goNext} disabled={currentAyah >= maxAyah}>
              <Text style={[styles.navText, currentAyah >= maxAyah && styles.navTextDisabled]}>Berikutnya</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.contentBox}>
            <ScrollView style={{ maxHeight: contentMaxHeight }}>
              <Text style={styles.content}>{currentText}</Text>
              {prevText ? (
                <View style={styles.contextBox}>
                  <Text style={styles.contextLabel}>Sebelum</Text>
                  <Text style={styles.contextText}>{prevText}</Text>
                </View>
              ) : null}
              {nextText ? (
                <View style={styles.contextBox}>
                  <Text style={styles.contextLabel}>Sesudah</Text>
                  <Text style={styles.contextText}>{nextText}</Text>
                </View>
              ) : null}
            </ScrollView>
          </View>
        </View>
      ) : (
        data?.tafsir ? (
          <View style={styles.contentBox}>
            <ScrollView style={{ maxHeight: contentMaxHeight }}>
              <Text style={styles.content}>{data.tafsir}</Text>
            </ScrollView>
          </View>
        ) : null
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { padding: 16 },
  title: { fontSize: 18, fontWeight: '700' },
  meta: { color: '#666', marginTop: 4, marginBottom: 12 },
  content: { lineHeight: 22, color: '#222' },
  // Navigasi per ayat agar halaman pendek
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  navBtn: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: '#f1f5f9' },
  navText: { color: theme.colors.primary, fontWeight: '600' },
  navTextDisabled: { color: '#94a3b8' },
  ayatLabel: { fontSize: 16, fontWeight: '700', color: '#334155' },
  contentBox: { backgroundColor: '#fff', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  contextBox: { backgroundColor: '#f8fafc', padding: 8, borderRadius: 8, marginTop: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  contextLabel: { fontSize: 12, color: '#64748b', marginBottom: 4, fontWeight: '700' },
  contextText: { color: '#374151' },
  cacheBadge: { alignSelf: 'flex-start', backgroundColor: '#fef3c7', borderColor: '#fde68a', borderWidth: 1, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8, marginBottom: 8 },
  cacheText: { color: '#92400e', fontWeight: '700' },
});