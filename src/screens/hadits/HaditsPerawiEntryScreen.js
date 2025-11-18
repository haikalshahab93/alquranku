import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '../../ui';
import { getHaditsPerawiNomor } from '../../api/hadits'

export default function HaditsPerawiEntryScreen({ route, navigation }) {
  const { slug, name } = route.params || {};
  const [nomor, setNomor] = useState('');

  const openByNumber = () => {
    const n = parseInt(nomor, 10);
    if (!isNaN(n) && n > 0 && slug) {
      navigation.navigate('HaditsDetail', { collection: 'perawi', slug, nomor: n });
    }
  };

  const openRandom = () => {
    navigation.navigate('HaditsDetail', { collection: 'perawi', random: true });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{name || 'Perawi'}</Text>
      <Text style={styles.desc}>Masukkan nomor hadits untuk perawi ini, atau lihat acak.</Text>
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
  title: { color: theme.colors.primaryDark, fontSize: 16, fontWeight: '700' },
  desc: { color: '#64748b', marginTop: 6, marginBottom: 10 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, color: '#111' },
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  btn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, backgroundColor: theme.colors.primaryDark, marginRight: 10 },
  btnText: { color: theme.colors.white, fontWeight: '700' },
  btnAlt: { backgroundColor: '#f1f5f9' },
  btnTextAlt: { color: theme.colors.primary, fontWeight: '700' },
});