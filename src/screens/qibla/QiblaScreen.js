import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, TextInput, Switch, Linking, ImageBackground } from 'react-native';
import * as Location from 'expo-location';
import Svg, { Circle, Line, Text as SvgText } from 'react-native-svg';
import { PurpleButton, OutlineLightButton, theme } from '../../ui';
import { getAladhanQibla } from '../../api/aladhan';
import compassImg from '../../../assets/filename.png';

export default function QiblaScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [coords, setCoords] = useState(null); // { latitude, longitude }
  const [qiblaDeg, setQiblaDeg] = useState(null); // degrees from true North
  const [headingDeg, setHeadingDeg] = useState(0); // device heading from true North
  const [manualMode, setManualMode] = useState(false);
  const [manualHeadingDeg, setManualHeadingDeg] = useState(0);
  const [headingSupported, setHeadingSupported] = useState(false);

  async function resolveQibla() {
    setLoading(true);
    setError('');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Izin lokasi ditolak. Aktifkan izin lokasi untuk menentukan arah kiblat.');
      }
      const pos = await Location.getCurrentPositionAsync({});
      const lat = pos?.coords?.latitude;
      const lon = pos?.coords?.longitude;
      if (typeof lat !== 'number' || typeof lon !== 'number') {
        throw new Error('Tidak dapat memperoleh lokasi perangkat.');
      }
      setCoords({ latitude: lat, longitude: lon });
      const deg = await getAladhanQibla(lat, lon);
      if (typeof deg !== 'number') throw new Error('Gagal memuat arah kiblat dari API.');
      setQiblaDeg(deg);
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    resolveQibla();
  }, []);

  useEffect(() => {
    let sub;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        sub = await Location.watchHeadingAsync((heading) => {
          const h = typeof heading?.trueHeading === 'number' ? heading.trueHeading
            : typeof heading?.magHeading === 'number' ? heading.magHeading
            : typeof heading?.heading === 'number' ? heading.heading
            : 0;
          if (Number.isFinite(h)) {
            setHeadingDeg(h);
            setHeadingSupported(true);
          }
        });
      } catch {}
    })();
    return () => { try { sub?.remove && sub.remove(); } catch {} };
  }, []);

  // Compass rendering helpers
  const size = 240;
  const center = size / 2;
  const radius = center - 10;
  // Offset pusat gambar kompas jika tidak tepat berada di tengah
  const imageOffsetX = 0; // ubah jika perlu, misal 4 atau -6
  const imageOffsetY = 0; // ubah jika perlu
  // Skala panjang pointer jika lingkaran pada gambar kompas lebih kecil/besar dari radius default
  const pointerScale = 1; // contoh: 0.92 untuk sedikit lebih pendek

  // Arrow endpoint for qibla
  function polarToCartesian(angleDeg, r = radius) {
    const rad = (angleDeg - 90) * Math.PI / 180; // SVG 0° is at 3 o'clock; shift so 0° at north
    const x = center + r * Math.cos(rad);
    const y = center + r * Math.sin(rad);
    return { x, y };
  }

  const usedHeading = manualMode ? manualHeadingDeg : (headingSupported ? headingDeg : 0);
  const effectiveAngle = qiblaDeg != null ? ((qiblaDeg - usedHeading + 360) % 360) : null;
  const pointer = effectiveAngle != null ? polarToCartesian(effectiveAngle, radius * pointerScale) : { x: center, y: 10 };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Arah Kiblat</Text>
        {coords && (
          <Text style={styles.subtitle}>
            Lokasi: {coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}
          </Text>
        )}
        {qiblaDeg != null && (
          <Text style={styles.meta}>Sudut dari Utara: {Math.round(qiblaDeg)}°</Text>
        )}
        <Text style={styles.subtitle}>Arah perangkat: {Math.round(manualMode ? manualHeadingDeg : headingDeg)}° {manualMode ? '(manual)' : headingSupported ? '(sensor)' : '(tidak didukung)'} </Text>
        <View style={{ marginTop: 8, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 10 }}>
          <Text style={{ color: '#475569' }}>Tips kalibrasi: Gerakkan perangkat membentuk angka “8” di udara untuk menstabilkan kompas. Jauhkan dari benda logam atau magnet.</Text>
        </View>

        <View style={{ alignItems: 'center', marginTop: 12 }}>
          {loading ? (
            <ActivityIndicator color={theme.colors.primary} />
          ) : error ? (
            <View style={{ alignItems: 'center' }}>
              <Text style={styles.error}>{error}</Text>
              <OutlineLightButton label="Coba Lagi" onPress={resolveQibla} style={{ marginTop: 8 }} />
            </View>
          ) : (
            <ImageBackground source={compassImg} style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }} imageStyle={{ resizeMode: 'contain' }}>
              <Svg width={size} height={size}>
                {/* Qibla pointer over image dial */}
                <Line x1={center + imageOffsetX} y1={center + imageOffsetY} x2={pointer.x + imageOffsetX} y2={pointer.y + imageOffsetY} stroke={theme.colors.primary} strokeWidth={3} />
                {/* Arrow head */}
                <Circle cx={center + imageOffsetX} cy={center + imageOffsetY} r={4} fill={theme.colors.primary} />
              </Svg>
            </ImageBackground>
          )}
        </View>

        <View style={{ marginTop: 10 }}>
          <Text style={styles.help}>Arahkan perangkat sehingga bagian atas menghadap utara, lalu ikuti garis ungu menuju Ka'bah.</Text>
        </View>

        <View style={{ flexDirection: 'row', marginTop: 12 }}>
          <PurpleButton label="Segarkan Lokasi" onPress={resolveQibla} style={{ marginRight: 8 }} />
          <OutlineLightButton label="Buka Maps" onPress={openMaps} style={{ marginRight: 8 }} />
          <OutlineLightButton label="Kembali" onPress={() => navigation.goBack()} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  card: { borderRadius: 16, padding: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb' },
  title: { fontSize: 20, fontWeight: '800', color: '#111' },
  subtitle: { color: '#64748b', marginTop: 4 },
  meta: { color: '#475569', marginTop: 4, fontWeight: '700' },
  help: { color: '#6b7280' },
  error: { color: '#ef4444', textAlign: 'center' },
});

function openMaps() {
  const url = 'https://www.google.com/maps/search/?api=1&query=21.4225,39.8262';
  Linking.openURL(url).catch(() => {});
}