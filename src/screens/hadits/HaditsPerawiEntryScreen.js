import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { getPalette } from '../../ui';
import { useAppearance } from '../../api/appearance';
import { getHaditsPerawiNomor } from '../../api/hadits'

export default function HaditsPerawiEntryScreen({ route, navigation }) {
  const { slug, name } = route.params || {};
  const [nomor, setNomor] = useState('');
  const { darkMode } = useAppearance();
  const pal = getPalette(darkMode);

  const openByNumber = () => {
    const n = parseInt(nomor, 10);
    if (!isNaN(n) && n > 0 && slug) {
      navigation.navigate('HaditsDetail', { collection: 'perawi', slug, nomor: n });
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: pal.colors.bg }]}>
      <Text style={[styles.title, { color: pal.colors.text }]}>{name || 'Perawi'}</Text>
      <Text style={[styles.desc, { color: pal.colors.muted }]}>Masukkan nomor hadits untuk perawi ini, lalu ketuk Lihat.</Text>
      <TextInput
        value={nomor}
        onChangeText={setNomor}
        keyboardType="numeric"
        placeholder="Nomor hadits"
        placeholderTextColor={pal.colors.muted}
        style={[styles.input, { backgroundColor: pal.colors.surface, borderColor: pal.colors.surfaceBorder, color: pal.colors.text }]}
      />
      <View style={styles.row}>
        <TouchableOpacity style={[styles.btn, { backgroundColor: pal.colors.primaryDark }]} onPress={openByNumber}>
          <Text style={styles.btnText}>Lihat</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 16, fontWeight: '700' },
  desc: { marginTop: 6, marginBottom: 10 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  btn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, marginRight: 10 },
  btnText: { color: '#ffffff', fontWeight: '700' },
});