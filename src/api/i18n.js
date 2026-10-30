// ============================================================
// KERANGKA DWIBAHASA (ID/EN) — reusable
// ============================================================
// Cara pakai di layar:
//   import { useI18n } from '../../api/i18n';
//   const { t, lang } = useI18n();
//   <Text>{t('home')}</Text>
//
// Aturan kerangkanya:
//  - Bahasa awal mengikuti bahasa HP ('system'), bisa diganti manual di
//    Pengaturan (tersimpan, tetap berlaku lintas buka-tutup aplikasi).
//  - Semua teks terdaftar di src/api/i18nTexts.js sebagai satu kamus
//    { kunci: { id: '...', en: '...' } } — tambah materi baru = tambah
//    entri kamus, tanpa mengubah logika.
//  - Kunci yang belum punya terjemahan EN otomatis jatuh ke teks ID
//    (tidak pernah menampilkan 'undefined' / '[key]').
//  - Ganti bahasa di Pengaturan memakai event settingsEvents, jadi semua
//    layar yang tampil langsung ikut berubah tanpa reload aplikasi.
// ============================================================

import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PLATFORM_LANG_VALUE, TEXTS } from './i18nTexts';
import { emitSettingsChanged, onSettingsChanged } from './settingsEvents';

const KEY_LANG = 'i18n:lang'; // 'system' | 'id' | 'en'

// Laporan bahasa default saat 'system': bahasa HP dikenali lewat Intl.
// Fallback aman kalau runtime tidak menyediakan Intl: Indonesia.
function detectDeviceLanguage() {
  try {
    const loc = Intl.DateTimeFormat().resolvedOptions().locale || '';
    return loc.toLowerCase().startsWith('en') ? 'en' : 'id';
  } catch {
    return 'id';
  }
}

export async function getLanguageSetting() {
  try {
    const v = await AsyncStorage.getItem(KEY_LANG);
    return PLATFORM_LANG_VALUE.includes(v) ? v : 'system';
  } catch {
    return 'system';
  }
}

// Bahasa efektif yang dipakai untuk render ('id' | 'en')
export async function getEffectiveLanguage() {
  const setting = await getLanguageSetting();
  if (setting === 'id' || setting === 'en') return setting;
  return detectDeviceLanguage();
}

// Setel preferensi: 'system' | 'id' | 'en'. Selalu pancarkan event agar
// seluruh layar yang sedang tampil ikut berganti bahasa secara langsung.
export async function setLanguageSetting(value) {
  const v = PLATFORM_LANG_VALUE.includes(value) ? value : 'system';
  try { await AsyncStorage.setItem(KEY_LANG, v); } catch {}
  emitSettingsChanged();
  return v;
}

// Terjemahan satu kunci. Opsi vars untuk {nama} dsb.
export function translate(lang, key, vars) {
  // Simpan bahasa terakhir yang dipakai render agar modul non-hook
  // (penyimpanan, notifikasi, dll) bisa memakai bahasa aktif via getLangNow().
  if (lang === 'id' || lang === 'en') currentLang = lang;
  const entry = TEXTS[key];
  let out = (entry && (entry[lang] ?? entry.id)) ?? key;
  if (vars && typeof out === 'string') {
    for (const [k, v] of Object.entries(vars)) {
      out = out.split(`{${k}}`).join(String(v));
    }
  }
  return out;
}

// Bahasa terkini yang terakhir dipakai render ('id' | 'en').
// Untuk modul yang tak bisa memakai hook useI18n (bigStore, notifications).
let currentLang = 'id';
export function getLangNow() {
  return currentLang;
}
// Terjemahan memakai bahasa terkini (tanpa hook).
export function tNow(key, vars) {
  return translate(currentLang, key, vars);
}

// Hook: { lang, setting, t } — layar ikut re-render saat bahasa diganti.
export function useI18n() {
  const [state, setState] = useState({ lang: 'id', setting: 'system' });
  useEffect(() => {
    let alive = true;
    const reload = async () => {
      const [setting, lang] = await Promise.all([getLanguageSetting(), getEffectiveLanguage()]);
      if (alive) setState({ setting, lang });
    };
    reload();
    const off = onSettingsChanged(reload);
    return () => { alive = false; off(); };
  }, []);
  const t = (key, vars) => translate(state.lang, key, vars);
  return { lang: state.lang, setting: state.setting, t };
}
