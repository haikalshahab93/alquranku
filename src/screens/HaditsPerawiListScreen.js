import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, StyleSheet } from 'react-native';
import { getHaditsPerawiList } from '../api/hadits';

export default function HaditsPerawiListScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [items, setItems] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await getHaditsPerawiList();
        const payload = res?.data ?? res;
        const arr = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [];
        setItems(arr);
      } catch (e) {
        setError(e?.message || 'Gagal memuat perawi');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const renderItem = ({ item }) => {
    const name = item?.nama ?? item?.name ?? '';
    const slug = item?.slug ?? item?.id ?? '';
    return (
      <TouchableOpacity style={styles.item} onPress={() => navigation.navigate('HaditsPerawiEntry', { slug, name })}>
        <Text style={styles.itemTitle}>{name}</Text>
        <Text style={styles.itemSubtitle}>{slug}</Text>
      </TouchableOpacity>
    );
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" /></View>;
  if (error) return <View style={styles.center}><Text>{error}</Text></View>;

  return (
    <FlatList data={items} keyExtractor={(item, idx) => String(item?.slug ?? idx)} renderItem={renderItem} contentContainerStyle={styles.list} />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16 },
  item: { padding: 12, borderWidth: 1, borderColor: '#eee', borderRadius: 10, backgroundColor: '#fff', marginBottom: 10 },
  itemTitle: { fontSize: 16, fontWeight: '700', color: '#111' },
  itemSubtitle: { color: '#64748b', marginTop: 4 },
});