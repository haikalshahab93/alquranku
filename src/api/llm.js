import Constants from 'expo-constants';
import { getSurahList, getSurahDetail, getTafsir } from './quran';
import { getDoaList, getDoaDetail } from './doa';
import { getHaditsArbainNomor, getHaditsArbainAcak, getHaditsBmNomor, getHaditsBmAcak } from './hadits';

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

// Provider BUILTIN (gratis) menggunakan API Quran/Doa/Hadits
async function builtinReply(messages) {
  const last = messages?.[messages.length - 1]?.content || '';
  const q = last.trim();
  if (!q) {
    return 'Tulis pertanyaan, misalnya: "tafsir surah 1", "surah Al-Fatihah ayat 2", "doa tidur", atau "arbain nomor 10".';
  }
  const lc = q.toLowerCase();
  try {
    // Tafsir Surah
    if (lc.includes('tafsir')) {
      // cari nomor surah di teks
      const numMatch = lc.match(/\b(\d{1,3})\b/);
      let nomor = numMatch ? parseInt(numMatch[1], 10) : null;
      if (!nomor) {
        // coba dari nama surah
        const list = await getSurahList();
        const found = list.find(s => [s?.nama_latin, s?.nama].some(n => n && lc.includes(String(n).toLowerCase())));
        nomor = found?.nomor || found?.number || null;
      }
      if (!nomor) return 'Mohon sebutkan nomor atau nama surah untuk tafsir. Contoh: "tafsir surah 1" atau "tafsir Al-Fatihah".';
      const tf = await getTafsir(nomor);
      const ringkas = Array.isArray(tf?.tafsir) ? tf.tafsir.slice(0, 2).map(t => `Ayat ${t?.ayat}: ${t?.teks}`).join('\n\n') : 'Tafsir tidak tersedia.';
      return `Tafsir Surah ${tf?.nama_latin || tf?.nama || nomor}:\n\n${ringkas}`;
    }

    // Surah Ayat
    if (lc.includes('surah') && lc.includes('ayat')) {
      const numSurah = lc.match(/surah\s+(\d{1,3})/);
      const numAyat = lc.match(/ayat\s+(\d{1,3})/);
      let nomor = numSurah ? parseInt(numSurah[1], 10) : null;
      let ayat = numAyat ? parseInt(numAyat[1], 10) : null;
      if (!nomor) {
        const list = await getSurahList();
        const found = list.find(s => [s?.nama_latin, s?.nama].some(n => n && lc.includes(String(n).toLowerCase())));
        nomor = found?.nomor || found?.number || null;
      }
      if (!nomor) return 'Mohon sebutkan nomor atau nama surah. Contoh: "surah 1 ayat 2" atau "surah Al-Fatihah ayat 2".';
      const detail = await getSurahDetail(nomor);
      const ay = Array.isArray(detail?.ayat) ? detail.ayat.find(a => a?.nomorAyat == ayat) : null;
      if (!ay) return `Ayat ${ayat} tidak ditemukan pada surah ${detail?.nama_latin || detail?.nama || nomor}.`;
      const teks = ay?.teksArab || ay?.teks || ay?.arab || '';
      const terjemah = ay?.teksIndonesia || ay?.id || ay?.terjemah || '';
      return `Surah ${detail?.nama_latin || detail?.nama || nomor} ayat ${ayat}:\n\n${teks}\n\nTerjemah: ${terjemah}`;
    }

    // Info ringkas Surah
    if (lc.includes('surah')) {
      const numMatch = lc.match(/\b(\d{1,3})\b/);
      let nomor = numMatch ? parseInt(numMatch[1], 10) : null;
      if (!nomor) {
        const list = await getSurahList();
        const found = list.find(s => [s?.nama_latin, s?.nama].some(n => n && lc.includes(String(n).toLowerCase())));
        nomor = found?.nomor || found?.number || null;
      }
      if (!nomor) return 'Mohon sebutkan nomor atau nama surah. Contoh: "surah 1" atau "surah Al-Fatihah".';
      const detail = await getSurahDetail(nomor);
      const jml = detail?.jumlahAyat || detail?.jumlah_ayat || detail?.numberOfAyah || detail?.jumlah || '?';
      return `Surah ${detail?.nama_latin || detail?.nama || nomor}: ${jml} ayat.`;
    }

    // Doa
    if (lc.includes('doa')) {
      const list = await getDoaList();
      // Ambil kata kunci sesudah "doa"
      const kw = (lc.split('doa')[1] || '').trim();
      let match = null;
      if (Array.isArray(list)) {
        match = list.find(d => ['judul','title','latin','arab','id','indo'].some(k => d?.[k] && String(d[k]).toLowerCase().includes(kw)));
      }
      if (!match) {
        // fallback ke detail id jika angka disebut
        const num = kw.match(/\b(\d{1,4})\b/);
        if (num) {
          const det = await getDoaDetail(parseInt(num[1],10));
          match = det?.data || null;
        }
      }
      if (!match) return 'Sebutkan nama/kata kunci doa, misalnya: "doa tidur", "doa qunut", atau angka ID doa.';
      const title = match?.judul || match?.title || 'Doa';
      const arab = match?.arab || match?.arabic || '';
      const indo = match?.indo || match?.id || match?.terjemah || '';
      return `${title}:\n\n${arab}\n\nTerjemah: ${indo}`;
    }

    // Hadits Arbain / BM
    if (lc.includes('arbain')) {
      const num = lc.match(/\b(\d{1,3})\b/);
      const data = num ? await getHaditsArbainNomor(parseInt(num[1],10)) : await getHaditsArbainAcak();
      const h = Array.isArray(data?.data) ? data.data[0] : data?.data || data;
      const teks = h?.arab || h?.matn || h?.teks || '';
      const indo = h?.id || h?.terjemah || '';
      return `Arbain${num?` nomor ${num[1]}`:''}:\n\n${teks}\n\nTerjemah: ${indo}`;
    }
    if (lc.includes('bm') || lc.includes('bulugh')) {
      const num = lc.match(/\b(\d{1,4})\b/);
      const data = num ? await getHaditsBmNomor(parseInt(num[1],10)) : await getHaditsBmAcak();
      const h = Array.isArray(data?.data) ? data.data[0] : data?.data || data;
      const teks = h?.arab || h?.matn || h?.teks || '';
      const indo = h?.id || h?.terjemah || '';
      return `Bulughul Maram${num?` nomor ${num[1]}`:''}:\n\n${teks}\n\nTerjemah: ${indo}`;
    }

    // Fallback bantuan
    return 'Saya dapat membantu dengan: tafsir surah, surah ayat tertentu, doa, atau hadits Arbain/BM. Contoh: "tafsir Al-Fatihah", "surah 1 ayat 2", "doa tidur", "arbain nomor 10".';
  } catch (err) {
    return `Maaf, terjadi kendala saat mengambil data: ${err?.message || err}`;
  }
}

export async function chatLLM(messages = []) {
  // Provider gratis
  if (LLM_PROVIDER === 'builtin') {
    const content = await builtinReply(messages);
    return { content };
  }
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