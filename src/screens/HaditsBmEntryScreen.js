import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '../ui';

export default function HaditsBmEntryScreen({ navigation }) {
  const [nomor, setNomor] = useState('');

  const openByNumber = () => {
    const n = parseInt(nomor, 10);
    if (!isNaN(n) && n > 0) {
      navigation.navigate('HaditsDetail', { collection: 'bm', nomor: n });
    }
  };

  const openRandom = () => {
    navigation.navigate('HaditsDetail', { collection: 'bm', random: true });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bulughul Maram</Text>
      <Text style={styles.desc}>Masukkan nomor hadits (1-1597) atau lihat acak.</Text>
      <TextInput
        value={nomor}
        onChangeText={setNomor}
        keyboardType="numeric"
        placeholder="Nomor hadits"
        placeholderTextColor="#64748b"
        style={styles.input}
      />
      <View style={styles.row}>
        <TouchableOpacity style={styles.btn} onPress={openByNumber}>
          <Text style={styles.btnText}>Lihat</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.btnAlt]} onPress={openRandom}>
          <Text style={styles.btnTextAlt}>Acak</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  title: { fontSize: 18, fontWeight: '700', color: '#111' },
  desc: { color: '#64748b', marginTop: 6, marginBottom: 10 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, color: '#111' },
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  btn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, backgroundColor: theme.colors.primaryDark, marginRight: 10 },
  btnText: { color: '#fff', fontWeight: '700' },
  btnAlt: { backgroundColor: '#f1f5f9' },
  btnTextAlt: { color: theme.colors.primary, fontWeight: '700' },
});