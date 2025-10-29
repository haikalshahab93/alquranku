import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

function Card({ title, desc, onPress }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <Text style={styles.cardTitle}>{title}</Text>
      {!!desc && <Text style={styles.cardDesc}>{desc}</Text>}
    </TouchableOpacity>
  );
}

export default function HomeScreen({ navigation }) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Alquranku</Text>
      <Text style={styles.subtitle}>Akses cepat: Quran, Doa, dan Hadits</Text>

      <View style={styles.list}>
        <Card
          title="Daftar Surah"
          desc="Baca mushaf per surah"
          onPress={() => navigation.navigate('SurahList')}
        />
        <Card
          title="Daftar Doa"
          desc="Kumpulan doa harian lengkap"
          onPress={() => navigation.navigate('DoaList')}
        />
        <Card
          title="Koleksi Hadits"
          desc="Arba’in, Bulughul Maram, dan 9 Perawi"
          onPress={() => navigation.navigate('HaditsMenu')}
        />
        <Card
          title="Jadwal Sholat"
          desc="Jadwal harian & bulanan"
          onPress={() => navigation.navigate('SholatJadwal')}
        />
        <Card
          title="Kalender Hijriyah"
          desc="Konversi tanggal dan kalender"
          onPress={() => navigation.navigate('HijriCalendar')}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: '800', color: '#111' },
  subtitle: { color: '#64748b', marginTop: 4, marginBottom: 12 },
  list: { flexDirection: 'column', gap: 12 },
  card: { padding: 16, borderWidth: 1, borderColor: '#eee', backgroundColor: '#fff', borderRadius: 12 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#111' },
  cardDesc: { color: '#64748b', marginTop: 6 },
});