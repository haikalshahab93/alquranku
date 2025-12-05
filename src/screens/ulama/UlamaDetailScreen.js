import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function UlamaDetailScreen({ navigation, route }) {
  const scholar = route?.params?.scholar;
  if (!scholar) {
    return (
      <View style={styles.center}>
        <Text>Data ulama tidak ditemukan.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backLink}><Text style={styles.backText}>Kembali</Text></TouchableOpacity>
      </View>
    );
  }
  const hijriSpan = [scholar.birth_hijri, scholar.death_hijri].filter(Boolean).join(' — ');
  const gregSpan = [scholar.birth_gregorian, scholar.death_gregorian].filter(Boolean).join(' — ');

  const raw = scholar?.raw || {};
  const rawKeys = Object.keys(raw || {});

  const IDENTITY_KEYS = ['name','fullname','displayname','searchname','arabicname','name_ar','id','scholar_indx','scholar_index','index'];
  const PLACE_KEYS = ['origin','birth_place','birth_date_place','country','place_of_birth','place'];
  const DATE_KEYS = ['birth_date_hijri','birth_hijri','death_date_hijri','death_hijri','birth_date_gregorian','birth_date','birth','born','death_date_gregorian','death_date','death','died'];
  const BIO_KEYS = ['bio','info','biography','description'];
  const WORK_KEYS = ['works','books','publications'];
  const TEACHER_SUBSTR = ['teacher','mentor','shuyukh','guru'];
  const STUDENT_SUBSTR = ['student','disciple','murid'];
  const CLASS_KEYS = ['madhhab','school','sect','region','era','century'];
  const LINK_SUBSTR = ['url','link','wiki','wikidata','wikipedia'];

  const lc = (s) => String(s || '').toLowerCase();
  const hasAny = (keys) => rawKeys.some(k => keys.includes(lc(k)) || keys.includes(k));
  const pickGroup = (title, keys) => {
    const items = [];
    rawKeys.forEach((k) => {
      const kLC = lc(k);
      if (keys.includes(k) || keys.includes(kLC)) {
        items.push({ key: k, value: raw[k] });
      }
    });
    return items.length ? { title, items } : null;
  };
  const pickBySubstr = (title, substrs) => {
    const items = [];
    rawKeys.forEach((k) => {
      const kLC = lc(k);
      if (substrs.some(s => kLC.includes(s))) {
        items.push({ key: k, value: raw[k] });
      }
    });
    return items.length ? { title, items } : null;
  };

  const grouped = useMemo(() => {
    const used = new Set();
    const groups = [];
    const id = pickGroup('Identitas Lengkap', IDENTITY_KEYS);
    if (id) { groups.push(id); id.items.forEach(i => used.add(i.key)); }
    const place = pickGroup('Lokasi / Asal', PLACE_KEYS);
    if (place) { groups.push(place); place.items.forEach(i => used.add(i.key)); }
    const dates = pickGroup('Tanggal (Hijri & Masehi)', DATE_KEYS);
    if (dates) { groups.push(dates); dates.items.forEach(i => used.add(i.key)); }
    const bio = pickGroup('Biografi / Deskripsi', BIO_KEYS);
    if (bio) { groups.push(bio); bio.items.forEach(i => used.add(i.key)); }
    const works = pickGroup('Karya / Publikasi', WORK_KEYS);
    if (works) { groups.push(works); works.items.forEach(i => used.add(i.key)); }
    const teachers = pickBySubstr('Guru', TEACHER_SUBSTR);
    if (teachers) { groups.push(teachers); teachers.items.forEach(i => used.add(i.key)); }
    const students = pickBySubstr('Murid', STUDENT_SUBSTR);
    if (students) { groups.push(students); students.items.forEach(i => used.add(i.key)); }
    const klass = pickGroup('Klasifikasi (Madhhab/Sekolah/Sekte)', CLASS_KEYS);
    if (klass) { groups.push(klass); klass.items.forEach(i => used.add(i.key)); }
    const links = pickBySubstr('Tautan / Referensi', LINK_SUBSTR);
    if (links) { groups.push(links); links.items.forEach(i => used.add(i.key)); }

    const others = [];
    rawKeys.forEach((k) => { if (!used.has(k)) others.push({ key: k, value: raw[k] }); });
    if (others.length) groups.push({ title: 'Lainnya', items: others });

    return groups;
  }, [rawKeys.join('|')]);

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
              <Text style={styles.cardText}>{typeof v === 'object' ? JSON.stringify(v) : String(v)}</Text>
            </View>
          ))}
        </View>
      );
    }
    if (typeof val === 'object') {
      const entries = Object.entries(val);
      if (!entries.length) return <Text style={styles.cardText}>{'{}'}</Text>;
      return (
        <View style={styles.objBox}>
          {entries.map(([k2, v2], idx) => (
            <View key={idx} style={styles.kvRow}>
              <Text style={styles.kvKey}>{String(k2)}</Text>
              <Text style={styles.kvVal}>{typeof v2 === 'object' ? JSON.stringify(v2) : String(v2)}</Text>
            </View>
          ))}
        </View>
      );
    }
    return <Text style={styles.cardText}>{String(val)}</Text>;
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

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <LinearGradient colors={["#ede9fe","#faf5ff"]} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.headerCard}>
        <Text style={styles.title}>{scholar.name}</Text>
        {!!scholar.name_ar && <Text style={styles.titleAr}>{scholar.name_ar}</Text>}
        {!!scholar.origin && <Text style={styles.meta}>Asal: {scholar.origin}</Text>}
        {!!hijriSpan && <Text style={styles.meta}>Hijri: {hijriSpan}</Text>}
        {!!gregSpan && <Text style={styles.meta}>Masehi: {gregSpan}</Text>}
      </LinearGradient>
      {!!scholar.bio && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Biografi Singkat</Text>
          <Text style={styles.cardText}>{scholar.bio}</Text>
        </View>
      )}
      {!!scholar.works && scholar.works.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Karya</Text>
          {scholar.works.map((w, i) => (
            <Text key={i} style={styles.cardText}>• {w}</Text>
          ))}
        </View>
      )}

      {/* Sub-seksi terdeteksi dari raw */}
      {grouped.map(renderGroup)}

      {/* Semua Atribut (Raw) */}
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
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  backLink: { marginTop: 8 },
  backText: { color: '#0ea5e9' },
  headerCard: { borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e9d5ff' },
  title: { fontSize: 20, fontWeight: '800', color: '#111' },
  titleAr: { color: '#475569', marginTop: 4 },
  meta: { color: '#64748b', marginTop: 6 },
  card: { padding: 16, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fff', borderRadius: 12, marginTop: 12 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1f2937' },
  cardText: { color: '#334155', marginTop: 6 },
  kvRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 8 },
  kvKey: { width: 140, color: '#64748b' },
  kvValBox: { flex: 1 },
  kvVal: { color: '#334155' },
  subList: { marginTop: 6 },
  subItem: { paddingVertical: 4 },
  objBox: { marginTop: 6, borderWidth: 1, borderColor: '#f1f5f9', borderRadius: 8, padding: 8, backgroundColor: '#f8fafc' },
});