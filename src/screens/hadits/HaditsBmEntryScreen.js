import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { getPalette } from '../../ui';
import { useAppearance } from '../../api/appearance';
import { getHaditsBmNomor } from '../../api/hadits'

export default function HaditsBmEntryScreen({ navigation }) {
  const [nomor, setNomor] = useState('');
  const { darkMode } = useAppearance();
  const pal = getPalette(darkMode);

  const openByNumber = () => {
    const n = parseInt(nomor, 10);
    if (!isNaN(n) && n > 0) {
      navigation.navigate('HaditsDetail', { collection: 'bm', nomor: n });
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: pal.colors.bg }]}>
      <Text style={[styles.title, { color: pal.colors.text }]}>Bulughul Maram</Text>
      <Text style={[styles.desc, { color: pal.colors.muted }]}>Masukkan nomor hadits (1-1597), lalu ketuk Lihat.</Text>
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
  title: { fontSize: 18, fontWeight: '700' },
  desc: { marginTop: 6, marginBottom: 10 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  btn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, marginRight: 10 },
  btnText: { color: '#fff', fontWeight: '700' },
});