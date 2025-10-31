import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Konversi Gregorian -> Julian Day Number (JDN)
function gregorianToJDN(y, m, d) {
  const a = Math.floor((14 - m) / 12);
  const y2 = y + 4800 - a;
  const m2 = m + 12 * a - 3;
  return d + Math.floor((153 * m2 + 2) / 5) + 365 * y2 + Math.floor(y2 / 4) - Math.floor(y2 / 100) + Math.floor(y2 / 400) - 32045;
}

// Epoch kalender Islam (civil) dalam JDN
const ISLAMIC_EPOCH = 1948439.5;

// Konversi Hijri -> JDN (civil/arithmetic)
function islamicToJDN(year, month, day) {
  return day + Math.ceil(29.5 * (month - 1)) + (year - 1) * 354 + Math.floor((3 + 11 * year) / 30) + ISLAMIC_EPOCH - 1;
}

// Konversi JDN -> Hijri (civil/arithmetic)
function jdnToIslamic(jdn) {
  const jd = Math.floor(jdn) + 0.5;
  const year = Math.floor((30 * (jd - ISLAMIC_EPOCH) + 10646) / 10631);
  const firstOfYear = Math.floor(islamicToJDN(year, 1, 1));
  const month = Math.min(12, Math.ceil((jd - (firstOfYear + 29)) / 29.5) + 1);
  const firstOfMonth = Math.floor(islamicToJDN(year, month, 1));
  const day = Math.floor(jd - firstOfMonth + 1);
  return { year, month, day };
}

function islamicMonthLength(year, month) {
  const start = Math.floor(islamicToJDN(year, month, 1));
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const nextStart = Math.floor(islamicToJDN(nextYear, nextMonth, 1));
  return nextStart - start;
}

const MONTH_NAMES_ID = [
  'Muharram', 'Safar', 'Rabiul Awal', 'Rabiul Akhir', 'Jumadil Awal', 'Jumadil Akhir',
  "Rajab", 'Syaban', 'Ramadhan', 'Syawal', 'Zulqaidah', 'Zulhijjah'
];

// Tambahkan nama bulan Gregorian (Masehi)
const GREGORIAN_MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

// Konversi JDN -> Gregorian (Fliegel-Van Flandern)
function jdnToGregorian(jdn) {
  const J = Math.floor(jdn + 0.5);
  let l = J + 68569;
  const n = Math.floor((4 * l) / 146097);
  l = l - Math.floor((146097 * n + 3) / 4);
  const i = Math.floor((4000 * (l + 1)) / 1461001);
  l = l - Math.floor((1461 * i) / 4) + 31;
  const j = Math.floor((80 * l) / 2447);
  const d = l - Math.floor((2447 * j) / 80);
  l = Math.floor(j / 11);
  const m = j + 2 - 12 * l;
  const y = 100 * (n - 49) + i + l;
  return { year: y, month: m, day: d };
}

function todayHijri() {
  const g = new Date();
  const y = g.getFullYear();
  const m = g.getMonth() + 1;
  const d = g.getDate();
  const jdn = gregorianToJDN(y, m, d);
  return jdnToIslamic(jdn);
}

export default function HijriCalendarScreen() {
  const today = useMemo(() => todayHijri(), []);
  const [viewYear, setViewYear] = useState(today.year);
  const [viewMonth, setViewMonth] = useState(today.month);

  const length = useMemo(() => islamicMonthLength(viewYear, viewMonth), [viewYear, viewMonth]);
  const days = useMemo(() => Array.from({ length }, (_, i) => i + 1), [length]);

  const isTodayInView = today.year === viewYear && today.month === viewMonth;

  const onPrev = () => {
    if (viewMonth === 1) { setViewMonth(12); setViewYear(viewYear - 1); } else { setViewMonth(viewMonth - 1); }
  };
  const onNext = () => {
    if (viewMonth === 12) { setViewMonth(1); setViewYear(viewYear + 1); } else { setViewMonth(viewMonth + 1); }
  };
  const onReset = () => { setViewYear(today.year); setViewMonth(today.month); };

  // Label hari ini versi Masehi
  const gNow = new Date();
  const gTodayLabel = `${gNow.getDate()} ${GREGORIAN_MONTH_NAMES_ID[gNow.getMonth()]} ${gNow.getFullYear()}`;

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('@hijri_memos')
        const obj = raw ? JSON.parse(raw) : {}
        setMemos(obj && typeof obj === 'object' ? obj : {})
      } catch (e) {
        // ignore
      }
    })()
  }, [])

  const openEditor = (day) => {
    const jdn = Math.floor(islamicToJDN(viewYear, viewMonth, day))
    const gDate = jdnToGregorian(jdn)
    const existing = memos[jdn]?.text ?? ''
    setSelected({ day, jdn, gDate })
    setMemoText(existing)
  }

  const saveMemo = async () => {
    if (!selected) return
    try {
      setSaving(true)
      const next = { ...memos }
      const text = memoText.trim()
      if (text) {
        next[selected.jdn] = { text, updatedAt: new Date().toISOString() }
      } else {
        delete next[selected.jdn]
      }
      await AsyncStorage.setItem('@hijri_memos', JSON.stringify(next))
      setMemos(next)
      setSelected(null)
      setMemoText('')
    } catch (e) {
      // ignore
    } finally {
      setSaving(false)
    }
  }

  const deleteMemo = async () => {
    if (!selected) return
    try {
      setSaving(true)
      const next = { ...memos }
      delete next[selected.jdn]
      await AsyncStorage.setItem('@hijri_memos', JSON.stringify(next))
      setMemos(next)
      setSelected(null)
      setMemoText('')
    } catch (e) {
      // ignore
    } finally {
      setSaving(false)
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Kalender Hijriah</Text>
      <Text style={styles.subtitle}>
        Hari ini: {today.day} {MONTH_NAMES_ID[today.month - 1]} {today.year} H • Masehi: {gTodayLabel}
      </Text>

      <View style={styles.navRow}>
        <TouchableOpacity style={[styles.btn, styles.btnGhost]} onPress={onPrev}><Text style={styles.btnGhostText}>Sebelumnya</Text></TouchableOpacity>
        <Text style={styles.monthTitle}>{MONTH_NAMES_ID[viewMonth - 1]} {viewYear} H</Text>
        <TouchableOpacity style={[styles.btn, styles.btnGhost]} onPress={onNext}><Text style={styles.btnGhostText}>Berikutnya</Text></TouchableOpacity>
      </View>
      <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={onReset}>
        <Text style={styles.btnText}>Kembali ke bulan ini</Text>
      </TouchableOpacity>

      <View style={styles.grid}>
        {days.map((day) => {
          const isToday = isTodayInView && day === today.day
          const jdn = Math.floor(islamicToJDN(viewYear, viewMonth, day))
          const gDate = jdnToGregorian(jdn)
          const hasMemo = !!memos[jdn]
          return (
            <TouchableOpacity key={day} style={[styles.cell, isToday ? styles.cellToday : null]} onPress={() => openEditor(day)}>
              <View style={styles.cellInner}>
                <Text style={[styles.cellHijri, isToday ? styles.cellTextToday : null]}>{day}</Text>
                <Text style={styles.cellGreg}>{gDate.day} {GREGORIAN_MONTH_NAMES_ID[gDate.month - 1]}</Text>
                {hasMemo ? <View style={styles.memoDot} /> : null}
              </View>
            </TouchableOpacity>
          )
        })}
      </View>

      {selected ? (
        <View style={styles.memoCard}>
          <Text style={styles.memoTitle}>Memo untuk {selected.day} {MONTH_NAMES_ID[viewMonth - 1]} {viewYear} H</Text>
          <Text style={styles.memoSubtitle}>Masehi: {selected.gDate.day} {GREGORIAN_MONTH_NAMES_ID[selected.gDate.month - 1]} {selected.gDate.year}</Text>
          <TextInput
            style={styles.memoInput}
            placeholder="Tulis catatan/memo di sini..."
            multiline
            value={memoText}
            onChangeText={setMemoText}
          />
          <View style={styles.memoActions}>
            <TouchableOpacity style={[styles.btn, styles.btnGhost]} onPress={() => { setSelected(null); setMemoText('') }} disabled={saving}>
              <Text style={styles.btnGhostText}>Tutup</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.btnDanger]} onPress={deleteMemo} disabled={saving || !memos[selected.jdn]}>
              <Text style={styles.btnDangerText}>Hapus</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={saveMemo} disabled={saving}>
              <Text style={styles.btnText}>{memos[selected.jdn] ? 'Simpan' : 'Tambahkan'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      <Text style={styles.info}>
        Catatan: Perhitungan ini menggunakan kalender Hijriah aritmetika (civil). Pada praktiknya, awal bulan dapat berbeda berdasarkan rukyat atau otoritas setempat.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { fontSize: 22, fontWeight: '600', marginBottom: 6, color: '#0f172a' },
  subtitle: { fontSize: 14, color: '#475569', marginBottom: 12 },
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  monthTitle: { fontSize: 18, fontWeight: '600', color: '#1f2937' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '14.285%', aspectRatio: 1.15, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center', padding: 4 },
  cellToday: { backgroundColor: '#0ea5e9' },
  cellInner: { alignItems: 'center', justifyContent: 'center' },
  cellHijri: { color: '#0f172a', fontSize: 14, fontWeight: '700' },
  cellGreg: { color: '#334155', fontSize: 10, marginTop: 2 },
  cellTextToday: { color: 'white', fontWeight: '700' },
  btn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  btnPrimary: { backgroundColor: '#0ea5e9', alignSelf: 'flex-start', marginBottom: 12 },
  btnGhost: { borderWidth: 1, borderColor: '#94a3b8' },
  btnText: { color: 'white', fontWeight: '600' },
  btnGhostText: { color: '#0f172a', fontWeight: '600' },
  info: { fontSize: 12, color: '#64748b', marginTop: 12 },
  memoDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#f59e0b', marginTop: 4 },
  memoCard: { marginTop: 12, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, backgroundColor: '#fff', padding: 12 },
  memoTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  memoSubtitle: { fontSize: 12, color: '#475569', marginTop: 4 },
  memoInput: { marginTop: 8, minHeight: 80, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 8, textAlignVertical: 'top' },
  memoActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8, marginTop: 10 },
  btnDanger: { backgroundColor: '#fee2e2', borderWidth: 1, borderColor: '#fecaca' },
  btnDangerText: { color: '#dc2626', fontWeight: '700' },
});