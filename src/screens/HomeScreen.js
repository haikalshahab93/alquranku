import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { GradientCard, PurpleButton, OutlineLightButton, FeatureTile, theme } from '../ui';

function Card({ title, desc, onPress }) {
  return (
    <GradientCard title={title} desc={desc} onPress={onPress} />
  );
}

export default function HomeScreen({ navigation }) {
  const [logoSource, setLogoSource] = useState(require('../../assets/icon.png'));
  const [lastRead, setLastRead] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const s = await AsyncStorage.getItem('last_read');
        if (s) {
          const obj = JSON.parse(s);
          setLastRead(obj);
        }
      } catch (e) {
        // ignore
      }
    })();
  }, []);

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

      {lastRead && (
        <LinearGradient colors={[theme.colors.primary, theme.colors.primaryDark]} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.lastReadCard}>
          <Text style={styles.lastReadLabel}>Terakhir dibaca</Text>
          <Text style={styles.lastReadTitle}>{lastRead?.namaLatin || `Surah ${lastRead?.nomor}`}</Text>
          {!!lastRead?.lastAyah && (
            <Text style={styles.lastReadMeta}>Ayat {lastRead.lastAyah}</Text>
          )}
          <View style={{ flexDirection: 'row', marginTop: 10 }}>
            <PurpleButton
              label="Lanjutkan"
              onPress={() => navigation.navigate('SurahDetail', {
                nomor: lastRead?.nomor,
                nama_latin: lastRead?.namaLatin,
                namaLatin: lastRead?.namaLatin,
                lastAyah: lastRead?.lastAyah || 1,
              })}
              style={{ marginRight: 8 }}
            />
            <OutlineLightButton
              label="Reset"
              onPress={async () => {
                await AsyncStorage.removeItem('last_read');
                setLastRead(null);
              }}
            />
          </View>
        </LinearGradient>
      )}

      <View style={styles.list}>
        <FeatureTile
          title="Surah"
          icon="book-outline"
          onPress={() => navigation.navigate('SurahList')}
        />
        <FeatureTile
          title="Doa"
          icon="heart-outline"
          onPress={() => navigation.navigate('DoaList')}
        />
        <FeatureTile
          title="Hadits"
          icon="reader-outline"
          onPress={() => navigation.navigate('HaditsMenu')}
        />
        {/* Jadwal Sholat disembunyikan sementara */}
        {/* <FeatureTile title="Sholat" icon="time-outline" onPress={() => navigation.navigate('SholatJadwal')} /> */}
        <FeatureTile
          title="Hijriyah"
          icon="calendar-outline"
          onPress={() => navigation.navigate('HijriCalendar')}
        />
        <FeatureTile
          title="Kiblat"
          icon="compass-outline"
          onPress={() => navigation.navigate('Qibla')}
        />
        {/* Asisten LLM disembunyikan sementara */}
        {/* <FeatureTile title="Asisten" icon="chatbubble-ellipsis-outline" onPress={() => navigation.navigate('LLMChat')} /> */}
        {/* Pengaturan dihapus dari Home sesuai permintaan */}
      </View>

      {/* Footer disembunyikan */}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#f8fafc' },
  brandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  logo: { width: 48, height: 48, marginRight: 8 },
  title: { fontSize: 24, fontWeight: '800', color: '#111', textAlign: 'center' },
  subtitle: { color: '#64748b', marginTop: 4, marginBottom: 16, textAlign: 'center' },
  list: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' },
  card: { padding: 16, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fff', borderRadius: 14, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, marginBottom: 14 },
  cardBg: { padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#e9d5ff' },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#1f2937' },
  cardDesc: { color: '#6b7280', marginTop: 6 },
  footer: { marginTop: 24, alignItems: 'center' },
  footerText: { color: '#94a3b8', fontSize: 12 },
  lastReadCard: { borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#a78bfa' },
  lastReadLabel: { color: '#ffffff', fontWeight: '700' },
  lastReadTitle: { color: '#fff', fontSize: 18, fontWeight: '800', marginTop: 4 },
  lastReadMeta: { color: 'rgba(255,255,255,0.9)', marginTop: 6 },
  continueBtn: { backgroundColor: '#7c3aed', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12, marginRight: 8, borderWidth: 1, borderColor: '#a78bfa' },
  continueText: { color: '#fff', fontWeight: '700' },
  resetBtn: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)' },
  resetText: { color: '#fff', fontWeight: '700' },
});