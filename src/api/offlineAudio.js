// Penyimpanan audio offline: satu MP3 per surah dari quran.com + timing kata,
// agar Mode Karaoke tetap berfungsi tanpa internet.
// File disimpan di documentDirectory/offline-audio/<reciterId>/quran-<reciterId>-<surah>.mp3
// Metadata + verse_timings (payload besar!) disimpan via bigStore (file system) —
// BUKAN AsyncStorage, karena SQLite-nya cepat penuh (error SQLITE_FULL).
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { fetchChapterAudioData } from './quranAudio';
import { bigGetItem, bigSetItem, bigRemoveItem, bigGetAllKeys } from './bigStore';

// Pesan error khusus untuk web/preview: expo-file-system tidak punya
// documentDirectory di browser, jadi unduhan MP3 ke storage tidak bisa.
const WEB_UNSUPPORTED = 'Unduhan audio offline hanya tersedia di aplikasi Android/iOS — di browser, audio tetap diputar streaming (perlu internet).';

const AUDIO_DIR = 'offline-audio';

function fileUriFor(reciterId, surah) {
  const dir = `${FileSystem.documentDirectory}${AUDIO_DIR}/${reciterId}`;
  return { dir, file: `${dir}/quran-${reciterId}-${surah}.mp3` };
}

function metaKeyFor(reciterId, surah) {
  return `offline_audio_meta_${reciterId}_${surah}`;
}

/** Cek apakah surah sudah tersimpan offline untuk reciter tertentu. */
export async function isAudioSavedOffline(surah, reciterId) {
  try {
    const raw = await bigGetItem(metaKeyFor(reciterId, surah));
    if (!raw) return null;
    const meta = JSON.parse(raw);
    if (!meta?.uri) return null;
    const info = await FileSystem.getInfoAsync(meta.uri);
    return info.exists ? meta : null; // file terhapus manual -> anggap tidak ada
  } catch {
    return null;
  }
}

/**
 * Unduh MP3 surah + simpan timing kata. onProgress dipanggil dengan angka 0..1.
 * Mengembalikan metadata yang tersimpan.
 */
export async function downloadSurahAudio(surah, reciterId, onProgress) {
  if (Platform.OS === 'web' || !FileSystem.documentDirectory) {
    throw new Error(WEB_UNSUPPORTED);
  }
  const data = await fetchChapterAudioData(surah, reciterId); // URL relatif sudah dinormalisasi di modul sumber
  if (!data.audioUrl) throw new Error('URL audio tidak tersedia');
  const { dir, file } = fileUriFor(reciterId, surah);
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(() => {});
  const cb = typeof onProgress === 'function'
    ? (p) => {
        try {
          const total = p?.totalBytesExpectedToSend || p?.totalBytesExpected || 0;
          onProgress(total > 0 ? Math.min(1, (p?.totalBytesWritten || 0) / total) : 0);
        } catch {}
      }
    : undefined;
  // createDownloadResumable memberi callback progress (downloadAsync polos tidak punya)
  const resumable = FileSystem.createDownloadResumable(data.audioUrl, file, {}, cb);
  const res = await resumable.downloadAsync();
  const meta = {
    surah: Number(surah),
    reciterId,
    uri: res.uri,
    duration: data.duration || 0,
    verseTimings: data.verseTimings,
    bytes: res.status === 200 ? (res.headers && res.headers['Content-Length'] ? Number(res.headers['Content-Length']) : 0) : 0,
    savedAt: Date.now(),
  };
  // verseTimings bisa berukuran MB — wajib via bigStore (file), bukan SQLite
  await bigSetItem(metaKeyFor(reciterId, surah), JSON.stringify(meta));
  return meta;
}

/** Hapus audio offline satu surah. */
export async function deleteSurahAudio(surah, reciterId) {
  try {
    const raw = await bigGetItem(metaKeyFor(reciterId, surah));
    if (!raw) return;
    const meta = JSON.parse(raw);
    if (meta?.uri) await FileSystem.deleteAsync(meta.uri, { idempotent: true });
    await bigRemoveItem(metaKeyFor(reciterId, surah));
  } catch {}
}

/** Daftar semua audio offline (semua reciter) untuk ringkasan/manajemen. */
export async function listOfflineAudio() {
  try {
    const metaKeys = await bigGetAllKeys('offline_audio_meta_');
    const out = [];
    for (const k of metaKeys) {
      try {
        const raw = await bigGetItem(k);
        if (!raw) continue;
        const m = JSON.parse(raw);
        const info = await FileSystem.getInfoAsync(m.uri);
        if (info.exists) out.push({ ...m, size: info.size || m.bytes || 0 });
      } catch {}
    }
    return out;
  } catch {
    return [];
  }
}

/** Hapus semua audio offline. */
export async function deleteAllOfflineAudio() {
  const list = await listOfflineAudio();
  for (const m of list) {
    try { await FileSystem.deleteAsync(m.uri, { idempotent: true }); } catch {}
    try { await bigRemoveItem(metaKeyFor(m.reciterId, m.surah)); } catch {}
  }
  return list.length;
}

/**
 * Unduh audio semua 114 surah untuk satu reciter (batch).
 * - Surah yang sudah tersimpan dilewati (aman diulang untuk melanjutkan unduhan).
 * - onProgress({ done, total, surah, failed }) dipanggil setelah tiap item.
 * - shouldCancel() dicek sebelum tiap item; return true untuk berhenti.
 * Return: { downloaded, skipped, failed, cancelled }
 */
export async function downloadAllSurahAudio(reciterId, onProgress, shouldCancel) {
  let downloaded = 0, skipped = 0, failed = 0, cancelled = false;
  let reason = '';
  for (let surah = 1; surah <= 114; surah++) {
    if (typeof shouldCancel === 'function' && shouldCancel()) { cancelled = true; break; }
    try {
      const existing = await isAudioSavedOffline(surah, reciterId);
      if (existing) {
        skipped++;
      } else {
        await downloadSurahAudio(surah, reciterId);
        downloaded++;
      }
    } catch (e) {
      failed++; // lanjut ke surah berikutnya; yang gagal bisa diulang nanti
      if (!reason) reason = e?.message || 'Gagal tidak diketahui';
      // Jika penyebabnya struktural (web/tidak ada storage), tidak ada gunanya lanjut 114x
      if (Platform.OS === 'web' || !FileSystem.documentDirectory) break;
    }
    if (typeof onProgress === 'function') {
      try { onProgress({ done: skipped + downloaded + failed, total: 114, surah, failed }); } catch {}
    }
  }
  return { downloaded, skipped, failed, cancelled, reason };
}

/**
 * Data audio untuk karaoke: offline dulu (meta tersimpan), baru online.
 * Return: { ...data, __offline: boolean }
 */
export async function getKaraokeAudioData(surah, reciterId) {
  const offline = await isAudioSavedOffline(surah, reciterId);
  if (offline) {
    return {
      reciterId,
      audioUrl: offline.uri, // file:// — bisa dimuat expo-audio langsung
      duration: offline.duration || 0,
      verseTimings: offline.verseTimings || [],
      __offline: true,
    };
  }
  const online = await fetchChapterAudioData(surah, reciterId);
  return { ...online, __offline: false };
}
