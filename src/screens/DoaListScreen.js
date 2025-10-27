import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { getDoaList } from '../api/equran';

export default function DoaListScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [doa, setDoa] = useState([]);
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState('');
  const [grup, setGrup] = useState('');

  useEffect(() => {
    const fetchDoa = async () => {
      try {
        setLoading(true);
        const params = {};
        // Hanya kirim filter yang didukung API: grup dan tag
        if (tag) params.tag = tag;
        if (grup) params.grup = grup;
        const res = await getDoaList(params);
        setDoa(Array.isArray(res) ? res : (res?.data ?? []));
      } catch (e) {
        console.warn('Gagal memuat doa', e?.message);
      } finally {
        setLoading(false);
      }
    };
    fetchDoa();
  }, [tag, grup]);

  // Pencarian lokal berdasarkan nama/tr/idn
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return doa;
    return doa.filter((item) => {
      const nama = String(item?.nama ?? '').toLowerCase();
      const tr = String(item?.tr ?? '').toLowerCase();
      const idn = String(item?.idn ?? '').toLowerCase();
      return nama.includes(q) || tr.includes(q) || idn.includes(q);
    });
  }, [doa, query]);

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.item} onPress={() => navigation.navigate('DoaDetail', { id: item.id })}>
      <Text style={styles.itemTitle}>{item?.nama ?? 'Doa'}</Text>
      <Text style={styles.itemSubtitle}>{Array.isArray(item?.tag) ? item.tag.join(', ') : ''}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.filters}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Cari doa (nama/teks)..."
          placeholderTextColor="#333"
          style={styles.input}
        />
        <TextInput
          value={tag}
          onChangeText={setTag}
          placeholder="Tag (mis. tidur, malam)"
          placeholderTextColor="#333"
          style={styles.input}
        />
        <TextInput
          value={grup}
          onChangeText={setGrup}
          placeholder="Grup/kategori (mis. Doa Sebelum dan Sesudah Tidur)"
          placeholderTextColor="#333"
          style={styles.input}
        />
      </View>
      {loading ? (
        <View style={styles.center}><ActivityIndicator /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item, index) => `${item?.id ?? index}`}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  filters: { padding: 12, borderBottomWidth: 1, borderColor: '#eee' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 8, color: '#111' },
  list: { padding: 12 },
  item: { padding: 12, borderWidth: 1, borderColor: '#eee', borderRadius: 8, backgroundColor: '#fff', marginBottom: 10 },
  itemTitle: { fontSize: 16, fontWeight: '700', color: '#111' },
  itemSubtitle: { color: '#64748b', marginTop: 4 },
});