import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, Image } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useFonts, Inter_400Regular, Inter_700Bold } from '@expo-google-fonts/inter';
import { NotoNaskhArabic_400Regular } from '@expo-google-fonts/noto-naskh-arabic';
import HomeScreen from './src/screens/HomeScreen';
import DoaListScreen from './src/screens/doa/DoaListScreen';
import DoaDetailScreen from './src/screens/doa/DoaDetailScreen';
import HaditsMenuScreen from './src/screens/hadits/HaditsMenuScreen';
import HaditsListScreen from './src/screens/hadits/HaditsListScreen';
import HaditsDetailScreen from './src/screens/hadits/HaditsDetailScreen';
import HaditsPerawiListScreen from './src/screens/hadits/HaditsPerawiListScreen';
import HaditsPerawiEntryScreen from './src/screens/hadits/HaditsPerawiEntryScreen';
import HaditsBmEntryScreen from './src/screens/hadits/HaditsBmEntryScreen';
import SholatJadwalScreen from './src/screens/sholat/SholatJadwalScreen';
import HijriCalendarScreen from './src/screens/calendar/HijriCalendarScreen';
import SurahListScreen from './src/screens/quran/SurahListScreen';
import SurahDetailScreen from './src/screens/quran/SurahDetailScreen';
import TafsirScreen from './src/screens/quran/TafsirScreen';
import LLMChatScreen from './src/screens/llm/LLMChatScreen';
import SettingsScreen from './src/screens/settings/SettingsScreen';
import OnboardingScreen from './src/screens/auth/OnboardingScreen';
import LoginScreen from './src/screens/auth/LoginScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import QiblaScreen from './src/screens/qibla/QiblaScreen';
import QuranBookmarksScreen from './src/screens/quran/QuranBookmarksScreen';
import UserScreen from './src/screens/auth/UserScreen';
import UlamaListScreen from './src/screens/ulama/UlamaListScreen'
import UlamaDetailScreen from './src/screens/ulama/UlamaDetailScreen'


// Minimal internal navigator for web preview tanpa react-navigation
export default function App() {
  const [initialResolved, setInitialResolved] = useState(false);
  const [stack, setStack] = useState([{ name: 'Home', params: null }]);
  const current = stack[stack.length - 1];
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const done = await AsyncStorage.getItem('onboardingDone');
        const logged = await AsyncStorage.getItem('loggedIn');
        if (!done) {
          setStack([{ name: 'Onboarding', params: null }]);
        } else {
          // Selalu langsung ke Home setelah onboarding selesai, tanpa menampilkan Login
          setStack([{ name: 'Home', params: null }]);
        }
        // Pastikan status login tersinkronisasi untuk menampilkan tab User dan layar User
        setIsLoggedIn(!!logged);
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
  
  // Sinkronkan isLoggedIn setiap ada perubahan stack (misal setelah Login berhasil)
  useEffect(() => {
    (async () => {
      try {
        const logged = await AsyncStorage.getItem('loggedIn');
        setIsLoggedIn(!!logged);
      } catch {}
    })();
  }, [stack]);

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

  // Update daftar halaman top-level untuk tombol back di header
  const Header = () => (
    <View style={styles.header}>
      {(() => {
        const topLevel = new Set(['Home', 'SurahList', 'QuranBookmarks', 'Settings', 'User']);
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
      // Sembunyikan layar Login sepenuhnya (bypass)
      ScreenEl = (
        <View style={styles.center}>
          <Text>Layar Login dibypass. Gunakan Home.</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Home')} style={styles.backLink}>
            <Text style={styles.backText2}>Ke Home</Text>
          </TouchableOpacity>
        </View>
      );
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
      ScreenEl = <SholatJadwalScreen navigation={navigation} />;
      break;
    case 'HijriCalendar':
      ScreenEl = <HijriCalendarScreen navigation={navigation} />;
      break;
    case 'UlamaList':
      ScreenEl = <UlamaListScreen navigation={navigation} />;
      break;
    case 'UlamaDetail':
      ScreenEl = <UlamaDetailScreen navigation={navigation} route={{ params: current.params }} />;
      break;
    case 'Qibla':
      ScreenEl = <QiblaScreen navigation={navigation} />;
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
    case 'QuranBookmarks':
      ScreenEl = <QuranBookmarksScreen navigation={navigation} />;
      break;
    case 'User':
      // Bypass login: selalu tampilkan UserScreen meskipun belum login
      ScreenEl = (<UserScreen navigation={navigation} />);
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

  // Bottom navigation: tambahkan Bookmark, hilangkan Doa & Hadits
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
      <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('QuranBookmarks')}>
        <FontAwesome5 name="bookmark" size={18} color={current.name === 'QuranBookmarks' ? '#8b5cf6' : '#64748b'} />
        <Text style={[styles.navText, current.name !== 'QuranBookmarks' && { color: '#64748b' }]}>Bookmark</Text>
      </TouchableOpacity>
      {isLoggedIn && (
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('User')}>
          <FontAwesome5 name="user" size={18} color={current.name === 'User' ? '#8b5cf6' : '#64748b'} />
          <Text style={[styles.navText, current.name !== 'User' && { color: '#64748b' }]}>User</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Settings')}>
        <FontAwesome5 name="cog" size={18} color={current.name === 'Settings' ? '#8b5cf6' : '#64748b'} />
        <Text style={[styles.navText, current.name !== 'Settings' && { color: '#64748b' }]}>Pengaturan</Text>
      </TouchableOpacity>
    </View>
  );

  const hideBottomNav = current.name === 'Onboarding';

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