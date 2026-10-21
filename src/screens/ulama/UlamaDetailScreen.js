import React, { useMemo } from 'react';
import { SafeAreaView, View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { theme, getPalette } from '../../ui';
import { useAppearance } from '../../api/appearance';

const ULAMA = require('../../data/ulama.json');
// Peta id -> data ulama agar setiap rujukan id (guru/murid/[id]) bisa dibuka langsung
const ULAMA_BY_ID = new Map(ULAMA.map((u) => [String(u.id), u]));

// Kunci relasi ditampilkan sebagai chip khusus (tidak ikut grup raw agar tidak duplikat)
const RELATION_SKIP_KEYS = new Set(['teachers', 'teachers_inds', 'students', 'students_inds']);

export default function UlamaDetailScreen({ navigation, route }) {
  // Palet tema aktif (dark mode) dari pengaturan tampilan
  const { darkMode } = useAppearance();
  const pal = getPalette(darkMode);
  // Params harus dibaca via hook-friendly pattern: jika params berubah (scholar lain),
  // seluruh konten di bawah bergantung pada `scholar` sehingga ikut berubah.
  const params = route?.params || {};
  const scholarFromId = params.scholarId != null ? ULAMA_BY_ID.get(String(params.scholarId)) : null;
  const scholar = scholarFromId || params.scholar || null;
  const raw = (scholar && scholar.raw) || {};
  const rawKeys = useMemo(() => Object.keys(raw), [scholar && scholar.id]);

  // --- Relasi Guru & Murid: diresolusi dari id agar bisa diklik langsung ke orangnya ---
  const relations = useMemo(() => {
    const parseInds = (v) => String(v || '').split(',').map((s) => s.trim()).filter(Boolean);
    const build = (nameValue, indsValue) => {
      const entries = [];
      parseInds(indsValue).forEach((idStr) => {
        const target = ULAMA_BY_ID.get(String(idStr));
        if (target) entries.push({ id: String(idStr), name: target.name });
      });
      // Fallback: ambil penanda [id] dari teks nama bila tidak tercakup di daftar inds
      const re = /\[\s*(\d+)\s*\]/g;
      let m;
      const text = String(nameValue || '');
      while ((m = re.exec(text)) !== null) {
        const idStr = m[1];
        if (entries.some((e) => e.id === idStr)) continue;
        const target = ULAMA_BY_ID.get(idStr);
        if (target) entries.push({ id: idStr, name: target.name });
      }
      return entries;
    };
    return {
      teachers: build(raw.teachers, raw.teachers_inds),
      students: build(raw.students, raw.students_inds),
    };
  }, [rawKeys, scholar && scholar.id]);

  // Ubah teks apa pun yang mengandung rujukan [id] menjadi bagian teks + chip tautan
  const renderRefParts = (val) => {
    const s = typeof val === 'object' ? '' : String(val ?? '');
    if (!/\[\s*\d+\s*\]/.test(s)) return null;
    const parts = [];
    const re = /\[\s*(\d+)\s*\]/g;
    let last = 0;
    let m;
    while ((m = re.exec(s)) !== null) {
      if (m.index > last) parts.push({ type: 'text', value: s.slice(last, m.index) });
      const target = ULAMA_BY_ID.get(m[1]);
      parts.push(target ? { type: 'link', value: target.name, id: m[1] } : { type: 'text', value: m[0] });
      last = m.index + m[0].length;
    }
    if (last < s.length) parts.push({ type: 'text', value: s.slice(last) });
    return parts.some((p) => p.type === 'link') ? parts : null;
  };

  const IDENTITY_KEYS = ['name','fullname','displayname','searchname','arabicname','name_ar','id','scholar_indx','scholar_index','index'];
  const PLACE_KEYS = ['origin','birth_place','birth_date_place','country','place_of_birth','place'];
  const DATE_KEYS = ['birth_date_hijri','birth_hijri','death_date_hijri','death_hijri','birth_date_gregorian','birth_date','birth','born','death_date_gregorian','death_date','death','died'];
  const BIO_KEYS = ['bio','info','biography','description'];
  const WORK_KEYS = ['works','books','publications'];
  const TEACHER_SUBSTR = ['teacher','mentor','shuyukh','guru'];
  const STUDENT_SUBSTR = ['student','disciple','murid'];
  const CLASS_KEYS = ['madhhab','school','sect','region','era','century'];
  const LINK_SUBSTR = ['url','link','wiki','wikidata','wikipedia'];

  const grouped = useMemo(() => {
    const lc = (s) => String(s || '').toLowerCase();
    const hasAny = (keys) => rawKeys.some((k) => keys.includes(lc(k)) || keys.includes(k));
    const pickGroup = (title, keys) => {
      const items = [];
      rawKeys.forEach((k) => {
        if (RELATION_SKIP_KEYS.has(k)) return;
        const kLC = lc(k);
        if (keys.includes(k) || keys.includes(kLC)) items.push({ key: k, value: raw[k] });
      });
      return items.length ? { title, items } : null;
    };
    const pickBySubstr = (title, substrs) => {
      const items = [];
      rawKeys.forEach((k) => {
        if (RELATION_SKIP_KEYS.has(k)) return;
        const kLC = lc(k);
        if (substrs.some((s) => kLC.includes(s))) items.push({ key: k, value: raw[k] });
      });
      return items.length ? { title, items } : null;
    };

    const groups = [];
    const id = pickGroup('Identitas Lengkap', IDENTITY_KEYS);
    if (id) groups.push(id);
    const place = pickGroup('Lokasi / Asal', PLACE_KEYS);
    if (place) groups.push(place);
    const dates = pickGroup('Tanggal (Hijri & Masehi)', DATE_KEYS);
    if (dates) groups.push(dates);
    const bio = pickGroup('Biografi / Deskripsi', BIO_KEYS);
    if (bio) groups.push(bio);
    const works = pickGroup('Karya / Publikasi', WORK_KEYS);
    if (works) groups.push(works);
    const teachers = pickBySubstr('Guru', TEACHER_SUBSTR);
    if (teachers) groups.push(teachers);
    const students = pickBySubstr('Murid', STUDENT_SUBSTR);
    if (students) groups.push(students);
    const klass = pickGroup('Klasifikasi (Madhhab/Sekolah)', CLASS_KEYS);
    if (klass) groups.push(klass);
    const links = pickBySubstr('Tautan / Referensi', LINK_SUBSTR);
    if (links) groups.push(links);

    const used = new Set();
    groups.forEach((g) => g.items.forEach((i) => used.add(i.key)));
    const others = [];
    rawKeys.forEach((k) => {
      if (!used.has(k) && !RELATION_SKIP_KEYS.has(k)) others.push({ key: k, value: raw[k] });
    });
    if (others.length) groups.push({ title: 'Lainnya', items: others });

    return groups;
  }, [rawKeys, scholar && scholar.id]);

  // Buka detail ulama lain berdasarkan id (dipakai semua chip/tautan rujukan).
  // Selalu kirim scholarId agar layar tujuan me-remount dan menampilkan orang yang benar.
  const openScholar = (id) => {
    if (!ULAMA_BY_ID.get(String(id))) return;
    navigation.navigate('UlamaDetail', { scholarId: String(id) });
  };

  const renderRefText = (text, styleKey) => {
    const parts = renderRefParts(text);
    if (!parts) return <Text style={styles[styleKey]}>{String(text)}</Text>;
    return (
      <View style={styles.refInlineWrap}>
        {parts.map((p, i) =>
          p.type === 'link' ? (
            <TouchableOpacity key={i} style={[styles.refChip, { backgroundColor: pal.colors.primaryLight + '2e', borderColor: pal.colors.surfaceBorder }]} onPress={() => openScholar(p.id)} activeOpacity={0.7}>
              <Text style={[styles.refChipText, { color: pal.colors.primary }]} numberOfLines={1}>{p.value}</Text>
            </TouchableOpacity>
          ) : (
            <Text key={i} style={styles[styleKey]}>{p.value}</Text>
          )
        )}
      </View>
    );
  };

  const renderValue = (val) => {
    if (val == null || val === '') {
      return <Text style={styles.cardText}>-</Text>;
    }
    if (Array.isArray(val)) {
      if (val.length === 0) return <Text style={styles.cardText}>—</Text>;
      return (
        <View style={styles.subList}>
          {val.map((v, i) => (
            <View key={i} style={styles.subItem}>
              {typeof v === 'object'
                ? <Text style={styles.cardText}>{JSON.stringify(v)}</Text>
                : renderRefText(String(v), 'cardText')}
            </View>
          ))}
        </View>
      );
    }
    if (typeof val === 'object') {
      const entries = Object.entries(val);
      if (!entries.length) return <Text style={styles.cardText}>{'{}'}</Text>;
      return (
        <View style={[styles.objBox, { backgroundColor: pal.colors.surface, borderColor: pal.colors.surfaceBorder }]}>
          {entries.map(([k2, v2], idx) => (
            <View key={idx} style={styles.kvRow}>
              <Text style={styles.kvKey}>{String(k2)}</Text>
              <Text style={styles.kvVal}>{typeof v2 === 'object' ? JSON.stringify(v2) : String(v2)}</Text>
            </View>
          ))}
        </View>
      );
    }
    // Teks biasa: rujukan [id] otomatis menjadi tautan ke ulama terkait
    return renderRefText(String(val), 'cardText');
  };

  const renderGroup = (group) => (
    <View key={group.title} style={styles.card}>
      <Text style={styles.cardTitle}>{group.title}</Text>
      {group.items.map((it, idx) => (
        <View key={idx} style={styles.kvRow}>
          <Text style={styles.kvKey}>{it.key}</Text>
          <View style={styles.kvValBox}>{renderValue(it.value)}</View>
        </View>
      ))}
    </View>
  );

  // Layar tidak ditemukan: ditampilkan setelah semua hooks agar urutan hook tetap konsisten
  if (!scholar) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: pal.colors.bg }}>
        <View style={styles.center}>
          <Text style={{ color: pal.colors.text }}>Data ulama tidak ditemukan.</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backLink}>
            <Text style={styles.backText}>Kembali</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const hijriSpan = [scholar.birth_hijri, scholar.death_hijri].filter(Boolean).join(' — ');
  const gregSpan = [scholar.birth_gregorian, scholar.death_gregorian].filter(Boolean).join(' — ');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: pal.colors.bg }}>
      <ScrollView contentContainerStyle={[styles.container, { backgroundColor: pal.colors.bg }]}>
        <LinearGradient colors={pal.gradients.brandSoft} start={{x:0,y:0}} end={{x:1,y:1}} style={[styles.headerCard, { backgroundColor: pal.colors.surface, borderColor: pal.colors.surfaceBorder }]}>
          <Text style={[styles.title, { color: pal.colors.text }]} numberOfLines={1} ellipsizeMode="tail">{scholar.name}</Text>
          {!!scholar.name_ar && <Text style={[styles.titleAr, { color: pal.colors.muted }]} numberOfLines={1} ellipsizeMode="tail">{scholar.name_ar}</Text>}
          {!!scholar.origin && <Text style={[styles.meta, { color: pal.colors.muted }]} numberOfLines={1} ellipsizeMode="tail">Asal: {scholar.origin}</Text>}
          {!!hijriSpan && <Text style={[styles.meta, { color: pal.colors.muted }]} numberOfLines={1} ellipsizeMode="tail">Hijri: {hijriSpan}</Text>}
          {!!gregSpan && <Text style={[styles.meta, { color: pal.colors.muted }]} numberOfLines={1} ellipsizeMode="tail">Masehi: {gregSpan}</Text>}
        </LinearGradient>
        {!!scholar.bio && (
          <View style={[styles.card, { backgroundColor: pal.colors.surface, borderColor: pal.colors.surfaceBorder }]}>
            <Text style={[styles.cardTitle, { color: pal.colors.text }]}>Biografi Singkat</Text>
            <Text style={[styles.cardText, { color: pal.colors.text }]}>{scholar.bio}</Text>
          </View>
        )}
        {!!scholar.works && scholar.works.length > 0 && (
          <View style={[styles.card, { backgroundColor: pal.colors.surface, borderColor: pal.colors.surfaceBorder }]}>
            <Text style={[styles.cardTitle, { color: pal.colors.text }]}>Karya</Text>
            {scholar.works.map((w, i) => (
              <Text key={i} style={[styles.cardText, { color: pal.colors.text }]}>• {w}</Text>
            ))}
          </View>
        )}

        {/* Visualisasi rantai sanad (guru → murid) dari ulama ini ke atas */}
        <TouchableOpacity style={[styles.sanadBtn, { backgroundColor: pal.colors.surface, borderColor: pal.colors.surfaceBorder }]} activeOpacity={0.85} onPress={() => navigation.navigate('SanadChain', { scholarId: String(scholar.id) })}>
          <View style={[styles.sanadBtnIcon, { backgroundColor: pal.colors.primaryLight + '2e' }]}>
            <Ionicons name="git-network-outline" size={18} color={theme.colors.primaryDark} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.sanadBtnTitle, { color: pal.colors.text }]}>Lihat Rantai Sanad</Text>
            <Text style={[styles.sanadBtnSub, { color: pal.colors.muted }]}>Telusuri guru dari ulama ini hingga ke atas</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={theme.colors.primaryDark} />
        </TouchableOpacity>

        {(relations.teachers.length > 0 || relations.students.length > 0) && (
          <View style={[styles.card, { backgroundColor: pal.colors.surface, borderColor: pal.colors.surfaceBorder }]}>
            {relations.teachers.length > 0 && (
              <View key="teachers">
                <View style={styles.relationHeaderRow}>
                  <Ionicons name="arrow-up-circle-outline" size={16} color={theme.colors.primaryDark} />
                  <Text style={styles.cardTitle}>Guru ({relations.teachers.length})</Text>
                </View>
                <View style={styles.chipWrap}>
                  {relations.teachers.map((t) => (
                    <TouchableOpacity key={`t-${t.id}`} style={[styles.chip, { backgroundColor: pal.colors.primaryLight + '2e', borderColor: pal.colors.surfaceBorder }]} onPress={() => openScholar(t.id)} activeOpacity={0.7}>
                      <Ionicons name="person-circle-outline" size={14} color={theme.colors.primaryDark} />
                      <Text style={[styles.chipText, { color: pal.colors.primary }]} numberOfLines={1}>{t.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
            {relations.students.length > 0 && (
              <View key="students" style={relations.teachers.length > 0 && { marginTop: 12 }}>
                <View style={styles.relationHeaderRow}>
                  <Ionicons name="arrow-down-circle-outline" size={16} color={theme.colors.primaryDark} />
                  <Text style={styles.cardTitle}>Murid ({relations.students.length})</Text>
                </View>
                <View style={styles.chipWrap}>
                  {relations.students.map((s) => (
                    <TouchableOpacity key={`s-${s.id}`} style={[styles.chip, { backgroundColor: pal.colors.primaryLight + '2e', borderColor: pal.colors.surfaceBorder }]} onPress={() => openScholar(s.id)} activeOpacity={0.7}>
                      <Ionicons name="person-circle-outline" size={14} color={theme.colors.primaryDark} />
                      <Text style={[styles.chipText, { color: pal.colors.primary }]} numberOfLines={1}>{s.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
            <Text style={styles.relationHint}>Ketuk nama untuk membuka detail ulama tersebut.</Text>
          </View>
        )}

        {grouped.map(renderGroup)}

        {rawKeys.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Semua Atribut (Raw)</Text>
            {rawKeys.map((k) => (
              <View key={k} style={styles.kvRow}>
                <Text style={styles.kvKey}>{k}</Text>
                <View style={styles.kvValBox}>{renderValue(raw[k])}</View>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  backLink: { marginTop: 8 },
  backText: { color: theme.colors.primary },
  headerCard: { borderRadius: 16, padding: 16, borderWidth: 1, borderColor: theme.colors.primaryLight, backgroundColor: theme.colors.white },
  title: { fontSize: 20, fontWeight: '800', color: theme.colors.text },
  titleAr: { color: theme.colors.muted, marginTop: 4 },
  meta: { color: theme.colors.muted, marginTop: 6 },
  card: { padding: 16, borderWidth: 1, borderColor: theme.colors.primaryLight, backgroundColor: theme.colors.white, borderRadius: 12, marginTop: 12 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  cardText: { color: '#334155', marginTop: 6 },
  kvRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 8 },
  kvKey: { width: 140, color: theme.colors.muted },
  kvValBox: { flex: 1 },
  kvVal: { color: '#334155' },
  subList: { marginTop: 6 },
  subItem: { paddingVertical: 4 },
  objBox: { marginTop: 6, borderWidth: 1, borderColor: '#f1f5f9', borderRadius: 8, padding: 8, backgroundColor: '#f8fafc' },
  // Tombol buka visualisasi rantai sanad
  sanadBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#f5f3ff', borderWidth: 1, borderColor: theme.colors.primaryLight, borderRadius: 12, padding: 12, marginTop: 12 },
  sanadBtnIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#ede9fe', alignItems: 'center', justifyContent: 'center' },
  sanadBtnTitle: { fontSize: 14, fontWeight: '800', color: theme.colors.text },
  sanadBtnSub: { fontSize: 11, color: theme.colors.muted, marginTop: 1 },
  // Chips relasi yang bisa diklik
  relationHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: '100%', backgroundColor: '#f5f3ff', borderWidth: 1, borderColor: theme.colors.primaryLight, borderRadius: 999, paddingVertical: 5, paddingHorizontal: 10, marginRight: 6, marginBottom: 6 },
  chipText: { color: theme.colors.primaryDark, fontWeight: '600', fontSize: 12, flexShrink: 1 },
  relationHint: { color: theme.colors.muted, fontSize: 11, marginTop: 8, fontStyle: 'italic' },
  // Tautan [id] inline dalam teks raw
  refInlineWrap: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginTop: 6 },
  refChip: { backgroundColor: '#ede9fe', borderWidth: 1, borderColor: theme.colors.primaryLight, borderRadius: 999, paddingVertical: 2, paddingHorizontal: 8, marginHorizontal: 2, marginVertical: 1, maxWidth: '100%' },
  refChipText: { color: theme.colors.primaryDark, fontWeight: '600', fontSize: 12 },
});
