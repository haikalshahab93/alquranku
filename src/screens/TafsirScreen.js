import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, ScrollView } from 'react-native';
import { getTafsir } from '../api/equran';

export default function TafsirScreen({ route }) {
  const { nomor } = route.params;
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const tafsir = await getTafsir(nomor);
        setData(tafsir);
      } catch (e) {
        setError('Gagal memuat tafsir');
      } finally {
        setLoading(false);
      }
    })();
  }, [nomor]);

  const extractTafsirList = (d) => {
    if (!d) return null;
    if (Array.isArray(d?.tafsir)) return d.tafsir;
    if (Array.isArray(d?.tafsir?.kemenag)) return d.tafsir.kemenag;
    if (Array.isArray(d?.tafsir?.id)) return d.tafsir.id;
    return null;
  };

  const extractTafsirText = (d) => {
    if (!d) return null;
    if (typeof d?.tafsir === 'string') return d.tafsir;
    if (typeof d?.tafsir?.id === 'string') return d.tafsir.id;
    if (typeof d?.tafsir?.kemenag === 'string') return d.tafsir.kemenag;
    return null;
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" /></View>;
  if (error) return <View style={styles.center}><Text>{error}</Text></View>;
  if (!data) return <View style={styles.center}><Text>Data tafsir tidak ditemukan.</Text></View>;

  const tafsirList = extractTafsirList(data);
  const tafsirText = extractTafsirText(data);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Tafsir Surat {data.nama_latin} ({data.nama})</Text>
      <Text style={styles.meta}>{data.arti} • {data.jumlah_ayat} ayat • {data.tempat_turun}</Text>

      {Array.isArray(tafsirList) && tafsirList.length > 0 ? (
        <View>
          {tafsirList.map((item, idx) => (
            <View key={`tafsir-${item?.ayat ?? idx}`} style={styles.block}>
              {item?.ayat != null && (
                <Text style={styles.blockTitle}>Ayat {item.ayat}</Text>
              )}
              <Text style={styles.content}>{item?.teks || item?.tafsir || item?.content || ''}</Text>
            </View>
          ))}
        </View>
      ) : tafsirText ? (
        <Text style={styles.content}>{tafsirText}</Text>
      ) : (
        <Text style={styles.empty}>Tafsir belum tersedia untuk surat ini.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { padding: 16 },
  title: { fontSize: 18, fontWeight: '700' },
  meta: { color: '#666', marginTop: 4, marginBottom: 12 },
  content: { lineHeight: 22, color: '#222' },
  empty: { color: '#666', fontStyle: 'italic' },
  block: { marginBottom: 12 },
  blockTitle: { fontWeight: '700', marginBottom: 4 },
});