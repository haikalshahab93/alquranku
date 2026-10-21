import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5 } from '@expo/vector-icons';
import { getPalette } from '../../ui';
import { useAppearance } from '../../api/appearance';

export default function UserScreen({ navigation }) {
  const { darkMode } = useAppearance();
  const pal = getPalette(darkMode);
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
    <View style={[styles.container, { backgroundColor: pal.colors.bg }]}>
      <LinearGradient colors={pal.gradients.brandSoft} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <Text style={[styles.heroTitle, { color: pal.colors.primaryDark }]}>Profil</Text>
        {profile && (
          <View style={styles.heroContent}>
            <Image source={{ uri: profile.picture }} style={styles.heroAvatar} />
            <Text style={[styles.heroName, { color: pal.colors.text }]}>{profile.name}</Text>
            <Text style={[styles.heroEmail, { color: pal.colors.muted }]}>{profile.email}</Text>
            <View style={styles.chipsRow}>
              <View style={[styles.chip, { backgroundColor: pal.colors.surface, borderColor: pal.colors.surfaceBorder }]}>
                <FontAwesome5 name="google" size={12} color="#dc2626" style={{ marginRight: 6 }} />
                <Text style={[styles.chipText, { color: pal.colors.text }]}>Google</Text>
              </View>
              {!!profile.emailVerified && (
                <View style={[styles.chip, styles.chipVerified]}>
                  <FontAwesome5 name="check-circle" size={12} color="#16a34a" style={{ marginRight: 6 }} />
                  <Text style={[styles.chipText, { color: pal.colors.text }]}>Terverifikasi</Text>
                </View>
              )}
            </View>
          </View>
        )}
      </LinearGradient>

      {profile ? (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: pal.colors.muted }]}>Detail Akun</Text>
          <View style={[styles.infoItem, { backgroundColor: pal.colors.surface, borderColor: pal.colors.surfaceBorder }]}>
            <FontAwesome5 name="globe" size={14} color={pal.colors.muted} style={styles.infoIcon} />
            <Text style={[styles.infoLabel, { color: pal.colors.muted }]}>Locale</Text>
            <Text style={[styles.infoValue, { color: pal.colors.text }]}>{profile.locale || '-'}</Text>
          </View>
          <View style={[styles.infoItem, { backgroundColor: pal.colors.surface, borderColor: pal.colors.surfaceBorder }]}>
            <FontAwesome5 name="id-card" size={14} color={pal.colors.muted} style={styles.infoIcon} />
            <Text style={[styles.infoLabel, { color: pal.colors.muted }]}>ID</Text>
            <Text style={[styles.infoValue, { color: pal.colors.text }]}>{profile.sub || '-'}</Text>
          </View>
          <View style={[styles.infoItem, { backgroundColor: pal.colors.surface, borderColor: pal.colors.surfaceBorder }]}>
            <FontAwesome5 name="user" size={14} color={pal.colors.muted} style={styles.infoIcon} />
            <Text style={[styles.infoLabel, { color: pal.colors.muted }]}>Nama depan</Text>
            <Text style={[styles.infoValue, { color: pal.colors.text }]}>{profile.givenName || '-'}</Text>
          </View>
          <View style={[styles.infoItem, { backgroundColor: pal.colors.surface, borderColor: pal.colors.surfaceBorder }]}>
            <FontAwesome5 name="user" size={14} color={pal.colors.muted} style={styles.infoIcon} />
            <Text style={[styles.infoLabel, { color: pal.colors.muted }]}>Nama belakang</Text>
            <Text style={[styles.infoValue, { color: pal.colors.text }]}>{profile.familyName || '-'}</Text>
          </View>
          <TouchableOpacity style={[styles.btn, styles.logoutBtn, { backgroundColor: pal.colors.surface, borderColor: pal.colors.surfaceBorder }]} onPress={logout}>
            <FontAwesome5 name="sign-out-alt" size={14} color="#b91c1c" style={{ marginRight: 8 }} />
            <Text style={[styles.btnText, { color: '#dc2626' }]}>Logout</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.section}>
          <View style={[styles.emptyCard, { backgroundColor: pal.colors.surface, borderColor: pal.colors.surfaceBorder }]}><Text style={[styles.emptyText, { color: pal.colors.muted }]}>Belum login</Text></View>
          {/* Bypass login: tombol mengarahkan kembali ke Home */}
          <TouchableOpacity style={[styles.btn, { backgroundColor: pal.colors.surface, borderColor: pal.colors.surfaceBorder }]} onPress={() => navigation.navigate('Home')}>
            <FontAwesome5 name="home" size={14} color={pal.colors.primary} style={{ marginRight: 8 }} />
            <Text style={[styles.btnText, { color: pal.colors.primary }]}>Kembali ke Home</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: { paddingTop: 24, paddingBottom: 64, paddingHorizontal: 16, borderBottomWidth: 0 },
  heroTitle: { fontSize: 20, fontWeight: '800' },
  heroContent: { alignItems: 'center', marginTop: 16 },
  heroAvatar: { width: 96, height: 96, borderRadius: 48, borderWidth: 3, borderColor: '#ffffff' },
  heroName: { fontSize: 18, fontWeight: '800', color: '#111827', marginTop: 12 },
  heroEmail: { color: '#334155', marginTop: 4 },
  chipsRow: { flexDirection: 'row', marginTop: 10 },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1, marginRight: 8 },
  chipText: { fontSize: 12, fontWeight: '700' },
  chipVerified: { backgroundColor: '#f0fdf4', borderColor: '#dcfce7' },

  section: { marginTop: -40, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#6b7280', marginBottom: 8, marginLeft: 4 },
  infoItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', padding: 12, marginBottom: 8 },
  infoIcon: { marginRight: 10 },
  infoLabel: { flex: 1, fontWeight: '600' },
  infoValue: { fontWeight: '700' },

  emptyCard: { borderRadius: 12, borderWidth: 1, padding: 16, alignItems: 'center' },
  emptyText: {},
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, marginTop: 12 },
  logoutBtn: {},
  btnText: { fontWeight: '700' },
});