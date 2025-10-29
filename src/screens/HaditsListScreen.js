import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { getHaditsArbainSemua } from '../api/hadits';

function normalizeArray(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.result)) return data.result;
  return [];
}

export default function HaditsListScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await getHaditsArbainSemua();
        const payload = res?.data ?? res;
        setItems(normalizeArray(payload));
      } catch (e) {
        setError(e?.message || 'Gagal memuat hadits');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => {
      const judul = String(it?.judul ?? it?.title ?? '').toLowerCase();
      const arab = String(it?.arab ?? it?.ar ?? it?.arabic ?? '').toLowerCase();
      const indo = String(it?.indo ?? it?.id ?? it?.indonesian ?? '').toLowerCase();
      const latin = String(it?.latin ?? it?.tr ?? '').toLowerCase();
      const perawi = String(it?.perawi ?? it?.rawi ?? it?.narrator ?? '').toLowerCase();
      return judul.includes(q) || arab.includes(q) || indo.includes(q) || latin.includes(q) || perawi.includes(q);
    });
  }, [items, query]);

  const renderItem = ({ item, index }) => {
    const nomor = item?.no ?? item?.nomor ?? (index + 1);
    const title = item?.judul ?? item?.title ?? `Hadits ${nomor}`;
    const perawi = item?.perawi ?? item?.rawi ?? item?.narrator ?? '';
    return (
      <TouchableOpacity style={styles.item} onPress={() => navigation.navigate('HaditsDetail', { nomor })}>
        <Text style={styles.itemTitle}>{title}</Text>
        {!!perawi && <Text style={styles.itemSubtitle}>Perawi: {perawi}</Text>}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Arba’in Nawawi</Text>
        <TouchableOpacity style={styles.randomBtn} onPress={() => navigation.navigate('HaditsDetail', { random: true })}>
          <Text style={styles.randomText}>Acak</Text>
        </TouchableOpacity>
      </View>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Cari hadits (judul/arab/indo/perawi)"
        placeholderTextColor="#64748b"
        style={styles.search}
      />
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" /></View>
      ) : error ? (
        <View style={styles.center}><Text>{error}</Text></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item, idx) => String(item?.no ?? item?.nomor ?? idx)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 12 },
  title: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  randomBtn: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  randomText: { color: '#0ea5e9', fontWeight: '700' },
  search: { margin: 16, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: '#0f172a', backgroundColor: '#fff' },
  list: { padding: 16 },
  item: { padding: 14, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, backgroundColor: '#fff', marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3 },
  itemTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  itemSubtitle: { color: '#64748b', marginTop: 4 },
});