import React from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
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
