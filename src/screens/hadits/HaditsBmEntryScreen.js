import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { getPalette } from '../../ui';
import { useAppearance } from '../../api/appearance';
import { useI18n } from '../../api/i18n';
import { getHaditsBmNomor } from '../../api/hadits'

export default function HaditsBmEntryScreen({ navigation }) {
  const [nomor, setNomor] = useState('');
  const { darkMode } = useAppearance();
  // Dwibahasa: deskripsi, placeholder, dan tombol mengikuti bahasa aktif.
  const { t } = useI18n();
  const pal = getPalette(darkMode);

  const openByNumber = () => {
    const n = parseInt(nomor, 10);
    if (!isNaN(n) && n > 0) {
      navigation.navigate('HaditsDetail', { collection: 'bm', nomor: n });
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: pal.colors.bg }]}>
      <Text style={[styles.title, { color: pal.colors.text }]}>{t('hadits.bulughul')}</Text>
      <Text style={[styles.desc, { color: pal.colors.muted }]}>{t('hadits.bmEntryDesc')}</Text>
      <TextInput
        value={nomor}
        onChangeText={setNomor}
        keyboardType="numeric"
        placeholder={t('hadits.nomorPlaceholder')}
        placeholderTextColor={pal.colors.muted}
        style={[styles.input, { backgroundColor: pal.colors.surface, borderColor: pal.colors.surfaceBorder, color: pal.colors.text }]}
      />
      <View style={styles.row}>
        <TouchableOpacity style={[styles.btn, { backgroundColor: pal.colors.primaryDark }]} onPress={openByNumber}>
          <Text style={styles.btnText}>{t('hadits.lihat')}</Text>
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