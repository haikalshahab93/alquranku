import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function HaditsMenuScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Koleksi Hadits</Text>
      <View style={styles.stack}>
        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('HaditsList')}>
          <Text style={styles.cardTitle}>Arba’in Nawawi</Text>
          <Text style={styles.cardDesc}>42 Hadits pilihan Imam Nawawi</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('HaditsBmEntry')}>
          <Text style={styles.cardTitle}>Bulughul Maram</Text>
          <Text style={styles.cardDesc}>Cari berdasarkan nomor atau lihat acak</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('HaditsPerawiList')}>
          <Text style={styles.cardTitle}>Hadits 9 Perawi</Text>
          <Text style={styles.cardDesc}>Pilih perawi, lalu masukkan nomor hadits</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  title: { fontSize: 20, fontWeight: '700', color: '#111', marginBottom: 12 },
  stack: { flexDirection: 'column' },
  card: { padding: 16, borderWidth: 1, borderColor: '#eee', borderRadius: 12, backgroundColor: '#fff', marginBottom: 12 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#111' },
  cardDesc: { color: '#64748b', marginTop: 4 },
});