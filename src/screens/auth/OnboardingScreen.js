import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontAwesome5 } from '@expo/vector-icons';
import { theme } from '../../ui';

const { width } = Dimensions.get('window');

export default function OnboardingScreen({ navigation }) {
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
    navigation.navigate('Login');
  };

  return (
    <View style={styles.container}>
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
            {/* icon area */}
            <View style={{ width: 120, height: 120, borderRadius: 60, backgroundColor: '#ede9fe', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              {i === 0 && <FontAwesome5 name="book-open" size={48} color={theme.colors.primary} />}
              {i === 1 && <FontAwesome5 name="hands" size={48} color={theme.colors.primary} />}
              {i === 2 && <FontAwesome5 name="calendar" size={48} color={theme.colors.primary} />}
            </View>
            <Text style={styles.title}>{s.title}</Text>
            <Text style={styles.desc}>{s.desc}</Text>
          </View>
        ))}
      </ScrollView>
      <View style={styles.controls}>
        <TouchableOpacity style={styles.skipBtn} onPress={skip}>
          <Text style={styles.skipText}>Lewati</Text>
        </TouchableOpacity>
        <View style={styles.dots}>
          {slides.map((_, i) => (
            <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
        <TouchableOpacity style={styles.nextBtn} onPress={goNext}>
          <Text style={styles.nextText}>{index < slides.length - 1 ? 'Lanjut' : 'Mulai'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  slide: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: '#111', textAlign: 'center' },
  desc: { marginTop: 8, color: '#475569', textAlign: 'center' },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderTopWidth: 1, borderColor: '#eee' },
  skipBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  skipText: { color: '#64748b', fontWeight: '700' },
  dots: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 8, backgroundColor: '#e2e8f0', marginHorizontal: 4 },
  dotActive: { backgroundColor: theme.colors.primary },
  nextBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: theme.colors.primaryDark },
  nextText: { color: '#fff', fontWeight: '700' },
});