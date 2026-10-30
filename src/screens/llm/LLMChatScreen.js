import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { chatLLM } from '../../api/llm';
import { theme, getPalette } from '../../ui';
import { useAppearance } from '../../api/appearance';
import { useI18n } from '../../api/i18n';

export default function LLMChatScreen() {
  const { darkMode } = useAppearance();
  // Dwibahasa: judul, subtitle, placeholder, dan tombol mengikuti bahasa aktif.
  const { t } = useI18n();
  const pal = getPalette(darkMode);
  const [messages, setMessages] = useState([
    { role: 'system', content: 'Anda adalah asisten untuk aplikasi ALQURANKU. Jawab singkat dan relevan.' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text) return;
    const newMessages = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    try {
      const reply = await chatLLM(newMessages);
      setMessages([...newMessages, { role: 'assistant', content: reply.content }]);
    } catch (err) {
      setMessages([...newMessages, { role: 'assistant', content: `${t('common.error')}: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: pal.colors.bg }]}>
      <Text style={[styles.title, { color: pal.colors.text }]}>{t('llm.judul')}</Text>
      <Text style={[styles.subtitle, { color: pal.colors.muted }]}>{t('llm.subtitle')}</Text>
      <ScrollView style={[styles.chat, { backgroundColor: pal.colors.surface, borderColor: pal.colors.surfaceBorder }]} contentContainerStyle={styles.chatInner}>
        {messages.filter(m => m.role !== 'system').map((m, idx) => (
          <View key={idx} style={[styles.bubble, m.role === 'user' ? { backgroundColor: theme.colors.primary } : { backgroundColor: pal.colors.surface, borderWidth: 1, borderColor: pal.colors.surfaceBorder }]}>
            <Text style={[styles.bubbleText, m.role === 'assistant' && { color: pal.colors.text }]}>{m.content}</Text>
          </View>
        ))}
        {loading && (
          <View style={[styles.bubble, { backgroundColor: pal.colors.surface, borderWidth: 1, borderColor: pal.colors.surfaceBorder }]}>
            <Text style={[styles.bubbleText, { color: pal.colors.text }]}>{t('llm.mengetik')}</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.inputRow}>
        <TextInput
          style={[styles.input, { backgroundColor: pal.colors.surface, borderColor: pal.colors.surfaceBorder, color: pal.colors.text }]}
          value={input}
          onChangeText={setInput}
          placeholder={t('llm.tulisPertanyaan')}
          placeholderTextColor={pal.colors.muted}
        />
        <TouchableOpacity style={[styles.sendBtn, { backgroundColor: theme.colors.primaryDark }]} onPress={sendMessage}>
          <Text style={styles.sendText}>{t('llm.kirim')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 22, fontWeight: '800' },
  subtitle: { marginTop: 4, marginBottom: 12 },
  chat: { flex: 1, borderWidth: 1, borderRadius: 12 },
  chatInner: { padding: 12 },
  bubble: { maxWidth: '90%', borderRadius: 12, padding: 10, marginBottom: 10 },
  bubbleText: { color: '#fff' },
  inputRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  input: { flex: 1, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8 },
  sendBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10 },
  sendText: { color: '#fff', fontWeight: '700' },
});