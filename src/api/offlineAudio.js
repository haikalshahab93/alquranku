// Penyimpanan audio offline: satu MP3 per surah dari quran.com + timing kata,
// agar Mode Karaoke tetap berfungsi tanpa internet.
// - Android/iOS: file di documentDirectory/offline-audio/<reciterId>/quran-<reciterId>-<surah>.mp3
// - Web: MP3 disimpan sebagai Blob di IndexedDB (db "info_alquran_audio");
//   waktu pemutaran dibuat object URL dari Blob itu.
// Metadata + verse_timings (payload besar!) disimpan via bigStore (file system
// / IndexedDB) — BUKAN AsyncStorage, karena SQLite-nya cepat penuh (SQLITE_FULL).
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { fetchChapterAudioData } from './quranAudio.js';
import { bigGetItem, bigSetItem, bigRemoveItem, bigGetAllKeys } from './bigStore.js';

const AUDIO_DIR = 'offline-audio';

// ---------------- IndexedDB khusus Blob audio (web) ----------------
const WEB_DB_NAME = 'info_alquran_audio';
let webDbPromise = null;

function webOpenDb() {
  if (webDbPromise) return webDbPromise;
  webDbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(WEB_DB_NAME, 1);
    req.onupgradeneeded = () => {
      try { req.result.createObjectStore('audio'); } catch {}
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('indexedDB gagal dibuka'));
  });
  return webDbPromise;
}

async function webTx(mode, fn) {
  const db = await webOpenDb();
  return await new Promise((resolve, reject) => {
    try {
      const tx = db.transaction('audio', mode);
      const req = fn(tx.objectStore('audio'));
      if (req) {
        // Untuk get/put/delete: resolve di request itu sendiri.
        // (tx.oncomplete kadang terjadi sebelum/selaras pembacaan result;
        //  resolvemas lewat req menjamin nilai Blob benar-benar terbaca.)
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      } else {
        tx.oncomplete = () => resolve();
      }
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('indexedDB dibatalkan'));
    } catch (e) { reject(e); }
  });
}

// Gagal tulis HARUS diberitahu ke pemanggil (kuota penuh, dsb.) — jangan ditelan.
function webPut(key, blob) {
  return webTx('readwrite', (store) => { store.put(blob, key); });
}

async function webGet(key) {
  const v = await webTx('readonly', (store) => store.get(key));
  return v instanceof Blob ? v : null;
}

async function webHas(key) {
  const b = await webGet(key);
  return !!b;
}

function webDel(key) {
  return webTx('readwrite', (store) => { store.delete(key); }).catch(() => {});
}

function fileUriFor(reciterId, surah) {
  const dir = `${FileSystem.documentDirectory}${AUDIO_DIR}/${reciterId}`;
  return { dir, file: `${dir}/quran-${reciterId}-${surah}.mp3` };
}

function metaKeyFor(reciterId, surah) {
  return `offline_audio_meta_${reciterId}_${surah}`;
}

// Blob tidak butuh key data (Blob disimpan langsung dengan metaKey sama,
// supaya satu tempat: key meta di bigStore menyimpan JSON, key yang sama di
// IDB web menyimpan Blob-nya).
const isWeb = () => Platform.OS === 'web' && typeof indexedDB !== 'undefined';

// Cache object URL per (reciter:surah) — jangan buat ulang saat bolak-balik surah
const blobUrlCache = new Map();

/** Cek apakah surah sudah tersimpan offline untuk reciter tertentu. */
export async function isAudioSavedOffline(surah, reciterId) {
  try {
    const raw = await bigGetItem(metaKeyFor(reciterId, surah));
    if (!raw) return null;
    const meta = JSON.parse(raw);
    if (!meta) return null;
    if (isWeb()) {
      return (await webHas(metaKeyFor(reciterId, surah))) ? meta : null;
    }
    if (!meta?.uri) return null;
    const info = await FileSystem.getInfoAsync(meta.uri);
    return info.exists ? meta : null; // file terhapus manual -> anggap tidak ada
  } catch {
    return null;
  }
}

/**
 * Unduh MP3 surah + simpan timing kata. onProgress dipanggil dengan angka 0..1.
 * Web: fetch dengan streaming reader agar progress tetap hidup; MP3 jadi Blob.
 * Native: createDownloadResumable (punya callback progress; downloadAsync polos tidak).
 * Mengembalikan metadata yang tersimpan.
 */
export async function downloadSurahAudio(surah, reciterId, onProgress) {
  const data = await fetchChapterAudioData(surah, reciterId); // URL relatif sudah dinormalisasi di modul sumber
  if (!data.audioUrl) throw new Error('URL audio tidak tersedia');

  const cb = typeof onProgress === 'function'
    ? (p) => {
        try {
          const total = p?.totalBytesExpectedToSend || p?.totalBytesExpected || 0;
          onProgress(total > 0 ? Math.min(1, (p?.totalBytesWritten || 0) / total) : 0);
        } catch {}
      }
    : undefined;

  const metaBase = {
    surah: Number(surah),
    reciterId,
    duration: data.duration || 0,
    verseTimings: data.verseTimings,
    savedAt: Date.now(),
  };

  if (isWeb()) {
    // Web: streaming unduh manual agar progress bisa dilaporkan
    const res = await fetch(data.audioUrl);
    if (!res.ok) throw new Error(`Gagal mengunduh audio (${res.status})`);
    const total = Number(res.headers.get('content-length') || 0);
    let received = 0;
    const chunks = [];
    if (res.body && res.body.getReader) {
      const reader = res.body.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          received += value.length;
          if (cb) cb({ totalBytesWritten: received, totalBytesExpected: total });
        }
      }
    } else {
      // Browser lawas tanpa stream: unduh penuh sekaligus
      const buf = await res.arrayBuffer();
      chunks.push(new Uint8Array(buf));
      received = buf.byteLength;
      if (cb) cb({ totalBytesWritten: received, totalBytesExpected: received });
    }
    const blob = new Blob(chunks, { type: 'audio/mpeg' });
    await webPut(metaKeyFor(reciterId, surah), blob);
    const meta = { ...metaBase, bytes: total || blob.size };
    await bigSetItem(metaKeyFor(reciterId, surah), JSON.stringify(meta));
    return meta;
  }

  if (!FileSystem.documentDirectory) {
    throw new Error('Penyimpanan audio offline tidak tersedia di perangkat ini');
  }

  const { dir, file } = fileUriFor(reciterId, surah);
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(() => {});
  // createDownloadResumable memberi callback progress (downloadAsync polos tidak punya)
  const resumable = FileSystem.createDownloadResumable(data.audioUrl, file, {}, cb);
  const res = await resumable.downloadAsync();
  const meta = {
    ...metaBase,
    uri: res.uri,
    bytes: res.status === 200 ? (res.headers && res.headers['Content-Length'] ? Number(res.headers['Content-Length']) : 0) : 0,
  };
  // verseTimings bisa berukuran MB — wajib via bigStore (file), bukan SQLite
  await bigSetItem(metaKeyFor(reciterId, surah), JSON.stringify(meta));
  return meta;
}

/** Hapus audio offline satu surah. */
export async function deleteSurahAudio(surah, reciterId) {
  try {
    if (isWeb()) {
      await webDel(metaKeyFor(reciterId, surah));
    } else {
      const raw = await bigGetItem(metaKeyFor(reciterId, surah));
      if (raw) {
        const meta = JSON.parse(raw);
        if (meta?.uri) await FileSystem.deleteAsync(meta.uri, { idempotent: true });
      }
    }
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
        if (isWeb()) {
          if (await webHas(k)) out.push({ ...m, size: m.bytes || 0 });
        } else if (m?.uri) {
          const info = await FileSystem.getInfoAsync(m.uri);
          if (info.exists) out.push({ ...m, size: info.size || m.bytes || 0 });
        }
      } catch {}
    }
    return out;
  } catch {
    return [];
  }
}

/** Hapus semua audio offline (reuse deleteSurahAudio per entri). */
export async function deleteAllOfflineAudio() {
  const list = await listOfflineAudio();
  for (const m of list) {
    await deleteSurahAudio(m.surah, m.reciterId);
  }
  return list.length;
}

/**
 * Unduh audio semua 114 surah untuk satu reciter (batch).
 * - Surah yang sudah tersimpan dilewati (aman diulang untuk melanjutkan unduhan).
 * - onProgress({ done, total, surah, failed }) dipanggil setelah tiap item.
 * - shouldCancel() dicek sebelum tiap item; return true untuk berhenti.
 * Return: { downloaded, skipped, failed, cancelled, reason }
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
    }
    if (typeof onProgress === 'function') {
      try { onProgress({ done: skipped + downloaded + failed, total: 114, surah, failed }); } catch {}
    }
  }
  return { downloaded, skipped, failed, cancelled, reason };
}

/** Pastikan Blob dari IndexedDB sudah berbentuk object URL yang bisa dimainkan. */
async function webBlobUrlFor(reciterId, surah) {
  const key = metaKeyFor(reciterId, surah);
  const cached = blobUrlCache.get(key);
  if (cached) return cached;
  const blob = await webGet(key);
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  blobUrlCache.set(key, url);
  return url;
}

/**
 * Data audio yang SUDAH tersimpan di perangkat (tanpa menyentuh jaringan).
 * Dipakai sebagai jalur cadangan karaoke maupun per-ayat saat tidak ada
 * koneksi/kuota. Return null bila memang tidak ada salinan yang bisa diputar.
 */
export async function getOfflineKaraokeAudioData(surah, reciterId) {
  const offline = await isAudioSavedOffline(surah, reciterId);
  if (!offline) return null;
  let audioUri = offline.uri || null; // file:// di native
  if (isWeb()) {
    audioUri = await webBlobUrlFor(reciterId, surah);
    if (!audioUri) {
      // Meta ada tapi Blob hilang (mis. storage browser dibersihkan):
      // buang sisa meta agar tidak dianggap tersimpan selamanya.
      try { await deleteSurahAudio(surah, reciterId); } catch {}
    }
  }
  if (!audioUri) return null;
  return {
    surah: Number(surah),
    reciterId,
    audioUrl: audioUri, // file:// di native, blob: URL di web
    duration: offline.duration || 0,
    verseTimings: offline.verseTimings || [],
    __offline: true,
  };
}

/**
 * Data audio untuk karaoke.
 * Urutan sumber: API quran.com DULU (streaming langsung, tidak menunggu
 * unduhan), lalu salinan offline hanya bila permintaan gagal karena tidak ada
 * koneksi/kuota. Audio offline tidak pernah "menang" atas API saat online
 * tersedia, supaya bacaan selalu segar dan tidak diam-diam memakai file lama.
 * Return: { ...data, __offline: boolean }
 */
export async function getKaraokeAudioData(surah, reciterId) {
  let onlineError = null;
  try {
    const online = await fetchChapterAudioData(surah, reciterId);
    return { ...online, __offline: false };
  } catch (e) {
    onlineError = e; // tanpa kuota / tanpa jaringan / server bermasalah
  }
  const offline = await getOfflineKaraokeAudioData(surah, reciterId);
  if (offline) return offline;
  throw onlineError || new Error('Audio karaoke tidak tersedia');
}
