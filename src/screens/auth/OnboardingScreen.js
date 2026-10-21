import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontAwesome5 } from '@expo/vector-icons';
import { theme, getPalette } from '../../ui';
import { useAppearance } from '../../api/appearance';

const { width } = Dimensions.get('window');

export default function OnboardingScreen({ navigation }) {
  const { darkMode } = useAppearance();
  const pal = getPalette(darkMode);
  const scrollRef = useRef(null);
  const [index, setIndex] = useState(0);

  const slides = [
    {
      title: 'Baca Al-Qur’an Mudah',
      desc: 'Nikmati tampilan ayat, terjemahan, dan tafsir dalam satu tempat.'
    },
    {
      title: 'Kumpulan Doa & Hadits',
      desc: 'Akses doa harian dan koleksi hadits secara cepat dan ringkas.'
    },
    {
      title: 'Fitur Penunjang Ibadah',
      desc: 'Kalender hijriah, jadwal sholat, dan lebih banyak lagi.'
    },
  ];

  const goNext = () => {
    if (index < slides.length - 1) {
      const next = index + 1;
      scrollRef.current?.scrollTo({ x: next * width, animated: true });
      setIndex(next);
    } else {
      finish();
    }
  };

  const skip = () => finish();

  const finish = async () => {
    try {
      await AsyncStorage.setItem('onboardingDone', '1');
    } catch {}
    // Ubah: setelah onboarding, langsung ke Home (bypass Login)
    navigation.navigate('Home');
  };

  return (
    <View style={[styles.container, { backgroundColor: pal.colors.bg }]}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={(e) => {
          const x = e.nativeEvent.contentOffset.x || 0;
          const i = Math.round(x / width);
          if (i !== index) setIndex(i);
        }}
        scrollEventThrottle={16}
      >
        {slides.map((s, i) => (
          <View key={i} style={[styles.slide, { width }]}> 
            {/* Icon dalam kartu gradient ber-brand */}
            <LinearGradient
              colors={theme.gradients.brand}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.slideIconWrap}
            >
              {i === 0 && <FontAwesome5 name="book-open" size={44} color="#ffffff" />}
              {i === 1 && <FontAwesome5 name="hands" size={44} color="#ffffff" />}
              {i === 2 && <FontAwesome5 name="calendar" size={44} color="#ffffff" />}
            </LinearGradient>
            <Text style={[styles.title, { color: pal.colors.text }]}>{s.title}</Text>
            <Text style={[styles.desc, { color: pal.colors.muted }]}>{s.desc}</Text>
          </View>
        ))}
      </ScrollView>
      <View style={[styles.controls, { borderColor: pal.colors.surfaceBorder }]}>
        <TouchableOpacity style={styles.skipBtn} onPress={skip}>
          <Text style={[styles.skipText, { color: pal.colors.muted }]}>Lewati</Text>
        </TouchableOpacity>
        <View style={styles.dots}>
          {slides.map((_, i) => (
            <View key={i} style={[styles.dot, { backgroundColor: pal.colors.surfaceBorder }, i === index && styles.dotActive]} />
          ))}
        </View>
        <TouchableOpacity style={[styles.nextBtn, { backgroundColor: theme.colors.primaryDark }]} onPress={goNext}>
          <Text style={styles.nextText}>{index < slides.length - 1 ? 'Lanjut' : 'Mulai'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  slide: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center' },
  slideIconWrap: {
    width: 120,
    height: 120,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    ...theme.shadow.float,
  },
  title: { fontSize: 22, fontWeight: '800', textAlign: 'center' },
  desc: { marginTop: 8, textAlign: 'center' },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderTopWidth: 1 },
  skipBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  skipText: { fontWeight: '700' },
  dots: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 8, marginHorizontal: 4 },
  dotActive: { backgroundColor: theme.colors.primary },
  nextBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 999, ...theme.shadow.card },
  nextText: { color: '#fff', fontWeight: '700' },
});