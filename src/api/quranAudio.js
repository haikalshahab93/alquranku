import AsyncStorage from '@react-native-async-storage/async-storage';
import { bigGetItem, bigSetItem } from './bigStore';

// Sumber audio "Karaoke" dari quran.com (qdc): satu file MP3 per surah +
// verse_timings (mulai/akhir ayat) + segments per kata [wordPosition, fromMs, toMs].
// Dipakai untuk highlight kata aktif yang akurat mengikuti bacaan.
const QDC_BASE = 'https://api.quran.com/api/qdc';

// Cache memori per (reciter:chapter) agar tidak fetch ulang saat bolak-balik surah
const audioDataCache = new Map();

/** Daftar reciter quran.com yang punya file audio (di-cache via bigStore, TTL 7 hari). */
const RECITERS_CACHE_KEY = 'cache:quran:karaoke_reciters';
const RECITERS_TTL_MS = 7 * 24 * 60 * 60 * 1000;

async function fetchRecitersList() {
  const res = await fetch(`${QDC_BASE}/audio/reciters`);
  if (!res.ok) throw new Error(`Gagal memuat daftar reciter (${res.status})`);
  const json = await res.json();
  const list = Array.isArray(json?.reciters) ? json.reciters : [];
  // pilih field yang konsisten: id, name, style.name
  return list
    .filter(r => r && typeof r.id === 'number' && r.name)
    .map(r => ({
      id: r.id,
      name: r.name,
      style: (r.style && r.style.name) || '',
    }));
}

async function readRecitersCache(allowStale = false) {
  try {
    // Cache daftar reciter -> bigStore (file), bukan AsyncStorage (SQLITE_FULL risk)
    const raw = await bigGetItem(RECITERS_CACHE_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (!obj || typeof obj.ts !== 'number' || !Array.isArray(obj.list)) return null;
    const expired = Date.now() - obj.ts > RECITERS_TTL_MS;
    if (expired && !allowStale) return null;
    return obj.list;
  } catch {
    return null;
  }
}

async function writeRecitersCache(list) {
  try {
    await bigSetItem(RECITERS_CACHE_KEY, JSON.stringify({ ts: Date.now(), list }));
  } catch {}
}

/** Daftar reciter karaoke yang tersedia (dari cache dulu, lalu fetch jika perlu). */
export async function getKaraokeReciters(allowStale = false) {
  let list = await readRecitersCache(allowStale);
  if (!list) {
    try {
      list = await fetchRecitersList();
      await writeRecitersCache(list);
    } catch {
      list = await readRecitersCache(true); // fallback stale
    }
  }
  return list || [];
}

/** Setel reciter aktif untuk karaoke; tersimpan di AsyncStorage. */
export const KARAOKE_RECITER_KEY = 'karaoke_reciter_id';

export async function getPreferredKaraokeReciter() {
  try {
    const id = await AsyncStorage.getItem(KARAOKE_RECITER_KEY);
    if (id) return parseInt(id, 10);
  } catch {}
  return 7; // default: Mishary Rashid al-`Afasy
}

export async function setPreferredKaraokeReciter(id) {
  try {
    await AsyncStorage.setItem(KARAOKE_RECITER_KEY, String(id));
  } catch {}
}

export async function fetchChapterAudioData(chapterNumber, reciterId = 7) {
  const key = `${reciterId}:${chapterNumber}`;
  if (audioDataCache.has(key)) return audioDataCache.get(key);
  const res = await fetch(`${QDC_BASE}/audio/reciters/${reciterId}/audio_files?chapter=${chapterNumber}&segments=true`);
  if (!res.ok) throw new Error(`Gagal memuat audio quran.com (${res.status})`);
  const json = await res.json();
  // audio_files bisa berupa array 1 elemen atau objek langsung
  const af = Array.isArray(json?.audio_files) ? json.audio_files[0] : json?.audio_files;
  const data = {
    reciterId,
    audioUrl: af?.audio_url || null,
    duration: af?.duration || 0,
    // verse_timings: [{ verse_key: '2:255', timestamp_from, timestamp_to, segments: [[pos,from,to],...] }]
    verseTimings: af?.verse_timings || [],
  };
  if (!data.audioUrl || !data.verseTimings.length) {
    throw new Error('Data audio/timing quran.com tidak lengkap');
  }
  audioDataCache.set(key, data);
  return data;
}

// Timing satu ayat dari verse_key "surah:ayat"
export function findVerseTiming(audioData, surah, ayahNumber) {
  if (!audioData?.verseTimings?.length) return null;
  const key = `${surah}:${ayahNumber}`;
  return audioData.verseTimings.find((v) => v.verse_key === key) || null;
}

// Posisi kata aktif (1-based) pada posisi audio (ms) dalam satu ayat.
// segments: [[wordPosition, fromMs, toMs], ...]
export function wordPosAt(timing, positionMs) {
  if (!timing?.segments?.length) return -1;
  const segs = timing.segments;
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i];
    if (!s || s.length < 3) continue;
    const from = s[1];
    const to = s[2];
    if (positionMs >= from && positionMs <= to) return s[0] || i + 1;
  }
  // Sebelum segmen pertama / di celah antar kata: pakai kata terdekat
  if (positionMs < segs[0][1]) return segs[0][0] || 1;
  const last = segs[segs.length - 1];
  return last[0] || segs.length;
}

// Pecah teks Arab jadi token kata untuk render per kata.
export function splitArabicWords(text) {
  return String(text || '')
    .split(/\s+/)
    .filter(Boolean);
}
