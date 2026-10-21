import React, { useMemo, useState, useCallback, useLayoutEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { theme, getPalette } from '../../ui';
import { useAppearance } from '../../api/appearance';
import { buildTeacherChain, eraLabelForChain, getScholar, teachersOf, shortName } from '../../api/sanad';

const MAX_DEPTH = 8;

export default function SanadChainScreen({ navigation, route }) {
  const { darkMode } = useAppearance();
  const pal = getPalette(darkMode);
  const styles = makeStyles(pal);
  const startId = route?.params?.scholarId != null ? String(route.params.scholarId) : null;

  // Preferensi rute: daftar { kind, at, ownerId, preferId } — paksa hop dari node index `at`
  // (yang saat klik berisi ownerId) melewati guru `preferId`.
  const [prefs, setPrefs] = useState([]);
  const [deepenCount, setDeepenCount] = useState(0);
  const depth = Math.min(MAX_DEPTH + deepenCount * 2, 14);

  const chain = useMemo(() => {
    if (!startId) return [];
    const reroutes = prefs.filter((p) => p.kind === 'reroute');
    let cur = buildTeacherChain(startId, { maxDepth: depth, prefs: [] });
    const applied = [];
    for (const p of reroutes) {
      // Pref usang (posisi sudah berisi orang lain karena re-rute sebelumnya) diabaikan
      if (cur[p.at] && String(cur[p.at].scholar.id) === String(p.ownerId)) {
        applied.push(p);
        cur = buildTeacherChain(startId, { maxDepth: depth, prefs: applied });
      }
    }
    return cur;
  }, [startId, prefs, depth]);

  const era = useMemo(() => eraLabelForChain(chain), [chain]);

  useLayoutEffect(() => {
    if (chain.length > 0) {
      navigation.setOptions({ title: `Sanad: ${shortName(chain[0].scholar)}` });
    }
  }, [chain, navigation]);

  const reroute = useCallback((at, ownerId, preferId) => {
    setPrefs((prev) => {
      const rest = prev.filter((p) => !(p.kind === 'reroute' && p.ownerId === ownerId && p.at === at));
      return [...rest, { kind: 'reroute', at, ownerId, preferId }];
    });
  }, []);

  const deepen = useCallback(() => {
    setDeepenCount((c) => Math.min(c + 1, 3));
  }, []);

  if (!startId || !getScholar(startId)) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: pal.colors.bg }}>
        <View style={styles.center}>
          <Text style={[styles.centerText, { color: pal.colors.text }]}>Data ulama tidak ditemukan.</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backLink}>
            <Text style={[styles.backText, { color: pal.colors.primary }]}>Kembali</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const canDeepen = (() => {
    const last = chain[chain.length - 1];
    if (!last) return false;
    const inChain = new Set(chain.map((c) => String(c.scholar.id)));
    return teachersOf(last.scholar).some((t) => !inChain.has(String(t.id)));
  })();

  const renderConnector = (genLabel) => (
    <View style={styles.connector}>
      <View style={styles.connectorLine} />
      <View style={styles.connectorBadge}>
        <Ionicons name="arrow-up" size={11} color="#ffffff" />
        <Text style={styles.connectorGen}>{genLabel}</Text>
      </View>
      <View style={styles.connectorLine} />
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: pal.colors.bg }}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Ringkasan rantai */}
        <LinearGradient
          colors={darkMode ? [pal.colors.primaryLight + '33', pal.colors.surface] : [pal.colors.primaryLight, pal.colors.white]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.headerCard, { backgroundColor: pal.colors.surface, borderColor: pal.colors.surfaceBorder }]}
        >
          <View style={styles.headerRow}>
            <View style={[styles.headerIcon, { backgroundColor: pal.colors.primaryLight + '22' }]}>
              <Ionicons name="git-network-outline" size={20} color={pal.colors.primaryDark} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                Rantai Sanad — {shortName(chain[0]?.scholar)}
              </Text>
              <Text style={styles.headerMeta}>
                {chain.length} generasi{era ? ` • ${era}` : ''}
              </Text>
            </View>
          </View>
          <Text style={styles.headerHint}>
            Rantai guru dari ulama ini ke atas. Rute otomatis memilih guru paling awal; ketuk "Lewat" untuk mengubah jalur.
          </Text>
        </LinearGradient>

        {/* Rantai vertikal */}
        {chain.map((node, i) => {
          const u = node.scholar;
          const year = u.death_hijri != null && u.death_hijri !== '' ? `w. ${u.death_hijri} H` : null;
          const isLast = i === chain.length - 1;
          const genLabel = i === 0 ? 'Mulai' : `Gen ${i}`;
          return (
            <View key={`${u.id}-${i}`}>
              {/* Kartu ulama */}
              <TouchableOpacity
                style={[
                  styles.nodeCard,
                  { backgroundColor: pal.colors.surface, borderColor: pal.colors.surfaceBorder },
                  isLast && { borderColor: pal.colors.primary },
                ]}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('UlamaDetail', { scholarId: String(u.id) })}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{i}</Text>
                  <Text style={styles.avatarGen}>{i === 0 ? 'MULAI' : 'GURU'}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.nodeName} numberOfLines={1}>
                    {shortName(u)}
                  </Text>
                  {!!u.name_ar && (
                    <Text style={styles.nodeNameAr} numberOfLines={1}>
                      {u.name_ar}
                    </Text>
                  )}
                  <View style={styles.metaRow}>
                    {!!year && (
                      <View style={[styles.metaChip, { backgroundColor: pal.colors.primaryLight + '22', borderColor: pal.colors.primaryLight }]}>
                        <Ionicons name="calendar-outline" size={11} color={pal.colors.primaryDark} />
                        <Text style={styles.metaChipText}>{year}</Text>
                      </View>
                    )}
                    {node.viaOtherTeachers > 0 && (
                      <View style={[styles.metaChip, styles.metaChipAlt]}>
                        <Ionicons name="layers-outline" size={11} color={pal.colors.primaryDark} />
                        <Text style={styles.metaChipText}>+{node.viaOtherTeachers} guru lain</Text>
                      </View>
                    )}
                    {node.viaForced && (
                      <View style={[styles.metaChip, styles.metaChipForced]}>
                        <Ionicons name="git-network-outline" size={11} color="#1d4ed8" />
                        <Text style={styles.metaChipTextForced}>rute pilihan</Text>
                      </View>
                    )}
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color={pal.colors.muted} />
              </TouchableOpacity>

              {/* Chip re-rute: guru lain selain yang dipilih rute otomatis */}
              {(() => {
                const others = teachersOf(u).filter(
                  (t) => !chain.some((c) => String(c.scholar.id) === String(t.id))
                );
                if (!others.length) return null;
                return (
                  <View style={styles.altWrap}>
                    <Text style={styles.altLabel}>Lewat:</Text>
                    {others.slice(0, 6).map((t) => (
                      <TouchableOpacity
                        key={t.id}
                        style={[styles.altChip, { backgroundColor: pal.colors.primaryLight + '22', borderColor: pal.colors.surfaceBorder }]}
                        activeOpacity={0.7}
                        onPress={() => reroute(i, String(u.id), String(t.id))}
                      >
                        <Text style={[styles.altChipText, { color: pal.colors.primary }]} numberOfLines={1}>
                          {shortName(t)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                );
              })()}

              {/* Connector ke guru berikutnya */}
              {!isLast && renderConnector(genLabel)}
            </View>
          );
        })}

        {/* Perdalam rantai bila terpotong batas generasi */}
        {canDeepen && deepenCount < 3 && (
          <TouchableOpacity style={styles.deepenBtn} activeOpacity={0.8} onPress={deepen}>
            <Ionicons name="sparkles-outline" size={16} color="#ffffff" />
            <Text style={styles.deepenText}>Perdalam rantai</Text>
          </TouchableOpacity>
        )}

        {/* Hint terbuka di UlamaDetail */}
        <TouchableOpacity
          style={styles.detailLink}
          activeOpacity={0.8}
          onPress={() => chain.length > 0 && navigation.navigate('UlamaDetail', { scholarId: String(chain[0].scholar.id) })}
        >
          <Ionicons name="person-circle-outline" size={14} color={pal.colors.primaryDark} />
          <Text style={styles.detailLinkText}>
            Buka detail {shortName(chain[0]?.scholar)}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (pal) => StyleSheet.create({
  container: { padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  centerText: { color: pal.colors.text },
  backLink: { marginTop: 8 },
  backText: { color: pal.colors.primary, fontWeight: '700' },
  headerCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: pal.colors.primaryLight,
    backgroundColor: pal.colors.surface,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: pal.colors.primaryLight + '2e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 16, fontWeight: '800', color: pal.colors.text },
  headerMeta: { color: pal.colors.primaryDark, fontWeight: '700', marginTop: 2, fontSize: 12 },
  headerHint: { color: pal.colors.muted, fontSize: 11.5, marginTop: 8, lineHeight: 16 },
  // Kartu node rantai
  nodeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: pal.colors.surface,
    borderWidth: 1,
    borderColor: pal.colors.primaryLight,
    borderRadius: 14,
    padding: 12,
  },
  nodeCardLast: { borderColor: pal.colors.primary },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: pal.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#ffffff', fontWeight: '800', fontSize: 16, lineHeight: 18 },
  avatarGen: { color: 'rgba(255,255,255,0.8)', fontSize: 6.5, fontWeight: '700', letterSpacing: 0.5 },
  nodeName: { fontSize: 15, fontWeight: '700', color: pal.colors.text },
  nodeNameAr: { fontSize: 13, color: pal.colors.muted, marginTop: 1 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 5 },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: pal.colors.primaryLight + '1f',
    borderWidth: 1,
    borderColor: pal.colors.primaryLight,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  metaChipAlt: { backgroundColor: pal.colors.primaryLight + '1f', borderColor: pal.colors.surfaceBorder },
  metaChipForced: { backgroundColor: pal.colors.surface, borderColor: pal.colors.surfaceBorder },
  metaChipText: { color: pal.colors.primaryDark, fontSize: 10.5, fontWeight: '700' },
  metaChipTextForced: { color: '#1d4ed8', fontSize: 10.5, fontWeight: '700' },
  // Connector antar generasi
  connector: { flexDirection: 'row', alignItems: 'center', paddingLeft: 33, height: 30 },
  connectorLine: { flex: 1, height: 2, backgroundColor: pal.colors.primaryLight },
  connectorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: pal.colors.primaryDark,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  connectorGen: { color: '#ffffff', fontSize: 9.5, fontWeight: '700' },
  // Chip guru alternatif
  altWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
    paddingLeft: 4,
  },
  altLabel: { color: pal.colors.muted, fontSize: 11, fontWeight: '700' },
  altChip: {
    backgroundColor: pal.colors.primaryLight + '2e',
    borderWidth: 1,
    borderColor: pal.colors.primaryLight,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    maxWidth: 220,
  },
  altChipText: { color: pal.colors.primaryDark, fontSize: 11, fontWeight: '600' },
  // Tombol perdalam
  deepenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: pal.colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 14,
  },
  deepenText: { color: '#ffffff', fontWeight: '800' },
  // Tautan ke detail
  detailLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: 10,
    paddingVertical: 8,
  },
  detailLinkText: { color: pal.colors.primaryDark, fontWeight: '700', fontSize: 13 },
});
