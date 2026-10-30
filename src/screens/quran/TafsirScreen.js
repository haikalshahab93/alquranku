import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions } from 'react-native';
import { getTafsir } from '../../api/quran';
import { theme } from '../../ui';
import { useTheme } from '../../ui';
import { useI18n } from '../../api/i18n';
import { TEXTS } from '../../api/i18nTexts';
import { useSurahTafsirEn } from '../../api/quranEn';

export default function TafsirScreen({ route }) {
  // Tema aktif (dark mode) + skala font terpusat
  const t = useTheme();
  // Dwibahasa: judul, meta, dan label navigasi mengikuti pilihan bahasa.
  // (variabel theme memakai nama `t`; untuk terjemahan dipakai alias `tr`)
  const { lang, t: tr } = useI18n();
  const placeLabel = (v) => {
    if (!v) return '';
    const entry = TEXTS[`surah.tempatTurun${v}`];
    return (entry && (entry[lang] ?? entry.id)) || v;
  };
  const pal = t;
  const ts = t.textScale || 1;

  const { nomor } = route.params;
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  // Per-ayat tafsir state agar halaman tidak terlalu panjang
  const [tafsirList, setTafsirList] = useState([]);
  const [tafsirMap, setTafsirMap] = useState({});
  const [currentAyah, setCurrentAyah] = useState(1);
  const [fromCache, setFromCache] = useState(false);

  // Tafsir EN (Ibn Kathir Abridged / Al-Jalalayn via spa5k CDN) hanya
  // dimuat saat bahasa efektif = English; null = pakai tafsir ID.
  const tafsirEn = useSurahTafsirEn(nomor, lang === 'en');

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
        setError(tr('surah.loadTafsirError'));
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

  if (loading) return <View style={[styles.center, { backgroundColor: pal.colors.bg }]}><ActivityIndicator size="large" color={pal.colors.primary} /></View>;
  if (error) return <View style={styles.center}><Text style={{ color: pal.colors.text }}>{error}</Text></View>;
  if (!data) return null;

  const surahLatin = data?.namaLatin ?? data?.nama_latin;
  const jumlahAyat = data?.jumlahAyat ?? data?.jumlah_ayat;
  const tempatTurun = data?.tempatTurun ?? data?.tempat_turun;
  const currentText = hasList ? tafsirMap[currentAyah] : (data?.tafsir || '');
  const prevText = hasList ? tafsirMap[currentAyah - 1] : null;
  const nextText = hasList ? tafsirMap[currentAyah + 1] : null;

  // Overlay EN: pakai teks EN bila tersedia untuk ayat itu (per-ayah),
  // fallback per-ayat ke ID agar tidak pernah ada ayat kosong.
  const withEn = (text, ayah) => {
    if (lang !== 'en' || !Array.isArray(tafsirEn)) return text;
    const en = tafsirEn[ayah - 1];
    return en ? en : text;
  };
  const showEnBadge = lang === 'en' && Array.isArray(tafsirEn) && tafsirEn.length > 0;

  return (
    <View style={[styles.container, { backgroundColor: pal.colors.bg, flex: 1 }]}>
      <Text style={[styles.title, { color: pal.colors.text }]}>{tr('surah.tafsirSurat', { surah: surahLatin, arab: data?.nama })}</Text>
      <Text style={[styles.meta, { color: pal.colors.muted }]}>{data?.arti} • {tr('surah.ayatCount', { n: jumlahAyat })} • {placeLabel(tempatTurun)}</Text>

      {showEnBadge ? (
        <Text style={styles.enSource} numberOfLines={2}>{tr('surah.tafsirEnSource')}</Text>
      ) : null}

      {fromCache ? (
        <View style={styles.cacheBadge}><Text style={styles.cacheText}>{tr('surah.dataDariCache')}</Text></View>
      ) : null}

      {hasList ? (
        <View>
          <View style={styles.navRow}>
            <TouchableOpacity style={[styles.navBtn, { backgroundColor: pal.dark ? pal.colors.surface : '#f1f5f9', borderWidth: 1, borderColor: pal.dark ? pal.colors.surfaceBorder : 'transparent' }]} onPress={goPrev} disabled={currentAyah <= minAyah}>
              <Text style={[styles.navText, currentAyah <= minAyah && styles.navTextDisabled]}>{tr('page.prev')}</Text>
            </TouchableOpacity>
            <Text style={[styles.ayatLabel, { color: pal.colors.text }]}>{tr('quran.verse', { n: currentAyah })}</Text>
            <TouchableOpacity style={[styles.navBtn, { backgroundColor: pal.dark ? pal.colors.surface : '#f1f5f9', borderWidth: 1, borderColor: pal.dark ? pal.colors.surfaceBorder : 'transparent' }]} onPress={goNext} disabled={currentAyah >= maxAyah}>
              <Text style={[styles.navText, currentAyah >= maxAyah && styles.navTextDisabled]}>{tr('page.next')}</Text>
            </TouchableOpacity>
          </View>          <View style={[styles.contentBox, { backgroundColor: pal.colors.surface, borderColor: pal.colors.surfaceBorder }]}>
            <ScrollView style={{ maxHeight: contentMaxHeight }}>
              <Text style={[styles.content, { fontSize: 15 * ts, lineHeight: 22 * ts }, pal.dark && { color: pal.colors.text }]}>{withEn(currentText, currentAyah)}</Text>
              {prevText ? (
                <View style={[styles.contextBox, pal.dark && { backgroundColor: '#241640', borderColor: pal.colors.surfaceBorder }]}>
                  <Text style={[styles.contextLabel, { color: pal.colors.muted }]}>{tr('quran.prev')}</Text>
                  <Text style={[styles.contextText, { color: pal.colors.muted }]}>{withEn(prevText, currentAyah - 1)}</Text>
                </View>
              ) : null}
              {nextText ? (
                <View style={[styles.contextBox, pal.dark && { backgroundColor: '#241640', borderColor: pal.colors.surfaceBorder }]}>
                  <Text style={[styles.contextLabel, { color: pal.colors.muted }]}>{tr('quran.next')}</Text>
                  <Text style={[styles.contextText, { color: pal.colors.muted }]}>{withEn(nextText, currentAyah + 1)}</Text>
                </View>
              ) : null}
            </ScrollView>
          </View>
        </View>
      ) : (
        data?.tafsir ? (
          <View style={[styles.contentBox, { backgroundColor: pal.colors.surface, borderColor: pal.colors.surfaceBorder }]}>
            <ScrollView style={{ maxHeight: contentMaxHeight }}>
              <Text style={[styles.content, { fontSize: 15 * ts, lineHeight: 22 * ts }, pal.dark && { color: pal.colors.text }]}>{data.tafsir}</Text>
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
  enSource: { fontSize: 11, color: '#94a3b8', marginBottom: 8, fontStyle: 'italic' },
});