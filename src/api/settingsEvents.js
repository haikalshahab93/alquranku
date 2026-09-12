// Event bus kecil untuk perubahan pengaturan antar layar.
// Menggantikan polling AsyncStorage tiap 2 detik di HomeScreen (hemat baterai):
// layar yang mengubah pengaturan memancarkan event, layar lain berlangganan.
//
// Pemakaian:
//   emitSettingsChanged();                  // setelah menyimpan pengaturan
//   const off = onSettingsChanged(fn);      // berlangganan
//   off();                                  // berhenti berlangganan

const listeners = new Set();

/** Panggil setelah pengaturan sholat berhasil disimpan. */
export function emitSettingsChanged() {
  for (const fn of Array.from(listeners)) {
    try { fn(); } catch (e) { /* listener lain tetap jalan */ }
  }
}

/** Berlangganan perubahan pengaturan. Return fungsi unsubscribe. */
export function onSettingsChanged(fn) {
  if (typeof fn !== 'function') return () => {};
  listeners.add(fn);
  return () => listeners.delete(fn);
}
