import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function HomeScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pilih Konten</Text>
      <View style={styles.row}>
        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('SurahList')}>
          <Text style={styles.cardTitle}>Surat</Text>
          <Text style={styles.cardDesc}>Daftar surat Al-Qur'an</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('DoaList')}>
          <Text style={styles.cardTitle}>Doa</Text>
          <Text style={styles.cardDesc}>Kumpulan Doa & Dzikir</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  title: { fontSize: 20, fontWeight: '700', color: '#111', marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  card: { flex: 1, padding: 16, borderWidth: 1, borderColor: '#eee', borderRadius: 12, backgroundColor: '#fff', marginRight: 8 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#111' },
  cardDesc: { color: '#64748b', marginTop: 4 },
});