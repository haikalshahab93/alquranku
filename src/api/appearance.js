// Pengaturan tampilan terpusat: dark mode + skala font (perbesar huruf ayat/tafsir).
// Skala font memakai kunci lama 'text_scale' (dipakai SurahDetail) agar preferensi
// lama tetap berlaku. Perubahan dipancarkan lewat settingsEvents sehingga layar
// yang sedang terbuka langsung mengikuti (tanpa polling).
//
// Pemakaian:
//   import { useAppearance, setDarkMode, setTextScale } from '../../api/appearance';
//   const { darkMode, textScale } = useAppearance();
//   const palette = getPalette(darkMode); // dari src/ui

import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { emitSettingsChanged, onSettingsChanged } from './settingsEvents';

// Kunci penyimpanan
const KEY_DARK = 'appearance:darkMode';
const KEY_TEXT_SCALE = 'text_scale'; // kunci lama: sudah dipakai SurahDetailScreen

// Batas skala font (sama dengan clamp di SurahDetail)
export const MIN_TEXT_SCALE = 0.8;
export const MAX_TEXT_SCALE = 1.6;

const clampScale = (v) => Math.min(MAX_TEXT_SCALE, Math.max(MIN_TEXT_SCALE, v));

export async function getDarkMode() {
  try {
    const v = await AsyncStorage.getItem(KEY_DARK);
    return v === '1';
  } catch {
    return false;
  }
}

export async function setDarkMode(enabled) {
  try {
    await AsyncStorage.setItem(KEY_DARK, enabled ? '1' : '0');
  } catch {}
  emitSettingsChanged();
}

/** Baca skala font tersimpan (default 1.0). */
export async function getTextScale() {
  try {
    const saved = await AsyncStorage.getItem(KEY_TEXT_SCALE);
    if (!saved) return 1;
    const v = parseFloat(saved);
    if (Number.isNaN(v)) return 1;
    return clampScale(v);
  } catch {
    return 1;
  }
}

/** Simpan skala font & beri tahu semua layar yang sedang tampil. */
export async function setTextScale(v) {
  const val = clampScale(Math.round(v * 10) / 10);
  try {
    await AsyncStorage.setItem(KEY_TEXT_SCALE, String(val));
  } catch {}
  emitSettingsChanged();
  return val;
}

/**
 * Hook: muat { darkMode, textScale } dan ikut berubah otomatis ketika
 * pengaturan tampilan diubah (event bus settingsEvents).
 */
export function useAppearance() {
  const [state, setState] = useState({ darkMode: false, textScale: 1, loaded: false });

  useEffect(() => {
    let alive = true;
    const reload = async () => {
      try {
        const [dark, scale] = await Promise.all([getDarkMode(), getTextScale()]);
        if (alive) setState({ darkMode: !!dark, textScale: scale, loaded: true });
      } catch {
        if (alive) setState((s) => ({ ...s, loaded: true }));
      }
    };
    reload();
    const off = onSettingsChanged(() => { reload(); });
    return () => { alive = false; off(); };
  }, []);

  return state;
}
