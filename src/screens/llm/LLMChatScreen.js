import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { chatLLM } from '../../api/llm';
import { theme } from '../../ui';

export default function LLMChatScreen() {
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
      setMessages([...newMessages, { role: 'assistant', content: `Terjadi kesalahan: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Asisten LLM</Text>
      <Text style={styles.subtitle}>Diskusikan surah, tafsir, doa, dan hadits (demo)</Text>
      <ScrollView style={styles.chat} contentContainerStyle={styles.chatInner}>
        {messages.filter(m => m.role !== 'system').map((m, idx) => (
          <View key={idx} style={[styles.bubble, m.role === 'user' ? styles.userBubble : styles.assistantBubble]}>
            <Text style={styles.bubbleText}>{m.content}</Text>
          </View>
        ))}
        {loading && (
          <View style={[styles.bubble, styles.assistantBubble]}>
            <Text style={styles.bubbleText}>Mengetik…</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Tulis pertanyaan"
        />
        <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}>
          <Text style={styles.sendText}>Kirim</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f8fafc' },
  title: { fontSize: 22, fontWeight: '800', color: '#111' },
  subtitle: { color: '#64748b', marginTop: 4, marginBottom: 12 },
  chat: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12 },
  chatInner: { padding: 12 },
  bubble: { maxWidth: '90%', borderRadius: 12, padding: 10, marginBottom: 10 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: theme.colors.primary },
  assistantBubble: { alignSelf: 'flex-start', backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  bubbleText: { color: '#111' },
  inputRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  input: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8 },
  sendBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, backgroundColor: theme.colors.primaryDark },
  sendText: { color: '#fff', fontWeight: '700' },
});