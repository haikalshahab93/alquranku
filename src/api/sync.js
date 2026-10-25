// ============================================================
// KERANGKA SINKRONISASI ANTAR-HP (reusable)
// ============================================================
// Prinsipnya:
//  - OFFLINE-FIRST: semua data tetap di AsyncStorage lokal. Sinkronisasi
//    tidak pernah mengganti sumber data, hanya menyalin antara lokal
//    dan cloud saat sesi tersedia. Layar tetap bekerja tanpa internet.
//  - SATU TABEL CLOUD: data seperti bookmark / posisi baca / setelan
//    masing-masing = satu baris { user_id, key, value, updated_at } di
//    tabel user_data (lihat supabase/schema.sql) dengan RLS per pengguna.
//  - "SIAPA BARU MENANG": baris cloud diborong jam server, perubahan
//    lokal dicap timestamp saat markDirty() dipanggil. Versi dengan
//    timestamp paling baru menang. Perangkat yang lama tidak menyala
//    tetap aman — tidak akan menimpa data yang lebih baru di cloud.
//  - REUSABLE: tambah tipe data baru = tambah satu entri di DATASETS
//    di bawah. Tidak perlu mengubah logika sinkronisasi.
//
// Kredensial dibaca dari env build (EXPO_PUBLIC_SUPABASE_URL /
// EXPO_PUBLIC_SUPABASE_ANON_KEY). Kalau belum diisi, seluruh modul
// menjadi no-op yang aman — aplikasi jalan seperti sedia kala.
// ============================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { onSettingsChanged } from './settingsEvents';

// ---------- Kredensial ----------
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

function isConfigured() {
  return !!SUPABASE_URL && /^https?:\/\//.test(SUPABASE_URL) && !!SUPABASE_ANON_KEY && SUPABASE_ANON_KEY.length > 20;
}

let client = null;
function getSupabase() {
  if (!isConfigured()) return null;
  if (!client) {
    // require() lazy: aman dipanggil dari mana saja, termasuk web/preview
    const { createClient } = require('@supabase/supabase-js');
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: AsyncStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
  }
  return client;
}

// ---------- Registrasi dataset (kerangka utama) ----------
// Tambah tipe data baru = tambah satu entri di sini, logika lain tetap.
//   localKey  : kunci AsyncStorage tempat data asli disimpan
//   keys      : (alternatif) beberapa kunci yang digabung jadi satu JSON
//   merge     : saat ini 'lww' (whole-value last-write-wins)
export const DATASETS = {
  bookmarks: {
    localKey: 'quran_bookmarks',
    jsonParse: true,
  },
  active_collection: {
    localKey: 'quran_bookmarks_active_collection',
    jsonParse: false,
  },
  last_read: {
    localKey: 'last_read',
    jsonParse: true,
  },
  settings: {
    // Setelan = gabungan beberapa kunci AsyncStorage dalam satu JSON; snapshot
    // cloud TIDAK menghapus kunci yang tidak dikenalnya (tidak ada penipisan)
    keys: [
      'notif_prayer_enabled',
      'notif_prayer_offset',
      'notif_prayer_sound',
      'notif_prayer_perkey',
      'appearance:darkMode',
      'text_scale',
      'aladhan_method',
      'aladhan_timezonestring',
      'aladhan_tune',
      'aladhan_school',
      'aladhan_midnightMode',
      'aladhan_latitudeAdjustmentMethod',
      'aladhan_calendarMethod',
      'aladhan_shafaq',
    ],
    jsonParse: true,
  },
};

const DIRTY_PREFIX = 'sync:dirty:';      // 'sync:dirty:<key>' = '1' saat berubah
const TS_PREFIX = 'sync:ts:';            // 'sync:ts:<key>' = ms perubahan lokal terakhir

// ---------- API untuk layar ----------
// Panggil SETELAH menulis data lokal: tandainya "ada perubahan, antre
// sinkronkan". Aman dipanggil walau cloud belum dikonfigurasi.
export async function markDirty(datasetKey) {
  try {
    await AsyncStorage.setItem(`${DIRTY_PREFIX}${datasetKey}`, '1');
    await AsyncStorage.setItem(`${TS_PREFIX}${datasetKey}`, String(Date.now()));
  } catch {}
  scheduleSync();
}

// ---------- Sesi ----------
async function ensureSession(supabase) {
  try {
    const { data } = await supabase.auth.getSession();
    if (data?.session?.user) return data.session.user;
  } catch {}
  // Belum ada sesi Supabase → tukar token Google dari login yang sudah ada
  try {
    const idToken = await AsyncStorage.getItem('googleIdToken');
    if (!idToken) return null;
    const { data: res, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });
    if (error || !res?.user) return null;
    return res.user;
  } catch (e) {
    return null;
  }
}

// ---------- Baca/tulis per dataset ----------
async function localGet(ds) {
  try {
    if (ds.keys) {
      const out = {};
      const vals = await Promise.all(ds.keys.map((k) => AsyncStorage.getItem(k)));
      ds.keys.forEach((k, i) => { if (vals[i] != null) out[k] = vals[i]; });
      return Object.keys(out).length ? out : null;
    }
    const raw = await AsyncStorage.getItem(ds.localKey);
    if (raw == null) return null;
    if (ds.jsonParse) {
      try { return JSON.parse(raw); } catch { return { raw }; }
    }
    return raw;
  } catch {
    return null;
  }
}

async function localSet(ds, value) {
  try {
    if (ds.keys) {
      if (!value || typeof value !== 'object') return;
      for (const k of ds.keys) {
        if (value[k] != null) await AsyncStorage.setItem(k, value[k]);
      }
      return;
    }
    const raw = ds.jsonParse ? JSON.stringify(value) : value;
    await AsyncStorage.setItem(ds.localKey, raw);
  } catch {}
}

function awaitsEqual(a, b) {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

// ---------- Inti: satu siklus sinkronisasi ----------
let syncing = false;

export async function syncNow() {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, reason: 'no-config' };

  if (syncing) return { ok: false, reason: 'busy' };
  syncing = true;
  try {
    const user = await ensureSession(supabase);
    if (!user) return { ok: false, reason: 'no-session' };

    // Ambil seluruh baris milik pengguna (RLS membatasi otomatis)
    const { data: rows, error } = await supabase
      .from('user_data')
      .select('key, value, updated_at')
      .eq('user_id', user.id);
    if (error) return { ok: false, reason: 'db-error' };

    const remoteByKey = {};
    for (const r of rows || []) remoteByKey[r.key] = r;

    const upserts = [];
    for (const [dk, ds] of Object.entries(DATASETS)) {
      const remote = remoteByKey[dk] || null;
      const remoteTs = remote?.updated_at ? Date.parse(remote.updated_at) : 0;
      const remoteVal = remote ? remote.value : null;
      const localVal = await localGet(ds);
      let localTs = 0;
      try { localTs = parseInt(await AsyncStorage.getItem(`${TS_PREFIX}${dk}`), 10) || 0; } catch {}
      const dirty = (await AsyncStorage.getItem(`${DIRTY_PREFIX}${dk}`)) === '1';

      let resultVal = null;
      let resultTs = 0;

      if (remoteVal == null && localVal != null) {
        // Belum pernah tersimpan di cloud → kirim isi lokal
        resultVal = localVal; resultTs = localTs || Date.now();
      } else if (remoteVal != null && localVal == null) {
        // HP / instalasi baru → tarik isi cloud
        resultVal = remoteVal; resultTs = remoteTs;
      } else if (remoteVal != null && localVal != null) {
        if (remoteTs > localTs) {
          // Cloud lebih baru → pakai cloud (walau lokal dirty: perangkat lain
          // memang baru saja mengubahnya; keduanya beda jam server)
          resultVal = remoteVal; resultTs = remoteTs;
        } else if (dirty) {
          // Lokal berubah setelah sinkron terakhir → kirim lokal
          resultVal = localVal; resultTs = localTs || Date.now();
        } else {
          // Sudah sinkron sebelumnya → pakai cloud (idempoten)
          resultVal = remoteVal; resultTs = remoteTs;
        }
      }

      if (resultVal == null) {
        // Tidak ada data di kedua sisi — kecuali lokal dihapus sambil dirty
        // (mis. clear semua bookmark): kirim penghapusan ke cloud
        if (dirty) {
          try { await supabase.from('user_data').delete().match({ user_id: user.id, key: dk }); } catch {}
        }
        try { await AsyncStorage.setItem(`${DIRTY_PREFIX}${dk}`, '0'); } catch {}
        continue;
      }

      // Terapkan hasil final ke sisi yang kalah
      if (!awaitsEqual(resultVal, localVal)) await localSet(ds, resultVal);
      const shouldPush = remoteVal == null ? true : !awaitsEqual(resultVal, remoteVal);
      if (shouldPush) {
        upserts.push({ user_id: user.id, key: dk, value: resultVal, updated_at: new Date(resultTs || Date.now()).toISOString() });
      }
      try {
        await AsyncStorage.setItem(`${TS_PREFIX}${dk}`, String(Math.max(resultTs, localTs)));
        await AsyncStorage.setItem(`${DIRTY_PREFIX}${dk}`, '0');
      } catch {}
    }

    if (upserts.length) {
      const { error: upErr } = await supabase.from('user_data').upsert(upserts);
      if (upErr) return { ok: false, reason: 'db-error' };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: 'error' };
  } finally {
    syncing = false;
  }
}

// Debounce: perubahan cepat berturut-turut digabung jadi satu sinkron
let timer = null;
function scheduleSync() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    syncNow().catch(() => {});
  }, 1500);
}

// ---------- Pemasangan sekali di App root ----------
let installed = false;
export function installSync() {
  if (installed) return;
  installed = true;
  // Sinkron awal setelah app siap (biar tidak berebut dengan boot)
  setTimeout(() => { syncNow().catch(() => {}); }, 4000);
  // Setiap setelan berubah (Pengaturan/Tampilan/Notifikasi) → antre sinkron
  try { onSettingsChanged(() => { scheduleSync(); }); } catch {}
}
