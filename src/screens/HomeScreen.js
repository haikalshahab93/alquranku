import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';

function Card({ title, desc, onPress }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <Text style={styles.cardTitle}>{title}</Text>
      {!!desc && <Text style={styles.cardDesc}>{desc}</Text>}
    </TouchableOpacity>
  );
}

export default function HomeScreen({ navigation }) {
  const [logoSource, setLogoSource] = useState(require('../../assets/icon.png'));

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.brandRow}>
        <Image
          source={logoSource}
          style={styles.logo}
          resizeMode="contain"
          onError={() => setLogoSource(require('../../assets/adaptive-icon.png'))}
        />
        <View style={{ marginLeft: 12 }}>
          <Text style={styles.title}>ALQURANKU</Text>
          <Text style={styles.subtitle}>Akses cepat: Quran, Doa, dan Hadits</Text>
        </View>
      </View>

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
        {/* Jadwal Sholat disembunyikan sementara */}
        {/* <Card
          title="Jadwal Sholat"
          desc="Jadwal harian & bulanan"
          onPress={() => navigation.navigate('SholatJadwal')}
        /> */}
        <Card
          title="Kalender Hijriyah"
          desc="Konversi tanggal dan kalender"
          onPress={() => navigation.navigate('HijriCalendar')}
        />
        {/* Asisten LLM disembunyikan sementara */}
        {/* <Card
          title="Asisten LLM"
          desc="Tanya jawab surah, tafsir, doa, hadits (demo)"
          onPress={() => navigation.navigate('LLMChat')}
        /> */}
      </View>

      {/* Hapus footer yang sebelumnya dikomentari untuk mencegah kesalahan JSX */}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#f8fafc' },
  brandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  logo: { width: 48, height: 48, marginRight: 8 },
  title: { fontSize: 24, fontWeight: '800', color: '#111', textAlign: 'center' },
  subtitle: { color: '#64748b', marginTop: 4, marginBottom: 16, textAlign: 'center' },
  list: { flexDirection: 'column', gap: 14 },
  card: { padding: 16, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fff', borderRadius: 14, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#111' },
  cardDesc: { color: '#64748b', marginTop: 6 },
  footer: { marginTop: 24, alignItems: 'center' },
  footerText: { color: '#94a3b8', fontSize: 12 },
});