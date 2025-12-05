import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Animated, Share } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../../ui';
import { getHijriMonthly, mapMonthlyToDay } from '../../api/kalender';

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
  'Rajab', 'Syaban', 'Ramadhan', 'Syawal', 'Zulqaidah', 'Zulhijjah'
];

const GREGORIAN_MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const WEEKDAY_NAMES_ID = ['Ahad','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];

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
  const [memos, setMemos] = useState({});
  const [selected, setSelected] = useState(null); // { day, jdn, gDate }
  const [memoText, setMemoText] = useState('');
  const [saving, setSaving] = useState(false);
  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [apiMonthly, setApiMonthly] = useState(null);
  const [apiDayMap, setApiDayMap] = useState({});

  // Animasi transisi bulan (fade)
  const animMonth = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.timing(animMonth, { toValue: 0, duration: 120, useNativeDriver: true }),
      Animated.timing(animMonth, { toValue: 1, duration: 160, useNativeDriver: true }),
    ]).start();
  }, [viewYear, viewMonth]);

  const length = useMemo(() => islamicMonthLength(viewYear, viewMonth), [viewYear, viewMonth]);
  const days = useMemo(() => Array.from({ length }, (_, i) => i + 1), [length]);
  const jdnStart = useMemo(() => Math.floor(islamicToJDN(viewYear, viewMonth, 1)), [viewYear, viewMonth]);
  const gStart = useMemo(() => jdnToGregorian(jdnStart), [jdnStart]);
  const startDow = useMemo(() => new Date(gStart.year, gStart.month - 1, gStart.day).getDay(), [gStart]);
  const cells = useMemo(() => [
    ...Array.from({ length: startDow }, () => null),
    ...days
  ], [startDow, days]);
  const gEnd = useMemo(() => jdnToGregorian(jdnStart + length - 1), [jdnStart, length]);
  const gregRangeLabel = useMemo(() => {
    const left = `${gStart.day} ${GREGORIAN_MONTH_NAMES_ID[gStart.month - 1]} ${gStart.year}`;
    const right = `${gEnd.day} ${GREGORIAN_MONTH_NAMES_ID[gEnd.month - 1]} ${gEnd.year}`;
    return `${left} – ${right}`;
  }, [gStart, gEnd]);
  const isTodayInView = today.year === viewYear && today.month === viewMonth;

  // Pemetaan event sederhana (awal bulan, puasa sunah, hari besar)
  const eventMap = useMemo(() => {
    const map = { 1: { type: 'monthStart' } };
    [13, 14, 15].forEach((d) => { map[d] = { type: 'sunna' }; });
    if (viewMonth === 1) map[10] = { type: 'holiday' }; // Asyura
    if (viewMonth === 10) map[1] = { type: 'holiday' }; // Idul Fitri
    if (viewMonth === 12) map[10] = { type: 'holiday' }; // Idul Adha
    return map;
  }, [viewMonth]);

  const onPrev = () => {
    if (viewMonth === 1) { setViewMonth(12); setViewYear(viewYear - 1); } else { setViewMonth(viewMonth - 1); }
  };
  const onNext = () => {
    if (viewMonth === 12) { setViewMonth(1); setViewYear(viewYear + 1); } else { setViewMonth(viewMonth + 1); }
  };
  const onReset = () => { setViewYear(today.year); setViewMonth(today.month); };

  const gNow = new Date();
  const gTodayLabel = `${gNow.getDate()} ${GREGORIAN_MONTH_NAMES_ID[gNow.getMonth()]} ${gNow.getFullYear()}`;

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('@hijri_memos');
        const obj = raw ? JSON.parse(raw) : {};
        setMemos(obj && typeof obj === 'object' ? obj : {});
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  const fetchMonthly = useCallback(async (year, month, len) => {
    setApiLoading(true);
    setApiError(null);
    try {
      const data = await getHijriMonthly(year, month);
      setApiMonthly(data);
      const dayMap = mapMonthlyToDay(data, len);
      setApiDayMap(dayMap);
    } catch (e) {
      setApiError('Gagal memuat data kalender dari API MyQuran');
      setApiMonthly(null);
      setApiDayMap({});
    } finally {
      setApiLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMonthly(viewYear, viewMonth, length);
  }, [viewYear, viewMonth, length, fetchMonthly]);

  const openEditor = (day) => {
    const jdn = Math.floor(islamicToJDN(viewYear, viewMonth, day));
    const gDate = jdnToGregorian(jdn);
    const existing = memos[jdn]?.text ?? '';
    setSelected({ day, jdn, gDate });
    setMemoText(existing);
  };

  const saveMemo = async () => {
    if (!selected) return;
    try {
      setSaving(true);
      const next = { ...memos };
      const text = memoText.trim();
      if (text) {
        next[selected.jdn] = { text, updatedAt: new Date().toISOString() };
      } else {
        delete next[selected.jdn];
      }
      await AsyncStorage.setItem('@hijri_memos', JSON.stringify(next));
      setMemos(next);
      setSelected(null);
      setMemoText('');
    } catch (e) {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const deleteMemo = async () => {
    if (!selected) return;
    try {
      setSaving(true);
      const next = { ...memos };
      delete next[selected.jdn];
      await AsyncStorage.setItem('@hijri_memos', JSON.stringify(next));
      setMemos(next);
      setSelected(null);
      setMemoText('');
    } catch (e) {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Kalender Hijriah</Text>
      <Text style={styles.subtitle}>
        Hari ini: {today.day} {MONTH_NAMES_ID[today.month - 1]} {today.year} H • Masehi: {gTodayLabel}
      </Text>

      <Text style={styles.monthTitleCenter}>{MONTH_NAMES_ID[viewMonth - 1]} {viewYear} H</Text>
      <Text style={styles.subtitle}>{`Rentang Masehi: ${gregRangeLabel}`}</Text>
      {!!apiLoading && <Text style={styles.apiInfo}>Memuat data kalender dari API MyQuran…</Text>}
      {!!apiError && (
        <View style={{ padding: 8, borderWidth: 1, borderColor: '#fecaca', backgroundColor: '#fee2e2', borderRadius: 8, marginBottom: 8 }}>
          <Text style={styles.apiInfoErr}>{apiError}</Text>
          <TouchableOpacity style={[styles.btn, styles.btnGhost, { alignSelf: 'flex-start', marginTop: 6 }]} onPress={() => { fetchMonthly(viewYear, viewMonth, length); }}>
            <Text style={styles.btnGhostText}>Coba lagi</Text>
          </TouchableOpacity>
        </View>
      )}
      {!!apiMonthly && !apiLoading && !apiError && <Text style={styles.apiInfo}>Data MyQuran tersedia untuk bulan ini.</Text>}

      <View style={styles.navButtonsRow}>
        <TouchableOpacity style={[styles.btn, styles.btnGhost]} onPress={onPrev}><Text style={styles.btnGhostText}>← Sebelumnya</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.btnGhost]} onPress={onNext}><Text style={styles.btnGhostText}>Berikutnya →</Text></TouchableOpacity>
      </View>
      <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={onReset}>
        <Text style={styles.btnText}>Kembali ke bulan ini</Text>
      </TouchableOpacity>

      <View style={styles.weekHeader}>
        {WEEKDAY_NAMES_ID.map((w) => (
          <Text key={w} style={styles.weekHeaderText}>{w}</Text>
        ))}
      </View>

      <Animated.View style={[styles.grid, { opacity: animMonth }]}> 
        {cells.map((cell, idx) => {
          if (cell === null) {
            return (
              <View key={`blank-${idx}`} style={[styles.cell, styles.cellBlank]} />
            );
          }
          const day = cell;
          const isToday = isTodayInView && day === today.day;
          const jdn = Math.floor(islamicToJDN(viewYear, viewMonth, day));
          const gDateLocal = jdnToGregorian(jdn);
          const dow = new Date(gDateLocal.year, gDateLocal.month - 1, gDateLocal.day).getDay();
          const isFriday = dow === 5;
          const apiItem = apiDayMap?.[day] || null;
          let gregLabel = `${gDateLocal.day} ${GREGORIAN_MONTH_NAMES_ID[gDateLocal.month - 1]}`;
          if (apiItem && typeof apiItem === 'object') {
            const candidates = [
              apiItem?.masehi,
              apiItem?.masehi_date,
              apiItem?.masehi_tanggal,
              apiItem?.gregorian,
              apiItem?.tanggal_masehi,
            ].filter((x) => typeof x === 'string' && x.trim().length > 0);
            if (candidates.length) {
              gregLabel = candidates[0];
            }
          }
          const hasMemo = !!memos[jdn];
          const isSelected = !!selected && selected.jdn === jdn;
          const ev = eventMap[day];
          return (
            <TouchableOpacity key={day} style={[styles.cell, isToday ? styles.cellToday : null, isSelected ? styles.cellSelected : null, isFriday ? styles.cellFriday : null]} onPress={() => openEditor(day)} onLongPress={() => openEditor(day)}>
              <View style={styles.cellInner}>
                <Text style={[styles.cellHijri, isToday ? styles.cellTextToday : null]}>{day}</Text>
                <Text style={styles.cellGreg}>{gregLabel}</Text>
                {hasMemo ? <View style={styles.memoDot} /> : null}
                {ev ? <View style={[styles.eventBadge, ev.type === 'holiday' ? styles.badgeHoliday : ev.type === 'monthStart' ? styles.badgeMonthStart : styles.badgeSunna]} /> : null}
              </View>
            </TouchableOpacity>
          );
        })}
      </Animated.View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
        <View style={styles.memoDot} />
        <Text style={{ color: '#64748b', fontSize: 12 }}>Memo</Text>
        <View style={[styles.eventBadge, styles.badgeHoliday, { position: 'relative' }]} />
        <Text style={{ color: '#64748b', fontSize: 12 }}>Hari Besar</Text>
        <View style={[styles.eventBadge, styles.badgeMonthStart, { position: 'relative' }]} />
        <Text style={{ color: '#64748b', fontSize: 12 }}>Awal Bulan</Text>
        <View style={[styles.eventBadge, styles.badgeSunna, { position: 'relative' }]} />
        <Text style={{ color: '#64748b', fontSize: 12 }}>Sunah</Text>
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
            <TouchableOpacity style={[styles.btn, styles.btnGhost]} onPress={() => { setSelected(null); setMemoText(''); }} disabled={saving}>
              <Text style={styles.btnGhostText}>Tutup</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.btnGhost]} onPress={async () => {
              try {
                const txt = `${selected.day} ${MONTH_NAMES_ID[viewMonth - 1]} ${viewYear} H • ${selected.gDate.day} ${GREGORIAN_MONTH_NAMES_ID[selected.gDate.month - 1]} ${selected.gDate.year}`;
                await Share.share({ message: txt });
              } catch {}
            }} disabled={saving}>
              <Text style={styles.btnGhostText}>Bagikan</Text>
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
  monthTitle: { fontSize: 18, fontWeight: '600', color: '#1f2937' },
  monthTitleCenter: { fontSize: 18, fontWeight: '600', color: '#1f2937', textAlign: 'center', marginBottom: 8 },
  apiInfo: { fontSize: 12, color: '#64748b', textAlign: 'center', marginBottom: 8 },
  apiInfoErr: { fontSize: 12, color: '#dc2626', textAlign: 'center', marginBottom: 8 },
  navButtonsRow: { flexDirection: 'row', marginBottom: 12, justifyContent: 'space-between' },
  btnFull: { flex: 1, alignItems: 'center' },
  weekHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  weekHeaderText: { width: '14.285%', textAlign: 'center', color: '#64748b', fontSize: 12, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '14.285%', aspectRatio: 1.1, borderRadius: 10, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', padding: 6,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2, marginBottom: 8 },
  cellBlank: { backgroundColor: 'transparent', shadowOpacity: 0, elevation: 0 },
  cellFriday: { borderColor: '#eab308', borderWidth: 1 },
  cellToday: { backgroundColor: theme.colors.primary },
  cellSelected: { borderWidth: 2, borderColor: theme.colors.primary },
  cellInner: { alignItems: 'center', justifyContent: 'center', position: 'relative' },
  cellHijri: { color: '#0f172a', fontSize: 14, fontWeight: '700' },
  cellGreg: { color: '#334155', fontSize: 10, marginTop: 2 },
  cellTextToday: { color: 'white', fontWeight: '700' },
  btn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  btnPrimary: { backgroundColor: theme.colors.primaryDark, alignSelf: 'flex-start', marginBottom: 12 },
  btnGhost: { borderWidth: 1, borderColor: '#94a3b8', backgroundColor: 'white' },
  btnText: { color: 'white', fontWeight: '600' },
  btnGhostText: { color: '#0f172a', fontWeight: '600' },
  info: { fontSize: 12, color: '#64748b', marginTop: 12 },
  memoDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#f59e0b', position: 'absolute', right: 6, bottom: 6 },
  eventBadge: { width: 8, height: 8, borderRadius: 4, position: 'absolute', left: 6, top: 6 },
  badgeHoliday: { backgroundColor: '#ef4444' },
  badgeMonthStart: { backgroundColor: '#3b82f6' },
  badgeSunna: { backgroundColor: '#22c55e' },
  memoCard: { marginTop: 12, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, backgroundColor: '#fff', padding: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  memoTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  memoSubtitle: { fontSize: 12, color: '#475569', marginTop: 4 },
  memoInput: { marginTop: 8, minHeight: 100, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 10, textAlignVertical: 'top', backgroundColor: '#f8fafc' },
  memoActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 10 },
  btnDanger: { backgroundColor: '#fee2e2', borderWidth: 1, borderColor: '#fecaca' },
  btnDangerText: { color: '#dc2626', fontWeight: '700' },
});