import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Modal, TextInput, TouchableWithoutFeedback } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { getPalette } from '../../ui';
import { useAppearance } from '../../api/appearance';
import { useI18n } from '../../api/i18n';
import { markDirty } from '../../api/sync';

const BOOKMARK_KEY = 'quran_bookmarks';
const CURRENT_COLLECTION_KEY = 'quran_bookmarks_active_collection';

export default function QuranBookmarksScreen({ navigation }) {
  const { darkMode } = useAppearance();
  // Dwibahasa: header, label, dan pesan kosong mengikuti bahasa aktif.
  const { t } = useI18n();
  const pal = getPalette(darkMode);
  const [collections, setCollections] = useState({});
  const [activeCollection, setActiveCollection] = useState('My Favorite');
  // Menu titik 3 di baris koleksi: pilih Ubah Nama / Hapus — TIDAK langsung menghapus.
  const [optionsCol, setOptionsCol] = useState(null); // nama koleksi yang buka menu
  const [renameName, setRenameName] = useState(null); // koleksi yang sedang di-rename
  const [renameValue, setRenameValue] = useState('');

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
      markDirty('bookmarks');
      await load();
    } catch {}
  };

  const addCollection = async () => {
    try {
      const raw = await AsyncStorage.getItem(BOOKMARK_KEY);
      const parsed = raw ? JSON.parse(raw) : { collections: {} };
      const baseName = t('quran.newCollection');
      let name = baseName;
      let i = 1;
      while (parsed.collections[name]) { name = `${baseName} ${i++}`; }
      parsed.collections[name] = [];
      await AsyncStorage.setItem(BOOKMARK_KEY, JSON.stringify(parsed));
      await AsyncStorage.setItem(CURRENT_COLLECTION_KEY, name);
      markDirty('bookmarks');
      markDirty('active_collection');
      await load();
    } catch {}
  };

  const removeCollection = async (name) => {
    try {
      const raw = await AsyncStorage.getItem(BOOKMARK_KEY);
      const parsed = raw ? JSON.parse(raw) : { collections: {} };
      delete parsed.collections[name];
      await AsyncStorage.setItem(BOOKMARK_KEY, JSON.stringify(parsed));
      markDirty('bookmarks');
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
      markDirty('active_collection');
      setActiveCollection(name);
      await load();
    } catch {}
  };

  const renameCollection = async (oldName, rawNew) => {
    try {
      const newName = String(rawNew || '').trim();
      if (!newName || newName === oldName) { setRenameName(null); return; }
      const raw = await AsyncStorage.getItem(BOOKMARK_KEY);
      const parsed = raw ? JSON.parse(raw) : { collections: {} };
      if (!parsed.collections[oldName] || parsed.collections[newName]) { setRenameName(null); return; }
      parsed.collections[newName] = parsed.collections[oldName];
      delete parsed.collections[oldName];
      await AsyncStorage.setItem(BOOKMARK_KEY, JSON.stringify(parsed));
      markDirty('bookmarks');
      if (activeCollection === oldName) {
        await AsyncStorage.setItem(CURRENT_COLLECTION_KEY, newName);
        markDirty('active_collection');
      }
      await load();
    } catch {}
    setRenameName(null);
  };

  const removeItem = async (item) => {
    try {
      const raw = await AsyncStorage.getItem(BOOKMARK_KEY);
      const parsed = raw ? JSON.parse(raw) : { collections: {} };
      const arr = parsed.collections[activeCollection] || [];
      const next = arr.filter((b) => !(b.nomorSurah === item.nomorSurah && b.ayahNumber === item.ayahNumber));
      parsed.collections[activeCollection] = next;
      await AsyncStorage.setItem(BOOKMARK_KEY, JSON.stringify(parsed));
      markDirty('bookmarks');
      await load();
    } catch {}
  };

  const items = collections[activeCollection] || [];
  const sortedItems = Array.isArray(items) ? items.sort((a, b) => (b.ts || 0) - (a.ts || 0)) : [];

  const renderItem = ({ item }) => (
    <View style={styles.itemRow}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.itemTitle, { color: pal.colors.text }]}>{item.namaSurah} • {t('quran.verse', { n: item.ayahNumber })}</Text>
        <Text style={[styles.itemMeta, { color: pal.colors.muted }]}>{t('quran.surahN', { n: item.nomorSurah })}</Text>
      </View>
      <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('SurahDetail', { nomor: item.nomorSurah, targetAyah: item.ayahNumber })}>
        <Ionicons name="arrow-forward-circle-outline" size={22} color={pal.colors.primary} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.iconBtn} onPress={() => removeItem(item)}>
        <Ionicons name="trash-outline" size={20} color="#EF4444" />
      </TouchableOpacity>
    </View>
  );

  const renderCollection = ({ item: name }) => (
    <TouchableOpacity
      style={[
        styles.collectionRow,
        activeCollection === name && { backgroundColor: pal.colors.primaryLight + '22' },
        { borderBottomColor: pal.colors.surfaceBorder },
      ]}
      onPress={() => switchCollection(name)}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Ionicons name="folder-outline" size={18} color={pal.colors.primary} style={{ marginRight: 8 }} />
        <Text style={[styles.collectionTitle, { color: pal.colors.text }]}>{name}</Text>
        <Text style={[styles.collectionCount, { color: pal.colors.muted }]}> {t('quran.itemCount', { n: Array.isArray(collections[name]) ? collections[name].length : 0 })}</Text>
      </View>
      <TouchableOpacity style={styles.iconBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} onPress={() => setOptionsCol(name)}>
        <Ionicons name="ellipsis-vertical" size={16} color={pal.colors.primary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: pal.colors.bg }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.header, { color: pal.colors.primary }]}>{t('quran.bookmarks')}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity style={[styles.headerIconBtn, { backgroundColor: pal.colors.primaryLight + '22', borderColor: pal.colors.surfaceBorder }]} onPress={addCollection}>
            <Ionicons name="add-circle-outline" size={22} color={pal.colors.primary} />
            <Text style={[styles.headerIconText, { color: pal.colors.primary }]}>{t('quran.tambahKoleksi')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.clearBtn, { backgroundColor: pal.colors.primaryLight + '22' }]} onPress={clearAll}>
            <Text style={[styles.clearText, { color: pal.colors.primary }]}>{t('quran.clearAll')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={Object.keys(collections)}
        keyExtractor={(name) => name}
        renderItem={renderCollection}
        ItemSeparatorComponent={() => <View style={[styles.sep, { backgroundColor: pal.colors.surfaceBorder }]} />}
        contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 4 }}
        ListEmptyComponent={<Text style={{ textAlign: 'center', color: pal.colors.muted, padding: 12 }}>{t('quran.bukanadaKoleksi')}</Text>}
      />

      <Text style={[styles.groupHeader, { color: pal.colors.primary }]}>{activeCollection}</Text>
      <FlatList
        data={sortedItems}
        keyExtractor={(item, idx) => `${item.nomorSurah}-${item.ayahNumber}-${idx}`}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={[styles.sep, { backgroundColor: pal.colors.surfaceBorder }]} />}
        contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 12 }}
        ListEmptyComponent={<Text style={{ textAlign: 'center', color: pal.colors.muted }}>{t('quran.noBookmarks')}</Text>}
      />

      {/* Menu titik 3 per koleksi: Ubah Nama / Hapus / Batal */}
      <Modal visible={!!optionsCol} transparent animationType="fade" onRequestClose={() => setOptionsCol(null)}>
        <TouchableWithoutFeedback onPress={() => setOptionsCol(null)}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalCard, { backgroundColor: pal.colors.surface, borderColor: pal.colors.surfaceBorder }]}>
                <Text style={[styles.modalTitle, { color: pal.colors.text }]} numberOfLines={1}>{t('quran.collectionOptions')}{optionsCol ? ` — ${optionsCol}` : ''}</Text>
                <TouchableOpacity style={styles.menuItem} onPress={() => { const name = optionsCol; setOptionsCol(null); setRenameName(name); setRenameValue(name); }}>
                  <Ionicons name="pencil-outline" size={18} color={pal.colors.primary} style={{ marginRight: 10 }} />
                  <Text style={[styles.menuText, { color: pal.colors.text }]}>{t('quran.renameCollection')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuItem} onPress={() => { const name = optionsCol; setOptionsCol(null); removeCollection(name); }}>
                  <Ionicons name="trash-outline" size={18} color="#EF4444" style={{ marginRight: 10 }} />
                  <Text style={[styles.menuText, { color: '#EF4444' }]}>{t('quran.deleteCollection')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]} onPress={() => setOptionsCol(null)}>
                  <Ionicons name="close-outline" size={18} color={pal.colors.muted} style={{ marginRight: 10 }} />
                  <Text style={[styles.menuText, { color: pal.colors.muted }]}>{t('quran.batal')}</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Modal Ubah Nama koleksi */}
      <Modal visible={!!renameName} transparent animationType="fade" onRequestClose={() => setRenameName(null)}>
        <TouchableWithoutFeedback onPress={() => setRenameName(null)}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalCard, { backgroundColor: pal.colors.surface, borderColor: pal.colors.surfaceBorder }]}>
                <Text style={[styles.modalTitle, { color: pal.colors.text }]}>{t('quran.renameCollection')}</Text>
                <TextInput
                  style={[styles.nameInput, { color: pal.colors.text, borderColor: pal.colors.surfaceBorder, backgroundColor: pal.colors.bg }]}
                  value={renameValue}
                  onChangeText={setRenameValue}
                  placeholder={t('quran.namePlaceholder')}
                  placeholderTextColor={pal.colors.muted}
                  maxLength={60}
                  autoFocus
                />
                <View style={styles.modalBtnRow}>
                  <TouchableOpacity style={[styles.modalBtn, { borderColor: pal.colors.surfaceBorder }]} onPress={() => setRenameName(null)}>
                    <Text style={[styles.modalBtnText, { color: pal.colors.muted }]}>{t('quran.batal')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalBtn, { backgroundColor: pal.colors.primary, borderColor: pal.colors.primary }]} onPress={() => renameCollection(renameName, renameValue)}>
                    <Text style={[styles.modalBtnText, { color: '#FFFFFF' }]}>{t('quran.simpan')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 16 },
  header: { fontSize: 20, fontWeight: '700', color: '#6B21A8' },
  headerIconBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 6, backgroundColor: '#F3E8FF', borderRadius: 8, marginRight: 8, borderWidth: 1, borderColor: 'transparent' },
  headerIconText: { marginLeft: 6, color: '#6B21A8', fontWeight: '600' },
  clearBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#F3E8FF', borderRadius: 8 },
  clearText: { color: '#6B21A8', fontWeight: '600' },
  sep: { height: 1, backgroundColor: '#E5E7EB' },
  groupHeader: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 6, fontSize: 14, fontWeight: '700', color: '#6B21A8' },
  collectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  collectionTitle: { fontSize: 15, fontWeight: '600', color: '#111827' },
  collectionCount: { fontSize: 12, color: '#6B7280' },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  itemTitle: { fontSize: 16, fontWeight: '600', color: '#111827' },
  itemMeta: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  iconBtn: { paddingHorizontal: 6, paddingVertical: 6 },
  modalBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)', padding: 24 },
  modalCard: { width: '100%', maxWidth: 420, borderRadius: 12, borderWidth: 1, padding: 14 },
  modalTitle: { fontSize: 15, fontWeight: '700', marginBottom: 8 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1 },
  menuText: { fontSize: 15 },
  nameInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 15 },
  modalBtnRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 },
  modalBtn: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8, marginLeft: 8 },
  modalBtnText: { fontSize: 14, fontWeight: '600' },
});