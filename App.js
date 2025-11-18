import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, Image } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
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
import LLMChatScreen from './src/screens/LLMChatScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import LoginScreen from './src/screens/LoginScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';


// Minimal internal navigator for web preview tanpa react-navigation
export default function App() {
  const [initialResolved, setInitialResolved] = useState(false);
  const [stack, setStack] = useState([{ name: 'Home', params: null }]);
  const current = stack[stack.length - 1];

  useEffect(() => {
    (async () => {
      try {
        const done = await AsyncStorage.getItem('onboardingDone');
        const logged = await AsyncStorage.getItem('loggedIn');
        if (!done) {
          setStack([{ name: 'Onboarding', params: null }]);
        } else if (!logged) {
          setStack([{ name: 'Login', params: null }]);
        }
      } catch {}
      setInitialResolved(true);
    })();
  }, []);

  const navigation = useMemo(() => ({
    navigate: (name, params) => {
      setStack((s) => [...s, { name, params: params || null }]);
    },
    goBack: () => {
      setStack((s) => (s.length > 1 ? s.slice(0, s.length - 1) : s));
    },
    setOptions: () => {},
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

  if (!fontsLoaded || !initialResolved) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Memuat...</Text>
      </View>
    );
  }

  const Header = () => (
    <View style={styles.header}>
      {(() => {
        const topLevel = new Set(['Home', 'SurahList', 'DoaList', 'HaditsMenu', 'Settings']);
        const showBack = stack.length > 1 && !topLevel.has(current.name);
        if (showBack) {
          return (
            <TouchableOpacity onPress={navigation.goBack} style={styles.backBtn}>
              <Text style={styles.backText}>Kembali</Text>
            </TouchableOpacity>
          );
        }
        return (
          <LinearGradient colors={["#ede9fe","#f5f3ff"]} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.headerGradient}>
            <View style={{ width: 100 }} />
            <View style={styles.brandCenter}>
              <Image source={require('./assets/icon.png')} style={styles.headerLogo} resizeMode="contain" />
              <Text style={styles.headerTitle}>ALQURANKU</Text>
            </View>
            <View style={{ width: 100 }} />
          </LinearGradient>
        );
      })()}
    </View>
  );


  let ScreenEl = null;
  switch (current.name) {
    case 'Onboarding':
      ScreenEl = <OnboardingScreen navigation={navigation} />;
      break;
    case 'Login':
      ScreenEl = <LoginScreen navigation={navigation} />;
      break;
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
      // ScreenEl = <SholatJadwalScreen navigation={navigation} />;
      // Sembunyikan sementara fitur Jadwal Sholat
      ScreenEl = (
        <View style={styles.center}>
          <Text>Fitur Jadwal Sholat disembunyikan sementara.</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backLink}>
            <Text style={styles.backText2}>Kembali</Text>
          </TouchableOpacity>
        </View>
      );
      break;
    case 'HijriCalendar':
      ScreenEl = <HijriCalendarScreen navigation={navigation} />;
      break;
    case 'LLMChat':
      // Sembunyikan sementara Asisten LLM
      ScreenEl = (
        <View style={styles.center}>
          <Text>Fitur Asisten LLM disembunyikan sementara.</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backLink}>
            <Text style={styles.backText2}>Kembali</Text>
          </TouchableOpacity>
        </View>
      );
      break;
    case 'Settings':
      ScreenEl = <SettingsScreen navigation={navigation} />;
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

  const BottomNav = () => (
    <View style={styles.bottomNav}>
      <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Home')}>
        <FontAwesome5 name="home" size={18} color={current.name === 'Home' ? '#8b5cf6' : '#64748b'} />
        <Text style={[styles.navText, current.name !== 'Home' && { color: '#64748b' }]}>Home</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('SurahList')}>
        <FontAwesome5 name="book-open" size={18} color={current.name === 'SurahList' || current.name === 'SurahDetail' ? '#8b5cf6' : '#64748b'} />
        <Text style={[styles.navText, (current.name !== 'SurahList' && current.name !== 'SurahDetail') && { color: '#64748b' }]}>Surah</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('DoaList')}>
        <FontAwesome5 name="hands" size={18} color={current.name === 'DoaList' || current.name === 'DoaDetail' ? '#8b5cf6' : '#64748b'} />
        <Text style={[styles.navText, (current.name !== 'DoaList' && current.name !== 'DoaDetail') && { color: '#64748b' }]}>Doa</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('HaditsMenu')}>
        <FontAwesome5 name="scroll" size={18} color={current.name.startsWith('Hadits') ? '#8b5cf6' : '#64748b'} />
        <Text style={[styles.navText, (!current.name.startsWith('Hadits')) && { color: '#64748b' }]}>Hadits</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Settings')}>
        <FontAwesome5 name="cog" size={18} color={current.name === 'Settings' ? '#8b5cf6' : '#64748b'} />
        <Text style={[styles.navText, current.name !== 'Settings' && { color: '#64748b' }]}>Pengaturan</Text>
      </TouchableOpacity>
    </View>
  );

  const hideBottomNav = current.name === 'Onboarding' || current.name === 'Login';

  return (
    <SafeAreaProvider>
      <View style={styles.app}>
        <SafeAreaView edges={["top"]} style={styles.safeTop}>
          <StatusBar translucent={false} backgroundColor="#fafafa" barStyle="dark-content" />
          <Header />
        </SafeAreaView>
        <SafeAreaView edges={["bottom"]} style={styles.content}>
          <View style={{ flex: 1 }}>
            {ScreenEl}
          </View>
          {!hideBottomNav && <BottomNav />}
          {/* Footer dihapus untuk tampilan lebih bersih */}
        </SafeAreaView>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: '#fff' },
  header: { height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, borderBottomWidth: 1, borderColor: '#eee', backgroundColor: '#fafafa' },
  headerGradient: { flex: 1, height: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 8 },
  brandCenter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flex: 1 },
  headerLogo: { width: 28, height: 28, marginRight: 8 },
  backBtn: { width: 100, height: 40, justifyContent: 'center' },
  backText: { color: '#0ea5e9', fontWeight: '700' },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#111' },
  content: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  backLink: { marginTop: 12 },
  backText2: { color: '#0ea5e9' },
  safeTop: { backgroundColor: '#fafafa' },
  // add bottom nav styles
  bottomNav: { flexDirection: 'row', borderTopWidth: 1, borderColor: '#eee', backgroundColor: '#fafafa' },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, gap: 4 },
  navText: { color: '#0ea5e9', fontWeight: '700', fontSize: 12 },
});