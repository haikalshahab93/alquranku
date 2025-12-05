import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontAwesome5 } from '@expo/vector-icons';
import { theme } from '../../ui';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import Constants from 'expo-constants';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const extra = Constants?.expoConfig?.extra || {};
  const isExpoGo = Constants?.appOwnership === 'expo';
  const expoOwner = Constants?.expoConfig?.owner;
  const expoSlug = Constants?.expoConfig?.slug;
  const expoProxyRedirectUri = isExpoGo && expoOwner && expoSlug ? `https://auth.expo.io/@${expoOwner}/${expoSlug}` : undefined;
  // Jika Expo Go, paksa gunakan proxy URL eksplisit
  const androidNativeRedirectUri = 'com.alfarisy.infoalquran:/oauth2redirect/google';
  const redirectUri = isExpoGo
    ? (expoProxyRedirectUri || AuthSession.makeRedirectUri({ useProxy: true }))
    : (Platform.OS === 'android' ? androidNativeRedirectUri : AuthSession.makeRedirectUri({ useProxy: false }));
  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId: extra.GOOGLE_CLIENT_ID || undefined,
    webClientId: extra.GOOGLE_CLIENT_ID || undefined,
    androidClientId: extra.GOOGLE_CLIENT_ID_ANDROID || undefined,
    iosClientId: isExpoGo ? undefined : (extra.GOOGLE_CLIENT_ID_IOS || undefined),
    scopes: ['openid', 'profile', 'email'],
  }, {
    useProxy: isExpoGo,
    redirectUri,
    projectNameForProxy: (expoOwner && expoSlug) ? `@${expoOwner}/${expoSlug}` : undefined,
  });
  console.log('[GoogleAuth] computed redirectUri', { isExpoGo, expoOwner, expoSlug, platform: Platform.OS, redirectUri, requestRedirect: request?.redirectUri });
  // Tambahkan log diagnostik untuk memastikan konfigurasi yang dipakai saat runtime
  console.log('[GoogleAuth] clientIds', {
    expoClientId: extra.GOOGLE_CLIENT_ID,
    webClientId: extra.GOOGLE_CLIENT_ID,
    androidClientId: extra.GOOGLE_CLIENT_ID_ANDROID,
    iosClientId: extra.GOOGLE_CLIENT_ID_IOS,
  });

  useEffect(() => {
    const handleResponse = async () => {
      if (response?.type === 'success') {
        try {
          setLoading(true);
          const accessToken = response.authentication?.accessToken;
          const idToken = response.authentication?.idToken;
          if (!accessToken) {
            throw new Error('Tidak ada access token dari Google.');
          }
          const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (!res.ok) {
            throw new Error('Gagal mengambil data user dari Google.');
          }
          const info = await res.json();
          const profile = {
            provider: 'google',
            name: info.name,
            email: info.email,
            picture: info.picture,
            sub: info.sub,
            emailVerified: info.email_verified,
            locale: info.locale,
            givenName: info.given_name,
            familyName: info.family_name,
          };
          await AsyncStorage.setItem('loggedIn', '1');
          await AsyncStorage.setItem('userProfile', JSON.stringify(profile));
          await AsyncStorage.setItem('googleAccessToken', accessToken);
          if (idToken) {
            await AsyncStorage.setItem('googleIdToken', idToken);
          }
          navigation.navigate('User');
        } catch (e) {
          setError(e?.message || 'Gagal login Google');
        } finally {
          setLoading(false);
        }
      }
    };

    handleResponse();
  }, [response]);

  const submit = async () => {
    setError(null);
    if (!email || !password) {
      setError('Email dan password wajib diisi');
      return;
    }
    setLoading(true);
    setTimeout(async () => {
      try {
        await AsyncStorage.setItem('loggedIn', '1');
        await AsyncStorage.setItem('userProfile', JSON.stringify({ provider: 'manual', name: 'Pengguna', email }));
        navigation.navigate('User');
      } catch (e) {
        setError('Gagal menyimpan sesi');
      } finally {
        setLoading(false);
      }
    }, 800);
  };

  const googleLogin = async () => {
    setError(null);
    // gunakan isExpoGo yang sudah didefinisikan di atas
    const hasWeb = !!extra.GOOGLE_CLIENT_ID;
    const hasAndroid = !!extra.GOOGLE_CLIENT_ID_ANDROID;
    const hasIos = !!extra.GOOGLE_CLIENT_ID_IOS;
    console.log('[GoogleAuth] env check', { isExpoGo, hasWeb, hasAndroid, hasIos, platform: Platform.OS, redirectUri: request?.redirectUri });
    
    if (Platform.OS === 'web' && !hasWeb) {
      setError('Google Client ID (Web) belum dikonfigurasi. Set EXPO_PUBLIC_GOOGLE_CLIENT_ID lalu restart dev server.');
      return;
    }
  
    if (Platform.OS === 'android') {
      if (isExpoGo && !hasWeb) {
        setError('Google Client ID (Expo/Web) belum dikonfigurasi. Set EXPO_PUBLIC_GOOGLE_CLIENT_ID dan tambahkan redirect https://auth.expo.io/@haikal2502/alquranku di Google Cloud.');
        return;
      }
      if (!isExpoGo && !hasAndroid) {
        setError('Google Client ID (Android) belum dikonfigurasi. Set EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID lalu build ulang.');
        return;
      }
    }
  
    if (Platform.OS === 'ios') {
      if (isExpoGo && !hasWeb) {
        setError('Google Client ID (Expo/Web) belum dikonfigurasi. Set EXPO_PUBLIC_GOOGLE_CLIENT_ID dan tambahkan redirect https://auth.expo.io/@haikal2502/alquranku di Google Cloud.');
        return;
      }
      if (!isExpoGo && !hasIos) {
        setError('Google Client ID (iOS) belum dikonfigurasi. Set EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS lalu build ulang.');
        return;
      }
    }
  
    // Paksa opsi proxy saat Expo Go untuk menghindari exp:// redirect dan gunakan URL proxy eksplisit
    await promptAsync({
      useProxy: isExpoGo,
      projectNameForProxy: (expoOwner && expoSlug) ? `@${expoOwner}/${expoSlug}` : undefined,
      redirectUri,
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Masuk</Text>
        {!!error && <Text style={styles.error}>{error}</Text>}

        {/* social login buttons */}
        <View style={styles.socialRow}>
          <TouchableOpacity style={[styles.socialBtn, { backgroundColor: '#fff', borderColor: '#e2e8f0' }]} onPress={googleLogin} disabled={loading || !request}>
            <FontAwesome5 name="google" size={16} color="#dc2626" style={{ marginRight: 8 }} />
            <Text style={styles.socialText}>{loading ? 'Memuat...' : 'Google'}</Text>
          </TouchableOpacity>
          {/* Hapus sementara tombol Apple login */}
        </View>

        {/* divider */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>atau</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* inputs with icons */}
        <View style={styles.inputRow}>
          <FontAwesome5 name="envelope" size={14} color="#64748b" style={styles.inputIcon} />
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            style={styles.input}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>
        <View style={styles.inputRow}>
          <FontAwesome5 name="lock" size={14} color="#64748b" style={styles.inputIcon} />
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            style={styles.input}
            secureTextEntry={!showPassword}
          />
        </View>
        <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={styles.showLink}>
          <Text style={styles.showText}>{showPassword ? 'Sembunyikan' : 'Tampilkan'} Password</Text>
        </TouchableOpacity>

        {/* submit */}
        <TouchableOpacity style={[styles.submitBtn, loading ? styles.submitBtnDisabled : null]} onPress={submit} disabled={loading}>
          <Text style={styles.submitText}>{loading ? 'Memuat...' : 'Masuk'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 12,
  },
  error: {
    color: '#dc2626',
    marginBottom: 12,
  },
  socialRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    flex: 1,
  },
  socialText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  dividerText: {
    marginHorizontal: 8,
    color: '#6b7280',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 40,
  },
  showLink: {
    alignSelf: 'flex-end',
    marginBottom: 12,
  },
  showText: {
    color: theme.colors.primary,
  },
  submitBtn: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitBtnDisabled: {
    backgroundColor: theme.colors.muted,
  },
  submitText: {
    color: '#fff',
    fontWeight: '700',
  },
});