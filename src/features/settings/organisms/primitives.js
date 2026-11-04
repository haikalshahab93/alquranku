import React, { useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// ============================================================
// Komponen kecil yang dipakai lintas kartu layar Setelan.
// Semuanya menerima `pal` (palet warna) sebagai props agar tetap
// mengikuti dark mode yang dikelola di SettingsScreen.
// ============================================================

// === GroupHeader: pemisah kelompok pengaturan agar tiap kategori kelihatan ===
export const GroupHeader = ({ icon, label, desc, pal }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, marginBottom: 10 }}>
    <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: pal.colors.primaryLight + '2e', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
      <Ionicons name={icon} size={18} color={pal.colors.primary} />
    </View>
    <View style={{ flex: 1, minWidth: 0 }}>
      <Text style={{ fontSize: 16, fontWeight: '800', color: pal.colors.text }}>{label}</Text>
      {!!desc && <Text style={{ fontSize: 11.5, color: pal.colors.muted, marginTop: 1 }}>{desc}</Text>}
    </View>
  </View>
);

// === CollapsibleGroup: kelompok pengaturan gaya akordeon (tap header → buka/tutup) ===
// Dipakai agar layar Setelan ringkas: semua kelompok tertutup, isi muncul
// hanya saat kelompoknya diklik (dibungkus kartu agar tampil sebagai satu blok).
// Buka/tutup dianimasikan lembut: tinggi isi meluncur lewat animasi maxHeight
// (tanpa pengukuran layout, jadi aman walau isi termuat datanya asinkron) +
// ikon panah berputar halus saat status berubah.
const PLAFON_TINGGI_ISI = 2400; // px. Plafon animasi; isi terbesar kelompok (±1255px, bahkan dengan font 1.5x masih aman) di bawahnya sehingga fase meluncurnya terlihat lebih lama

export const CollapsibleGroup = ({ icon, label, desc, pal, open, onToggle, children }) => {
  const buka = useRef(new Animated.Value(open ? 1 : 0)).current; // 0 = tertutup → 1 = terbuka
  const target = useRef(open ? 1 : 0); // target terakhir animasi (mengantisipasi klik cepat beruntun)

  useEffect(() => {
    const want = open ? 1 : 0;
    if (target.current === want) return; // posisi sudah/menuju nilai yang diminta
    target.current = want;
    Animated.timing(buka, {
      toValue: want,
      duration: open ? 380 : 260, // buka lebih rupawan, tutup lebih ringkes
      easing: open ? Easing.out(Easing.cubic) : Easing.in(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [open, buka]);

  const chevronRot = buka.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

  return (
    <View style={{ backgroundColor: pal.colors.bg }}>
      <TouchableOpacity
        onPress={onToggle}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityState={{ expanded: !!open }}
        style={{
          flexDirection: 'row', alignItems: 'center', marginTop: 4, marginBottom: open ? 2 : 6,
          paddingVertical: 8, paddingHorizontal: 10, borderRadius: 14,
          backgroundColor: pal.colors.surface, borderWidth: 1, borderColor: open ? pal.colors.primary : pal.colors.surfaceBorder,
        }}
      >
        <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: pal.colors.primaryLight + '2e', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
          <Ionicons name={icon} size={18} color={pal.colors.primary} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 15.5, fontWeight: '800', color: pal.colors.text }}>{label}</Text>
          {!!desc && <Text style={{ fontSize: 11.5, color: pal.colors.muted, marginTop: 1 }} numberOfLines={1}>{desc}</Text>}
        </View>
        <Animated.View style={{ marginLeft: 8, transform: [{ rotate: chevronRot }] }}>
          <Ionicons name="chevron-down" size={18} color={pal.colors.primary} />
        </Animated.View>
      </TouchableOpacity>
      {/* Isi selalu terpasang supaya animasi buka/tutup tidak dipengaruhi timing termuat data;
          yang mengatur perlihatkan/menyembunyikan hanyalah tinggi (maxHeight) + opacity. */}
      <Animated.View
        style={{
          maxHeight: buka.interpolate({ inputRange: [0, 1], outputRange: [0, PLAFON_TINGGI_ISI] }),
          opacity: buka.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
          overflow: 'hidden',
          paddingHorizontal: 2,
        }}
      >
        {children}
      </Animated.View>
    </View>
  );
};

// Judul seksi di dalam kartu (teks besar di atas deskripsi)
export const SectionTitle = ({ children, pal }) => (
  <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 2, color: pal.colors.text }}>{children}</Text>
);

export const Chip = ({ label, active, onPress, pal }) => (
  <TouchableOpacity onPress={onPress} style={{
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1,
    borderColor: active ? pal.colors.primary : pal.colors.surfaceBorder, backgroundColor: active ? pal.colors.primaryLight + '2e' : pal.colors.surface, marginRight: 8, marginBottom: 8
  }}>
    <Text style={{ fontSize: 12, fontWeight: '700', color: active ? pal.colors.primary : pal.colors.text }}>{label}</Text>
  </TouchableOpacity>
);

export const OptionCard = ({ option, active, onPress, pal }) => (
  <TouchableOpacity
    onPress={onPress}
    style={{
      width: '100%', paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12, marginBottom: 8,
      borderWidth: 2, borderColor: active ? pal.colors.primary : pal.colors.surfaceBorder, backgroundColor: active ? pal.colors.primaryLight + '22' : pal.colors.surface,
    }}
  >
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Text style={{ flex: 1, fontWeight: '700', fontSize: 14, color: active ? pal.colors.primary : pal.colors.text }}>{option.label}</Text>
      {active ? <Ionicons name="checkmark-circle" size={18} color="#7c3aed" /> : null}
    </View>
    {!!option.sub && <Text style={{ fontSize: 12, color: pal.colors.muted, marginTop: 2 }}>{option.sub}</Text>}
  </TouchableOpacity>
);

export const InputRow = ({ label, value, onChangeText, placeholder, help, pal }) => (
  <View style={{ marginBottom: 14 }}>
    <Text style={{ fontWeight: 'bold', marginBottom: 6, color: pal.colors.text }}>{label}</Text>
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      style={{ borderWidth: 1, borderColor: pal.colors.surfaceBorder, borderRadius: 8, padding: 10, color: pal.colors.text, backgroundColor: pal.colors.surface }}
    />
    {!!help && <Text style={{ color: '#64748b', fontSize: 12, marginTop: 6 }}>{help}</Text>}
  </View>
);

// Formatter ukuran file sederhana (KB/MB), dipakai kartu unduhan & penyimpanan
export const fmtMB = (b) => (!b || b <= 0 ? '0 KB' : b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
