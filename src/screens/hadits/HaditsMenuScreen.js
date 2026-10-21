import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { getPalette } from '../../ui';
import { useAppearance } from '../../api/appearance';

export default function HaditsMenuScreen({ navigation }) {
  const { darkMode } = useAppearance();
  const pal = getPalette(darkMode);
  return (
    <View style={[styles.container, { backgroundColor: pal.colors.bg }]}>
      <Text style={[styles.title, { color: pal.colors.text }]}>Koleksi Hadits</Text>
      <View style={styles.stack}>
        <TouchableOpacity style={[styles.card, { backgroundColor: pal.colors.surface, borderColor: pal.colors.surfaceBorder }]} onPress={() => navigation.navigate('HaditsList')}>
          <Text style={[styles.cardTitle, { color: pal.colors.text }]}>Arba’in Nawawi</Text>
          <Text style={[styles.cardDesc, { color: pal.colors.muted }]}>42 Hadits pilihan Imam Nawawi</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.card, { backgroundColor: pal.colors.surface, borderColor: pal.colors.surfaceBorder }]} onPress={() => navigation.navigate('HaditsBmEntry')}>
          <Text style={[styles.cardTitle, { color: pal.colors.text }]}>Bulughul Maram</Text>
          <Text style={[styles.cardDesc, { color: pal.colors.muted }]}>Cari berdasarkan nomor hadits</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.card, { backgroundColor: pal.colors.surface, borderColor: pal.colors.surfaceBorder }]} onPress={() => navigation.navigate('HaditsPerawiList')}>
          <Text style={[styles.cardTitle, { color: pal.colors.text }]}>Hadits 9 Perawi</Text>
          <Text style={[styles.cardDesc, { color: pal.colors.muted }]}>Pilih perawi, lalu masukkan nomor hadits</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  stack: { flexDirection: 'column' },
  card: { padding: 16, borderWidth: 1, borderRadius: 12, marginBottom: 12 },
  cardTitle: { fontSize: 18, fontWeight: '700' },
  cardDesc: { marginTop: 4 },
});
