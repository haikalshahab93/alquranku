import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, Image, BackHandler, Platform } from 'react-native';
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
import PageDetailScreen from './src/screens/quran/PageDetailScreen';
import TafsirScreen from './src/screens/quran/TafsirScreen';
import LLMChatScreen from './src/screens/llm/LLMChatScreen';
import SettingsScreen from './src/screens/settings/SettingsScreen';
import OnboardingScreen from './src/screens/auth/OnboardingScreen';
import LoginScreen from './src/screens/auth/LoginScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import QiblaScreen from './src/screens/qibla/QiblaScreen';
import QuranBookmarksScreen from './src/screens/quran/QuranBookmarksScreen';
import UserScreen from './src/screens/auth/UserScreen';
import UlamaListScreen from './src/screens/ulama/UlamaListScreen';
import UlamaDetailScreen from './src/screens/ulama/UlamaDetailScreen';
import SanadChainScreen from './src/screens/ulama/SanadChainScreen';
import { theme } from './src/ui';

// Navigasi bawah: 5 tab konsisten (tab Profil otomatis muncul saat login)
const NAV_ITEMS = [
  { name: 'Home', label: 'Home', icon: 'home' },
  { name: 'SurahList', label: "Al-Qur'an", icon: 'book' },
  { name: 'QuranBookmarks', label: 'Bookmark', icon: 'bookmark' },
  { name: 'User', label: 'Profil', icon: 'user' },
  { name: 'Settings', label: 'Pengaturan', icon: 'cog' },
];

// Layar top-level: tidak menampilkan tombol kembali di header
const TOP_LEVEL = new Set(['Home', 'SurahList', 'QuranBookmarks', 'Settings', 'User']);

// Minimal internal navigator untuk web preview tanpa react-navigation
// Parse hash deep-link sekali saat init (web) agar tak kalah race dengan efek onboarding
function parseInitialStack() {
  if (Platform.OS !== 'web') return null;
  try {
    const h = (window.location.hash || '').replace(/^#\/?/, '');
    if (!h) return null;
    const [name, qs] = h.split('?');
    const allowed = ['Home','SurahList','SurahDetail','PageDetail','Tafsir','DoaList','DoaDetail','HaditsMenu','HaditsList','HaditsDetail','HaditsPerawiList','SholatJadwal','HijriCalendar','UlamaList','UlamaDetail','SanadChain','Qibla','Settings','QuranBookmarks','User'];
    if (!allowed.includes(name)) return null;
    const params = {};
    if (qs) { for (const [k, v] of new URLSearchParams(qs)) params[k] = v; }
    return [{ name, params }];
  } catch { return null; }
}

// Error boundary: jika satu layar crash, tampilkan pesan + tombol kembali
// (tanpa ini, error render membuat seluruh app blank).
class ScreenErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { err: null };
  }
  static getDerivedStateFromError(error) {
    return { err: error };
  }
  componentDidCatch(error, info) {
    console.error('[ScreenErrorBoundary]', error, info && info.componentStack);
  }
  render() {
    if (this.state.err) {
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#ffffff' }}>
          <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 8, color: '#7c3aed' }}>Terjadi kesalahan di layar ini</Text>
          <Text style={{ fontSize: 13, color: '#64748b', textAlign: 'center', marginBottom: 16 }}>
            {String((this.state.err && this.state.err.message) || this.state.err)}
          </Text>
          <TouchableOpacity
            style={{ backgroundColor: '#7c3aed', paddingVertical: 10, paddingHorizontal: 22, borderRadius: 999 }}
            onPress={() => this.setState({ err: null })}
          >
            <Text style={{ color: '#ffffff', fontWeight: '700' }}>Coba Lagi</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ marginTop: 12 }} onPress={() => { this.setState({ err: null }); if (this.props.onGoHome) this.props.onGoHome(); }}>
            <Text style={{ color: '#7c3aed', fontWeight: '600' }}>Kembali ke Home</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [initialResolved, setInitialResolved] = useState(false);
  const [deepLinked] = useState(() => parseInitialStack() != null);
  const [stack, setStack] = useState(() => parseInitialStack() || [{ name: 'Home', params: null }]);
  const current = stack[stack.length - 1];
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        if (deepLinked) {
          // Deep-link hash menang: jangan timpa stack (dipakai preview & screenshot per layar)
          const logged = await AsyncStorage.getItem('loggedIn');
          setIsLoggedIn(!!logged);
          setInitialResolved(true);
          return;
        }
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
  
  // Tombol kembali hardware Android: pop stack internal; di Home biarkan sistem yang menangani (keluar app)
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (stack.length > 1) {
        setStack((s) => (s.length > 1 ? s.slice(0, s.length - 1) : s));
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [stack.length]);

  // Deep-link web via URL hash (untuk preview & screenshot per layar):
  // format: #/NamaLayar?key=value&k2=v2  contoh: #/SurahDetail?nomor=18&nama_latin=Al-Kahf
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    try {
      const h = (window.location.hash || '').replace(/^#\/?/, '');
      if (!h) return;
      const [name, qs] = h.split('?');
      const allowed = ['Home','SurahList','SurahDetail','PageDetail','Tafsir','DoaList','DoaDetail','HaditsMenu','HaditsList','HaditsDetail','HaditsPerawiList','SholatJadwal','HijriCalendar','UlamaList','UlamaDetail','SanadChain','Qibla','Settings','QuranBookmarks','User'];
      if (!allowed.includes(name)) return;
      const params = {};
      if (qs) { for (const [k, v] of new URLSearchParams(qs)) params[k] = v; }
      setStack([{ name, params }]);
      AsyncStorage.setItem('onboardingDone', '1').catch(() => {});
    } catch {}
  }, []);

  // Dengarkan perubahan hash saat app sudah berjalan (web) — deep-link live
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onHash = () => {
      try {
        const parsed = parseInitialStack();
        if (parsed) setStack(parsed);
      } catch {}
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

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
    // Splash ber-brand saat memuat font/data awal
    return (
      <LinearGradient colors={theme.gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.splash}>
        <Image source={require('./assets/icon.png')} style={styles.splashLogo} resizeMode="contain" />
        <Text style={styles.splashTitle}>ALQURANKU</Text>
        <Text style={styles.splashSubtitle}>Pendamping baca Al-Qur'an harian</Text>
      </LinearGradient>
    );
  }

  // Header: gelap ber-brand, dengan tombol kembali ikon saat masuk layar detail
  const Header = () => (
    <View style={styles.header}>
      <LinearGradient colors={theme.gradients.shell} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.headerGradient}>
        {(() => {
          const showBack = stack.length > 1 && !TOP_LEVEL.has(current.name);
          if (showBack) {
            return (
              <TouchableOpacity onPress={navigation.goBack} style={styles.backBtn} activeOpacity={0.7}>
                <Ionicons name="chevron-back" size={20} color={theme.colors.shellText} />
                <Text style={styles.backText}>Kembali</Text>
              </TouchableOpacity>
            );
          }
          return <View style={styles.headerSpacer} />;
        })()}
        <View style={styles.brandCenter}>
          <Image source={require('./assets/icon.png')} style={styles.headerLogo} resizeMode="contain" />
          <Text style={styles.headerTitle} numberOfLines={1}>ALQURANKU</Text>
        </View>
        <View style={styles.headerSpacer} />
      </LinearGradient>
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
            <Text style={styles.backLinkText}>Ke Home</Text>
          </TouchableOpacity>
        </View>
      );
      break;
    case 'Home':
      ScreenEl = <HomeScreen navigation={navigation} />;
      break;
    case 'SurahList':
      ScreenEl = <SurahListScreen navigation={navigation} route={{ params: current.params }} />;
      break;
    case 'SurahDetail':
      ScreenEl = <SurahDetailScreen navigation={navigation} route={{ params: current.params }} />;
      break;
    case 'PageDetail':
      ScreenEl = <PageDetailScreen navigation={navigation} route={{ params: current.params }} />;
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
      // key per id ulama: layar di-remount saat pindah antar ulama (klik chip murid/guru)
      // sehingga selalu menampilkan data orang yang benar + scroll kembali ke atas
      ScreenEl = (
        <UlamaDetailScreen
          key={String(current.params?.scholarId ?? current.params?.scholar?.id ?? 'ulama')}
          navigation={navigation}
          route={{ params: current.params }}
        />
      );
      break;
    case 'SanadChain':
      ScreenEl = (
        <SanadChainScreen
          key={String(current.params?.scholarId ?? 'sanad')}
          navigation={navigation}
          route={{ params: current.params }}
        />
      );
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
            <Text style={styles.backLinkText}>Kembali</Text>
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
      ScreenEl = <UserScreen navigation={navigation} />;
      break;
    default:
      ScreenEl = (
        <View style={styles.center}>
          <Text>Halaman "{current.name}" belum tersedia.</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backLink}>
            <Text style={styles.backLinkText}>Kembali</Text>
          </TouchableOpacity>
        </View>
      );
  }

  // Bottom navigation: data-driven, highlight tab aktif (termasuk layar anak seperti SurahDetail)
  const activeOf = (name) => {
    if (name === 'SurahList') return current.name === 'SurahList' || current.name === 'SurahDetail' || current.name === 'Tafsir';
    return current.name === name;
  };
  const navItems = NAV_ITEMS.filter((it) => it.name !== 'User' || isLoggedIn);
  const BottomNav = () => (
    <View style={styles.bottomNav}>
      {navItems.map((it) => {
        const active = activeOf(it.name);
        return (
          <TouchableOpacity
            key={it.name}
            style={styles.navItem}
            onPress={() => navigation.navigate(it.name)}
            activeOpacity={0.7}
          >
            <View style={[styles.navIconWrap, active && styles.navIconWrapActive]}>
              <FontAwesome5 name={it.icon} size={15} color={active ? '#ffffff' : theme.colors.shellMuted} />
            </View>
            <Text style={[styles.navText, active && styles.navTextActive]}>{it.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const hideBottomNav = current.name === 'Onboarding';

  return (
    <SafeAreaProvider>
      <View style={styles.app}>
        <SafeAreaView edges={["top"]} style={styles.safeTop}>
          <StatusBar translucent={false} backgroundColor={theme.colors.shellDark} barStyle="light-content" />
          <Header />
        </SafeAreaView>
        <SafeAreaView edges={["bottom"]} style={styles.content}>
          <View style={{ flex: 1 }}>
            <ScreenErrorBoundary onGoHome={() => setStack([{ name: 'Home', params: null }])}>
              {ScreenEl}
            </ScreenErrorBoundary>
          </View>
          {!hideBottomNav && <BottomNav />}
          {/* Footer dihapus untuk tampilan lebih bersih */}
        </SafeAreaView>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: theme.colors.shellDark },
  // Splash ber-brand saat memuat font/data awal
  splash: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primaryDark },
  splashLogo: { width: 96, height: 96, borderRadius: 24, marginBottom: 16 },
  splashTitle: { fontSize: 24, fontWeight: '800', color: '#ffffff', letterSpacing: 2 },
  splashSubtitle: { color: 'rgba(255,255,255,0.85)', marginTop: 6 },
  // Header gelap ber-brand
  header: { height: 52, backgroundColor: theme.colors.shellDark },
  headerGradient: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12 },
  brandCenter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flex: 1 },
  headerLogo: { width: 26, height: 26, marginRight: 8, borderRadius: 6 },
  headerTitle: { fontSize: 15, fontWeight: '800', color: theme.colors.shellText, letterSpacing: 1 },
  headerSpacer: { width: 90 },
  backBtn: { width: 90, height: 40, flexDirection: 'row', alignItems: 'center' },
  backText: { color: theme.colors.shellText, fontWeight: '700', marginLeft: 2 },
  content: { flex: 1, backgroundColor: theme.colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  backLink: { marginTop: 12 },
  backLinkText: { color: theme.colors.primary, fontWeight: '700' },
  safeTop: { backgroundColor: theme.colors.shellDark },
  // Bottom navigation gelap dengan pill highlight tab aktif
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: theme.colors.shellDark,
    borderTopWidth: 1,
    borderTopColor: theme.colors.shellBorder,
    paddingTop: 6,
    paddingBottom: 4,
  },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
  navIconWrap: {
    width: 34,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navIconWrapActive: { backgroundColor: theme.colors.primary, ...theme.shadow.float },
  navText: { color: theme.colors.shellMuted, fontWeight: '700', fontSize: 10.5 },
  navTextActive: { color: '#ffffff' },
});