import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useFonts, Inter_400Regular, Inter_700Bold } from '@expo-google-fonts/inter';
import { NotoNaskhArabic_400Regular } from '@expo-google-fonts/noto-naskh-arabic';
import HomeScreen from './src/screens/HomeScreen';
import DoaListScreen from './src/screens/DoaListScreen';
import DoaDetailScreen from './src/screens/DoaDetailScreen';
import HaditsMenuScreen from './src/screens/HaditsMenuScreen';
import HaditsListScreen from './src/screens/HaditsListScreen';
import HaditsDetailScreen from './src/screens/HaditsDetailScreen';
import HaditsPerawiListScreen from './src/screens/HaditsPerawiListScreen';
import HaditsPerawiEntryScreen from './src/screens/HaditsPerawiEntryScreen';
import HaditsBmEntryScreen from './src/screens/HaditsBmEntryScreen';
import SholatJadwalScreen from './src/screens/SholatJadwalScreen';
import HijriCalendarScreen from './src/screens/HijriCalendarScreen';
import SurahListScreen from './src/screens/SurahListScreen';
import SurahDetailScreen from './src/screens/SurahDetailScreen';
import TafsirScreen from './src/screens/TafsirScreen';

// Minimal internal navigator for web preview tanpa react-navigation
export default function App() {
  const [stack, setStack] = useState([{ name: 'Home', params: null }]);
  const current = stack[stack.length - 1];

  // Pastikan urutan hooks konsisten: deklarasikan navigation terlebih dahulu
  const navigation = useMemo(() => ({
    navigate: (name, params) => {
      setStack((s) => [...s, { name, params: params || null }]);
    },
    goBack: () => {
      setStack((s) => (s.length > 1 ? s.slice(0, s.length - 1) : s));
    },
    setOptions: () => {}, // no-op untuk layar yang memanggil setOptions
  }), []);

  const [fontsLoaded] = useFonts({
    Inter: Inter_400Regular,
    'Inter-Bold': Inter_700Bold,
    NotoNaskhArabic: NotoNaskhArabic_400Regular,
  });

  // Tetapkan font default untuk seluruh Text
  if (fontsLoaded && (!Text.defaultProps || Text.defaultProps.style?.fontFamily !== 'Inter')) {
    Text.defaultProps = Text.defaultProps || {};
    Text.defaultProps.style = [Text.defaultProps.style || {}, { fontFamily: 'Inter' }];
  }

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Memuat font...</Text>
      </View>
    );
  }

  const Header = () => (
    <View style={styles.header}>
      {stack.length > 1 ? (
        <TouchableOpacity onPress={navigation.goBack} style={styles.backBtn}>
          <Text style={styles.backText}>Kembali</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.backBtn} />
      )}
      <Text style={styles.headerTitle} numberOfLines={1} ellipsizeMode="tail">{current.name}</Text>
      <View style={styles.backBtn} />
    </View>
  );

  let ScreenEl = null;
  switch (current.name) {
    case 'Home':
      ScreenEl = <HomeScreen navigation={navigation} />;
      break;
    case 'SurahList':
      ScreenEl = <SurahListScreen navigation={navigation} />;
      break;
    case 'SurahDetail':
      ScreenEl = <SurahDetailScreen navigation={navigation} route={{ params: current.params }} />;
      break;
    case 'Tafsir':
      ScreenEl = <TafsirScreen navigation={navigation} route={{ params: current.params }} />;
      break;
    case 'DoaList':
      ScreenEl = <DoaListScreen navigation={navigation} />;
      break;
    case 'DoaDetail':
      ScreenEl = <DoaDetailScreen navigation={navigation} route={{ params: current.params }} />;
      break;
    case 'HaditsMenu':
      ScreenEl = <HaditsMenuScreen navigation={navigation} />;
      break;
    case 'HaditsList':
      ScreenEl = <HaditsListScreen navigation={navigation} />;
      break;
    case 'HaditsDetail':
      ScreenEl = <HaditsDetailScreen navigation={navigation} route={{ params: current.params }} />;
      break;
    case 'HaditsPerawiList':
      ScreenEl = <HaditsPerawiListScreen navigation={navigation} />;
      break;
    case 'HaditsPerawiEntry':
      ScreenEl = <HaditsPerawiEntryScreen navigation={navigation} route={{ params: current.params }} />;
      break;
    case 'HaditsBmEntry':
      ScreenEl = <HaditsBmEntryScreen navigation={navigation} route={{ params: current.params }} />;
      break;
    case 'SholatJadwal':
      ScreenEl = <SholatJadwalScreen navigation={navigation} />;
      break;
    case 'HijriCalendar':
      ScreenEl = <HijriCalendarScreen navigation={navigation} />;
      break;
    default:
      ScreenEl = (
        <View style={styles.center}>
          <Text>Halaman "{current.name}" belum tersedia.</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backLink}>
            <Text style={styles.backText2}>Kembali</Text>
          </TouchableOpacity>
        </View>
      );
  }

  return (
    <View style={styles.app}>
      <Header />
      <View style={styles.content}>{ScreenEl}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: '#fff' },
  header: { height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, borderBottomWidth: 1, borderColor: '#eee', backgroundColor: '#fafafa' },
  backBtn: { width: 100, height: 40, justifyContent: 'center' },
  backText: { color: '#0ea5e9', fontWeight: '700' },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#111' },
  content: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  backLink: { marginTop: 12 },
  backText2: { color: '#0ea5e9' },
});