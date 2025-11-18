import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../ui';

const PREFIXES = {
  quran: 'cache:quran:',
  doa: 'cache:doa:',
  hadits: 'cache:hadits:',
};

async function estimatePrefixStats(prefix) {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const targetKeys = keys.filter((k) => k.startsWith(prefix));
    let totalBytes = 0;
    for (const k of targetKeys) {
      const v = await AsyncStorage.getItem(k);
      if (typeof v === 'string') totalBytes += v.length;
    }
    return { count: targetKeys.length, bytes: totalBytes };
  } catch (e) {
    return { count: 0, bytes: 0 };
  }
}

async function clearPrefix(prefix) {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const targetKeys = keys.filter((k) => k.startsWith(prefix));
    if (targetKeys.length) await AsyncStorage.multiRemove(targetKeys);
    return targetKeys.length;
  } catch (e) {
    return 0;
  }
}

export default function SettingsScreen() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ quran: { count: 0, bytes: 0 }, doa: { count: 0, bytes: 0 }, hadits: { count: 0, bytes: 0 } });
  const [message, setMessage] = useState('');

  const refreshStats = async () => {
    setLoading(true);
    setMessage('');
    const quran = await estimatePrefixStats(PREFIXES.quran);
    const doa = await estimatePrefixStats(PREFIXES.doa);
    const hadits = await estimatePrefixStats(PREFIXES.hadits);
    setStats({ quran, doa, hadits });
    setLoading(false);
  };

  useEffect(() => {
    refreshStats();
  }, []);

  const clearQuran = async () => {
    const removed = await clearPrefix(PREFIXES.quran);
    setMessage(`Quran cache dibersihkan (${removed} item).`);
    refreshStats();
  };
  const clearDoa = async () => {
    const removed = await clearPrefix(PREFIXES.doa);
    setMessage(`Doa cache dibersihkan (${removed} item).`);
    refreshStats();
  };
  const clearHadits = async () => {
    const removed = await clearPrefix(PREFIXES.hadits);
    setMessage(`Hadits cache dibersihkan (${removed} item).`);
    refreshStats();
  };
  const clearAll = async () => {
    const rq = await clearPrefix(PREFIXES.quran);
    const rd = await clearPrefix(PREFIXES.doa);
    const rh = await clearPrefix(PREFIXES.hadits);
    setMessage(`Semua cache dibersihkan (Quran: ${rq}, Doa: ${rd}, Hadits: ${rh}).`);
    refreshStats();
  };

  const formatMB = (bytes) => `${(bytes / (1024 * 1024)).toFixed(2)} MB`;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <LinearGradient colors={["#ede9fe", "#f5f3ff"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <View style={styles.heroRow}>
          <View style={styles.heroTextBox}>
            <Text style={styles.heroTitle}>Pengaturan</Text>
            <Text style={styles.heroSubtitle}>Manajemen Cache Offline</Text>
          </View>
        </View>
      </LinearGradient>
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" /></View>
      ) : (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Statistik Cache</Text>
          <View style={styles.statRow}><Text style={styles.statLabel}>Quran:</Text><Text style={styles.statValue}>{stats.quran.count} item • {formatMB(stats.quran.bytes)}</Text></View>
          <View style={styles.statRow}><Text style={styles.statLabel}>Doa:</Text><Text style={styles.statValue}>{stats.doa.count} item • {formatMB(stats.doa.bytes)}</Text></View>
          <View style={styles.statRow}><Text style={styles.statLabel}>Hadits:</Text><Text style={styles.statValue}>{stats.hadits.count} item • {formatMB(stats.hadits.bytes)}</Text></View>
        </View>
      )}

      {!!message && <View style={styles.messageBox}><Text style={styles.messageText}>{message}</Text></View>}

      <View style={styles.actions}>
        <TouchableOpacity style={[styles.btn, styles.btnQuran]} onPress={clearQuran}><Text style={styles.btnText}>Clear Quran Cache</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.btnDoa]} onPress={clearDoa}><Text style={styles.btnText}>Clear Doa Cache</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.btnHadits]} onPress={clearHadits}><Text style={styles.btnText}>Clear Hadits Cache</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.btnAll]} onPress={clearAll}><Text style={styles.btnText}>Clear Semua Cache</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.btnRefresh]} onPress={refreshStats}><Text style={styles.btnText}>Refresh Statistik</Text></TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  center: { justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: '#111' },
  subtitle: { color: '#64748b', marginTop: 4, marginBottom: 12 },
  section: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 12 },
  sectionTitle: { fontWeight: '700', marginBottom: 8 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  statLabel: { color: '#334155', fontWeight: '600' },
  statValue: { color: '#334155' },
  actions: { marginTop: 12 },
  btn: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f1f5f9', marginBottom: 8 },
  btnText: { color: theme.colors.primary, fontWeight: '700', textAlign: 'center' },
  btnQuran: {},
  btnDoa: {},
  btnHadits: {},
  btnAll: { backgroundColor: '#fff8', borderColor: '#fde68a' },
  btnRefresh: {},
  messageBox: { marginTop: 8, backgroundColor: '#ede9fe', borderColor: theme.colors.primaryLight, borderWidth: 1, borderRadius: 8, padding: 8 },
  messageText: { color: theme.colors.primaryDark, fontWeight: '600' },
  hero: { borderRadius: 16, padding: 16, marginBottom: 12 },
  heroRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroTextBox: { flex: 1 },
  heroTitle: { fontSize: 22, fontWeight: '800', color: '#1f2937' },
  heroSubtitle: { color: '#6b7280', marginTop: 4 },
});