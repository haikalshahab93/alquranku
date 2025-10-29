import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

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

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Kalender Hijriah</Text>
      <Text style={styles.subtitle}>
        Hari ini: {today.day} {MONTH_NAMES_ID[today.month - 1]} {today.year} H
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
          const isToday = isTodayInView && day === today.day;
          return (
            <View key={day} style={[styles.cell, isToday ? styles.cellToday : null]}>
              <Text style={[styles.cellText, isToday ? styles.cellTextToday : null]}>{day}</Text>
            </View>
          );
        })}
      </View>

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
  cell: { width: '14.285%', aspectRatio: 1, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
  cellToday: { backgroundColor: '#0ea5e9' },
  cellText: { color: '#0f172a', fontSize: 14 },
  cellTextToday: { color: 'white', fontWeight: '700' },
  btn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  btnPrimary: { backgroundColor: '#0ea5e9', alignSelf: 'flex-start', marginBottom: 12 },
  btnGhost: { borderWidth: 1, borderColor: '#94a3b8' },
  btnText: { color: 'white', fontWeight: '600' },
  btnGhostText: { color: '#0f172a', fontWeight: '600' },
  info: { fontSize: 12, color: '#64748b', marginTop: 12 }
});