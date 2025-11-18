import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const BOOKMARK_KEY = 'quran_bookmarks';
const CURRENT_COLLECTION_KEY = 'quran_bookmarks_active_collection';

export default function QuranBookmarksScreen({ navigation }) {
  const [collections, setCollections] = useState({});
  const [activeCollection, setActiveCollection] = useState('My Favorite');

  const migrateIfNeeded = async () => {
    const raw = await AsyncStorage.getItem(BOOKMARK_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed)) {
      const colRaw = await AsyncStorage.getItem(CURRENT_COLLECTION_KEY);
      const col = colRaw || 'My Favorite';
      await AsyncStorage.setItem(BOOKMARK_KEY, JSON.stringify({ collections: { [col]: parsed } }));
    }
  };

  const load = async () => {
    try {
      await migrateIfNeeded();
      const colRaw = await AsyncStorage.getItem(CURRENT_COLLECTION_KEY);
      const col = colRaw || 'My Favorite';
      setActiveCollection(col);
      const raw = await AsyncStorage.getItem(BOOKMARK_KEY);
      const parsed = raw ? JSON.parse(raw) : { collections: {} };
      setCollections(parsed.collections || {});
    } catch {
      setCollections({});
    }
  };

  useEffect(() => { load(); }, []);

  const clearAll = async () => {
    try {
      await AsyncStorage.setItem(BOOKMARK_KEY, JSON.stringify({ collections: {} }));
      await load();
    } catch {}
  };

  const addCollection = async () => {
    try {
      const raw = await AsyncStorage.getItem(BOOKMARK_KEY);
      const parsed = raw ? JSON.parse(raw) : { collections: {} };
      const baseName = 'New Collection';
      let name = baseName;
      let i = 1;
      while (parsed.collections[name]) { name = `${baseName} ${i++}`; }
      parsed.collections[name] = [];
      await AsyncStorage.setItem(BOOKMARK_KEY, JSON.stringify(parsed));
      await AsyncStorage.setItem(CURRENT_COLLECTION_KEY, name);
      await load();
    } catch {}
  };

  const removeCollection = async (name) => {
    try {
      const raw = await AsyncStorage.getItem(BOOKMARK_KEY);
      const parsed = raw ? JSON.parse(raw) : { collections: {} };
      delete parsed.collections[name];
      await AsyncStorage.setItem(BOOKMARK_KEY, JSON.stringify(parsed));
      if (activeCollection === name) {
        const fallback = Object.keys(parsed.collections)[0] || 'My Favorite';
        await AsyncStorage.setItem(CURRENT_COLLECTION_KEY, fallback);
      }
      await load();
    } catch {}
  };

  const switchCollection = async (name) => {
    try {
      await AsyncStorage.setItem(CURRENT_COLLECTION_KEY, name);
      setActiveCollection(name);
      await load();
    } catch {}
  };

  const removeItem = async (item) => {
    try {
      const raw = await AsyncStorage.getItem(BOOKMARK_KEY);
      const parsed = raw ? JSON.parse(raw) : { collections: {} };
      const arr = parsed.collections[activeCollection] || [];
      const next = arr.filter((b) => !(b.nomorSurah === item.nomorSurah && b.ayahNumber === item.ayahNumber));
      parsed.collections[activeCollection] = next;
      await AsyncStorage.setItem(BOOKMARK_KEY, JSON.stringify(parsed));
      await load();
    } catch {}
  };

  const items = collections[activeCollection] || [];
  const sortedItems = Array.isArray(items) ? items.sort((a, b) => (b.ts || 0) - (a.ts || 0)) : [];

  const renderItem = ({ item }) => (
    <View style={styles.itemRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.itemTitle}>{item.namaSurah} • Ayat {item.ayahNumber}</Text>
        <Text style={styles.itemMeta}>Surah {item.nomorSurah}</Text>
      </View>
      <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('SurahDetail', { nomor: item.nomorSurah, targetAyah: item.ayahNumber })}>
        <Ionicons name="arrow-forward-circle-outline" size={22} color="#6B21A8" />
      </TouchableOpacity>
      <TouchableOpacity style={styles.iconBtn} onPress={() => removeItem(item)}>
        <Ionicons name="trash-outline" size={20} color="#EF4444" />
      </TouchableOpacity>
    </View>
  );

  const renderCollection = ({ item: name }) => (
    <TouchableOpacity style={[styles.collectionRow, activeCollection === name && styles.collectionActive]} onPress={() => switchCollection(name)}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Ionicons name="folder-outline" size={18} color="#6B21A8" style={{ marginRight: 8 }} />
        <Text style={styles.collectionTitle}>{name}</Text>
        <Text style={styles.collectionCount}> {Array.isArray(collections[name]) ? `${collections[name].length} items` : '0 items'}</Text>
      </View>
      <TouchableOpacity style={styles.iconBtn} onPress={() => removeCollection(name)}>
        <Ionicons name="ellipsis-vertical" size={16} color="#6B21A8" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.header}>Bookmarks</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity style={styles.headerIconBtn} onPress={addCollection}>
            <Ionicons name="add-circle-outline" size={22} color="#6B21A8" />
            <Text style={styles.headerIconText}>Add new collection</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.clearBtn} onPress={clearAll}>
            <Text style={styles.clearText}>Clear all</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={Object.keys(collections)}
        keyExtractor={(name) => name}
        renderItem={renderCollection}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 4 }}
        ListEmptyComponent={<Text style={{ textAlign: 'center', color: '#6B7280', padding: 12 }}>Belum ada koleksi</Text>}
      />

      <Text style={styles.groupHeader}>{activeCollection}</Text>
      <FlatList
        data={sortedItems}
        keyExtractor={(item, idx) => `${item.nomorSurah}-${item.ayahNumber}-${idx}`}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 12 }}
        ListEmptyComponent={<Text style={{ textAlign: 'center', color: '#6B7280' }}>Belum ada bookmark</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 16 },
  header: { fontSize: 20, fontWeight: '700', color: '#6B21A8' },
  headerIconBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 6, backgroundColor: '#F3E8FF', borderRadius: 8, marginRight: 8 },
  headerIconText: { marginLeft: 6, color: '#6B21A8', fontWeight: '600' },
  clearBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#F3E8FF', borderRadius: 8 },
  clearText: { color: '#6B21A8', fontWeight: '600' },
  sep: { height: 1, backgroundColor: '#E5E7EB' },
  groupHeader: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 6, fontSize: 14, fontWeight: '700', color: '#6B21A8' },
  collectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  collectionActive: { backgroundColor: '#faf5ff' },
  collectionTitle: { fontSize: 15, fontWeight: '600', color: '#111827' },
  collectionCount: { fontSize: 12, color: '#6B7280' },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  itemTitle: { fontSize: 16, fontWeight: '600', color: '#111827' },
  itemMeta: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  iconBtn: { paddingHorizontal: 6, paddingVertical: 6 },
});