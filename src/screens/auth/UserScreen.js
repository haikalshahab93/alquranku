import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5 } from '@expo/vector-icons';
import { theme } from '../../ui';

export default function UserScreen({ navigation }) {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const raw = await AsyncStorage.getItem('userProfile');
        if (raw) setProfile(JSON.parse(raw));
      } catch {}
    };
    load();
  }, []);

  const logout = async () => {
    try {
      const accessToken = await AsyncStorage.getItem('googleAccessToken');
      const idToken = await AsyncStorage.getItem('googleIdToken');
      // Revoke token jika ada (opsional, terbaik untuk keamanan)
      if (accessToken) {
        try {
          await fetch(`https://oauth2.googleapis.com/revoke?token=${accessToken}`, { method: 'POST', headers: { 'Content-type': 'application/x-www-form-urlencoded' } });
        } catch {}
      }
      if (idToken) {
        // Tidak wajib, biasanya revoke pada access token cukup.
      }
      await AsyncStorage.removeItem('googleAccessToken');
      await AsyncStorage.removeItem('googleIdToken');
      await AsyncStorage.removeItem('loggedIn');
      await AsyncStorage.removeItem('userProfile');
      // Bypass login: setelah logout, arahkan kembali ke Home
      navigation.navigate('Home');
    } catch {}
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#ede9fe", "#f5f3ff"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <Text style={styles.heroTitle}>Profil</Text>
        {profile && (
          <View style={styles.heroContent}>
            <Image source={{ uri: profile.picture }} style={styles.heroAvatar} />
            <Text style={styles.heroName}>{profile.name}</Text>
            <Text style={styles.heroEmail}>{profile.email}</Text>
            <View style={styles.chipsRow}>
              <View style={[styles.chip, styles.chipProvider]}>
                <FontAwesome5 name="google" size={12} color="#dc2626" style={{ marginRight: 6 }} />
                <Text style={styles.chipText}>Google</Text>
              </View>
              {!!profile.emailVerified && (
                <View style={[styles.chip, styles.chipVerified]}>
                  <FontAwesome5 name="check-circle" size={12} color="#16a34a" style={{ marginRight: 6 }} />
                  <Text style={styles.chipText}>Terverifikasi</Text>
                </View>
              )}
            </View>
          </View>
        )}
      </LinearGradient>

      {profile ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detail Akun</Text>
          <View style={styles.infoItem}>
            <FontAwesome5 name="globe" size={14} color="#64748b" style={styles.infoIcon} />
            <Text style={styles.infoLabel}>Locale</Text>
            <Text style={styles.infoValue}>{profile.locale || '-'}</Text>
          </View>
          <View style={styles.infoItem}>
            <FontAwesome5 name="id-card" size={14} color="#64748b" style={styles.infoIcon} />
            <Text style={styles.infoLabel}>ID</Text>
            <Text style={styles.infoValue}>{profile.sub || '-'}</Text>
          </View>
          <View style={styles.infoItem}>
            <FontAwesome5 name="user" size={14} color="#64748b" style={styles.infoIcon} />
            <Text style={styles.infoLabel}>Nama depan</Text>
            <Text style={styles.infoValue}>{profile.givenName || '-'}</Text>
          </View>
          <View style={styles.infoItem}>
            <FontAwesome5 name="user" size={14} color="#64748b" style={styles.infoIcon} />
            <Text style={styles.infoLabel}>Nama belakang</Text>
            <Text style={styles.infoValue}>{profile.familyName || '-'}</Text>
          </View>
          <TouchableOpacity style={[styles.btn, styles.logoutBtn]} onPress={logout}>
            <FontAwesome5 name="sign-out-alt" size={14} color="#b91c1c" style={{ marginRight: 8 }} />
            <Text style={[styles.btnText, { color: '#b91c1c' }]}>Logout</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.section}>
          <View style={styles.emptyCard}><Text style={styles.emptyText}>Belum login</Text></View>
          {/* Bypass login: tombol mengarahkan kembali ke Home */}
          <TouchableOpacity style={styles.btn} onPress={() => navigation.navigate('Home')}>
            <FontAwesome5 name="home" size={14} color={theme.colors.primary} style={{ marginRight: 8 }} />
            <Text style={styles.btnText}>Kembali ke Home</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  hero: { paddingTop: 24, paddingBottom: 64, paddingHorizontal: 16, borderBottomWidth: 0, borderColor: '#eee' },
  heroTitle: { fontSize: 20, fontWeight: '800', color: '#4c1d95' },
  heroContent: { alignItems: 'center', marginTop: 16 },
  heroAvatar: { width: 96, height: 96, borderRadius: 48, borderWidth: 3, borderColor: '#ffffff' },
  heroName: { fontSize: 18, fontWeight: '800', color: '#111827', marginTop: 12 },
  heroEmail: { color: '#334155', marginTop: 4 },
  chipsRow: { flexDirection: 'row', marginTop: 10 },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1, marginRight: 8 },
  chipText: { fontSize: 12, fontWeight: '700', color: '#111827' },
  chipProvider: { backgroundColor: '#fff', borderColor: '#fecaca' },
  chipVerified: { backgroundColor: '#f0fdf4', borderColor: '#dcfce7' },

  section: { marginTop: -40, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#6b7280', marginBottom: 8, marginLeft: 4 },
  infoItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', padding: 12, marginBottom: 8 },
  infoIcon: { marginRight: 10 },
  infoLabel: { flex: 1, color: '#374151', fontWeight: '600' },
  infoValue: { color: '#111827', fontWeight: '700' },

  emptyCard: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', padding: 16, alignItems: 'center' },
  emptyText: { color: '#64748b' },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff', marginTop: 12 },
  logoutBtn: { backgroundColor: '#fee2e2', borderColor: '#fecaca' },
  btnText: { color: theme.colors.primary, fontWeight: '700' },
});