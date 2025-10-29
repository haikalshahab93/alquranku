import Constants from 'expo-constants';

// Konfigurasi LLM via Expo extra (aman tanpa menyimpan key di repo)
// Tambahkan di app.json atau app.config.js jika ingin mengaktifkan provider.
// contoh app.config.js:
// export default {
//   expo: {
//     extra: {
//       LLM_PROVIDER: 'openai',
//       OPENAI_API_KEY: process.env.EXPO_PUBLIC_OPENAI_API_KEY,
//       OPENAI_BASE_URL: 'https://api.openai.com/v1'
//     }
//   }
// };

const extra = (Constants?.expoConfig?.extra) || (Constants?.manifest?.extra) || global?.expo?.extra || {};
const LLM_PROVIDER = extra?.LLM_PROVIDER || 'mock';
const OPENAI_API_KEY = extra?.OPENAI_API_KEY || '';
const OPENAI_BASE_URL = extra?.OPENAI_BASE_URL || 'https://api.openai.com/v1';

// Pesan sederhana untuk mode mock
function mockReply(messages) {
  const last = messages?.[messages.length - 1]?.content || '';
  const intro = 'Saya Asisten LLM (mode demo). '
    + 'Untuk mengaktifkan penyedia sesungguhnya, set extra LLM_PROVIDER dan API key di konfigurasi Expo.';
  if (!last) {
    return `${intro}\nSilakan tulis pertanyaan terkait surah, tafsir, doa, atau hadits.`;
  }
  const suggestion = last.length > 160 ? last.slice(0, 160) + '…' : last;
  return `${intro}\nAnda menulis: "${suggestion}". Saran: coba sebutkan surah/ayat atau kitab hadits agar jawaban lebih spesifik.`;
}

export async function chatLLM(messages = []) {
  // Mode mock default (tanpa API key)
  if (LLM_PROVIDER === 'mock' || !OPENAI_API_KEY) {
    return { content: mockReply(messages) };
  }

  // Implementasi OpenAI Chat Completions
  if (LLM_PROVIDER === 'openai') {
    const url = `${OPENAI_BASE_URL}/chat/completions`;
    const payload = {
      model: 'gpt-3.5-turbo',
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      temperature: 0.2,
    };
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`LLM error: ${res.status} ${text}`);
    }
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content || '';
    return { content };
  }

  // Fallback
  return { content: mockReply(messages) };
}