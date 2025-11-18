import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontAwesome5 } from '@expo/vector-icons';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      // Demo-only: mark as logged in
      await AsyncStorage.setItem('loggedIn', '1');
      navigation.navigate('Home');
    } catch (e) {
      setError(e?.message || 'Gagal login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Masuk</Text>
        {!!error && <Text style={styles.error}>{error}</Text>}

        {/* social login buttons */}
        <View style={styles.socialRow}>
          <TouchableOpacity style={[styles.socialBtn, { backgroundColor: '#fff', borderColor: '#e2e8f0' }]} onPress={submit}>
            <FontAwesome5 name="google" size={16} color="#dc2626" style={{ marginRight: 8 }} />
            <Text style={styles.socialText}>Google</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.socialBtn, { backgroundColor: '#fff', borderColor: '#e2e8f0' }]} onPress={submit}>
            <FontAwesome5 name="apple" size={16} color="#0f172a" style={{ marginRight: 8 }} />
            <Text style={styles.socialText}>Apple</Text>
          </TouchableOpacity>
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
            placeholderTextColor="#64748b"
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
          />
        </View>
        <View style={styles.inputRow}>
          <FontAwesome5 name="lock" size={14} color="#64748b" style={styles.inputIcon} />
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Kata sandi"
            placeholderTextColor="#64748b"
            secureTextEntry={!showPassword}
            style={styles.input}
          />
          <TouchableOpacity onPress={() => setShowPassword(s => !s)} style={styles.eyeBtn}>
            <FontAwesome5 name={showPassword ? 'eye-slash' : 'eye'} size={14} color="#64748b" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.btn} onPress={submit} disabled={loading}>
          <Text style={styles.btnText}>{loading ? 'Memuat...' : 'Masuk'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.forgotBtn} onPress={() => {}}>
          <Text style={styles.forgotText}>Lupa kata sandi?</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.link} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.linkText}>Lewati dulu</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16, justifyContent: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0', padding: 16, maxWidth: 420, alignSelf: 'center', width: '100%', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3 },
  title: { fontSize: 22, fontWeight: '800', color: '#0f172a', marginBottom: 12, textAlign: 'center' },
  error: { color: '#ef4444', marginBottom: 8, textAlign: 'center' },

  socialRow: { flexDirection: 'row', gap: 12, justifyContent: 'center' },
  socialBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 16 },
  socialText: { color: '#334155', fontWeight: '700' },

  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 14 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e2e8f0' },
  dividerText: { marginHorizontal: 10, color: '#94a3b8', fontWeight: '700' },

  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, backgroundColor: '#fff', marginBottom: 12 },
  inputIcon: { marginLeft: 12, marginRight: 8 },
  input: { flex: 1, paddingHorizontal: 8, paddingVertical: 12, color: '#0f172a', fontSize: 16 },
  eyeBtn: { paddingHorizontal: 12, paddingVertical: 10 },

  btn: { backgroundColor: '#0ea5e9', borderRadius: 10, paddingVertical: 12, alignItems: 'center', shadowColor: '#0ea5e9', shadowOpacity: 0.25, shadowRadius: 6 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  forgotBtn: { marginTop: 10, alignItems: 'center' },
  forgotText: { color: '#64748b', fontWeight: '600' },

  link: { marginTop: 12, alignItems: 'center' },
  linkText: { color: '#64748b' },
});