import axios from 'axios';

// EQuran v2 - Surah & Tafsir
const EQURAN_V2_BASE = 'https://equran.id/api/v2';

export async function getSurahList() {
  const { data } = await axios.get(`${EQURAN_V2_BASE}/surat`);
  return Array.isArray(data?.data) ? data.data : data;
}

export async function getSurahDetail(nomor) {
  const { data } = await axios.get(`${EQURAN_V2_BASE}/surat/${encodeURIComponent(nomor)}`);
  return data?.data ?? data;
}

export async function getTafsir(nomor) {
  const { data } = await axios.get(`${EQURAN_V2_BASE}/tafsir/${encodeURIComponent(nomor)}`);
  return data?.data ?? data;
}

// Alias kompatibilitas: "Surat" -> fungsi "Surah"
export async function getSuratList() { return getSurahList(); }
export async function getSuratDetail(nomor) { return getSurahDetail(nomor); }