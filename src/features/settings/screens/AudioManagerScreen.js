import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Platform, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAppearance } from '../../../api/appearance.js';
import { useI18n } from '../../../api/i18n.js';
import { getKaraokeReciters, getPreferredKaraokeReciter } from '../../../api/quranAudio.js';
import { listOfflineAudio, downloadSurahAudio, deleteSurahAudio } from '../../../api/offlineAudio.js';
import { getSuratList } from '../../../api/quran.js';
import { getPalette } from '../../../ui';
import { fmtMB } from '../organisms/primitives.js';

// ============================================================
// Audio Manager — kelola audio murottal offline 114 surah per qari:
//  • Baris per surah: ikon unduh/check + nama surah + status & ukuran
//  • Checkbox multi-select (baris pertama = pilih semua)
//  • Aksi header: unduh terpilih & hapus terpilih
// ============================================================
export default function AudioManagerScreen({ navigation }) {
  const { darkMode } = useAppearance();
  const { t } = useI18n();
  const pal = getPalette(darkMode);

  const [loading, setLoading] = useState(true);
  const [reciterId, setReciterId] = useState(7);
  const [reciterName, setReciterName] = useState('');
  const [surahs, setSurahs] = useState([]);          // [{ nomor, namaLatin }]
  const [metaBySurah, setMetaBySurah] = useState({}); // { [surah]: { size, bytes, ... } }
  const [selected, setSelected] = useState({});       // { [surah]: true }
  const [busySurah, setBusySurah] = useState(null);   // unduh tunggal berjalan
  const [batch, setBatch] = useState(null);           // { done, total, failed, surah }
  const batchCancelRef = { current: false };

  const downloadedCount = useMemo(
    () => Object.keys(metaBySurah).length,
    [metaBySurah]
  );
  const selectedList = useMemo(
    () => Object.keys(selected).map(Number).sort((a, b) => a - b),
    [selected]
  );

  const refreshMeta = async (rid) => {
    const list = await listOfflineAudio();
    const map = {};
    for (const m of list) {
      if (String(m.reciterId) === String(rid)) map[Number(m.surah)] = m;
    }
    setMetaBySurah(map);
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const rid = await getPreferredKaraokeReciter();
        if (!alive) return;
        setReciterId(rid);
        const [reciters, list, surahList] = await Promise.all([
          getKaraokeReciters(true).catch(() => []),
          listOfflineAudio(),
          getSuratList().catch(() => null),
        ]);
        if (!alive) return;
        const r = (reciters || []).find((x) => String(x.id) === String(rid));
        setReciterName(r?.name || '');
        const map = {};
        for (const m of list) {
          if (String(m.reciterId) === String(rid)) map[Number(m.surah)] = m;
        }
        setMetaBySurah(map);
        setSurahs((surahList && Array.isArray(surahList)
          ? surahList.map((s, i) => ({
              nomor: Number(s?.nomor ?? s?.number ?? s?.id ?? i + 1),
              namaLatin: String(s?.namaLatin ?? s?.nama_latin ?? s?.name ?? ''),
            })).filter((s) => s.nomor >= 1 && s.nomor <= 114)
          : Array.from({ length: 114 }, (_, i) => ({ nomor: i + 1, namaLatin: '' }))
        ).sort((a, b) => a.nomor - b.nomor));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const nameOf = (n) => surahs.find((s) => s.nomor === n)?.namaLatin || `${t('audioManager.surah')} ${n}`;

  const sizeOf = (n) => {
    const m = metaBySurah[n];
    const b = m?.size || m?.bytes || 0;
    return b > 0 ? fmtMB(b) : '';
  };

  const toggleRow = (n) => {
    if (batch || busySurah != null) return;
    setSelected((prev) => {
      const next = { ...prev };
      if (next[n]) delete next[n];
      else next[n] = true;
      return next;
    });
  };

  const toggleAll = () => {
    if (batch || busySurah != null) return;
    if (selectedList.length === 114) {
      setSelected({});
    } else {
      const all = {};
      for (let n = 1; n <= 114; n++) all[n] = true;
      setSelected(all);
    }
  };

  const downloadOne = async (n, onProgress) => {
    await downloadSurahAudio(n, reciterId, onProgress);
    await refreshMeta(reciterId);
  };

  const onRowPress = async (n) => {
    if (batch) return;
    if (metaBySurah[n]) return; // sudah ada: baris tidak memutar audio di sini
    if (busySurah != null) return;
    setBusySurah(n);
    try {
      await downloadOne(n);
    } catch (e) {
      const msg = String(e?.message || e || '');
      Alert.alert(t('audioManager.gagalJudul'), msg);
    } finally {
      setBusySurah(null);
    }
  };

  // Aksi header: unduh semua surah yang DICENTANG secara berurutan
  const downloadSelected = async () => {
    if (batch || busySurah != null || !selectedList.length) return;
    const targets = selectedList.filter((n) => !metaBySurah[n]);
    if (!targets.length) {
      Alert.alert(t('audioManager.infoJudul'), t('audioManager.sudahLengkap'));
      return;
    }
    batchCancelRef.current = false;
    setBatch({ done: 0, total: targets.length, failed: 0, surah: targets[0] });
    let failed = 0, reason = '';
    for (let i = 0; i < targets.length; i++) {
      if (batchCancelRef.current) break;
      const n = targets[i];
      setBatch({ done: i, total: targets.length, failed, surah: n });
      try {
        await downloadSurahAudio(n, reciterId);
      } catch (e) {
        failed++;
        if (!reason) reason = String(e?.message || e || '');
        if (Platform.OS === 'web') break; // penyebab struktural (web) — tidak ada gunanya lanjut
      }
      setBatch({ done: i + 1, total: targets.length, failed, surah: n });
    }
    await refreshMeta(reciterId);
    setBatch(null);
    setSelected({});
    if (failed || batchCancelRef.current) {
      Alert.alert(t('audioManager.infoJudul'), t('audioManager.batchDone', { d: 0, s: 0, f: failed }) + (reason ? `\n${reason}` : ''));
    }
  };

  // Aksi header: hapus semua surah yang DICENTANG
  const deleteSelected = () => {
    if (batch || busySurah != null || !selectedList.length) return;
    const targets = selectedList;
    Alert.alert(
      t('audioManager.konfirmasiHapusTitle'),
      t('audioManager.konfirmasiHapusBody', { n: targets.length }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            setBatch({ done: 0, total: targets.length, failed: 0, deleting: true, surah: targets[0] });
            let failed = 0;
            for (let i = 0; i < targets.length; i++) {
              const n = targets[i];
              try { await deleteSurahAudio(n, reciterId); } catch { failed++; }
              setBatch({ done: i + 1, total: targets.length, failed, deleting: true, surah: n });
            }
            await refreshMeta(reciterId);
            setBatch(null);
            setSelected({});
          },
        },
      ]
    );
  };

  const HeaderBtn = ({ icon, onPress, disabled, danger }) => (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={{ opacity: disabled ? 0.35 : 1, padding: 8 }}
      accessibilityRole="button"
    >
      <Ionicons name={icon} size={22} color={danger ? '#fca5a5' : '#ffffff'} />
    </TouchableOpacity>
  );

  const Row = ({ item }) => {
    const n = item.nomor;
    const done = !!metaBySurah[n];
    const isBusy = busySurah === n || (batch && !batch.deleting && batch.surah === n);
    const checked = !!selected[n];
    return (
      <View style={{ backgroundColor: pal.colors.surface, borderBottomWidth: 1, borderBottomColor: pal.colors.surfaceBorder }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12 }}>
          <TouchableOpacity
            onPress={() => onRowPress(n)}
            disabled={done || isBusy || !!batch}
            style={{ padding: 6, opacity: done ? 1 : (isBusy || batch ? 0.5 : 1) }}
            accessibilityRole="button"
            accessibilityLabel={done ? t('audioManager.terunduh') : t('audioManager.unduhSatu', { n })}
          >
            {isBusy ? (
              <ActivityIndicator size="small" color={pal.colors.primary} />
            ) : done ? (
              <Ionicons name="checkmark-circle" size={26} color="#8b5cf6" />
            ) : (
              <Ionicons name="arrow-down-circle-outline" size={26} color={pal.colors.muted} />
            )}
          </TouchableOpacity>
          <View style={{ flex: 1, minWidth: 0, marginHorizontal: 8 }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: pal.colors.text }} numberOfLines={1}>{n}. {nameOf(n)}</Text>
            <Text style={{ fontSize: 12, color: done ? '#8b5cf6' : pal.colors.muted, marginTop: 1 }} numberOfLines={1}>
              {done ? `${t('audioManager.terunduh')}${sizeOf(n) ? ` • ${sizeOf(n)}` : ''}` : t('audioManager.belumTerunduh')}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => toggleRow(n)}
            disabled={isBusy || !!batch}
            style={{ padding: 10 }}
            accessibilityRole="checkbox"
            accessibilityState={{ checked }}
          >
            <View style={{
              width: 22, height: 22, borderRadius: 5, borderWidth: 2,
              borderColor: checked ? pal.colors.primary : pal.colors.surfaceBorder,
              backgroundColor: checked ? pal.colors.primary : 'transparent',
              alignItems: 'center', justifyContent: 'center',
            }}>
              {checked ? <Ionicons name="checkmark" size={14} color="#ffffff" /> : null}
            </View>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const ListHeader = () => (
    <View style={{ backgroundColor: pal.colors.surface, borderBottomWidth: 1, borderBottomColor: pal.colors.surfaceBorder }}>
      <TouchableOpacity onPress={toggleAll} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12 }}>
        <View style={{ width: 26 }} />
        <View style={{ flex: 1, marginHorizontal: 8 }}>
          <Text style={{ textAlign: 'center', fontWeight: '700', color: pal.colors.primary }}>{t('audioManager.qariLabel')}</Text>
          <Text style={{ textAlign: 'center', fontSize: 14, color: pal.colors.muted }}>{reciterName || `#${reciterId}`}</Text>
        </View>
        <TouchableOpacity onPress={toggleAll} style={{ padding: 10 }} accessibilityRole="checkbox">
          <View style={{
            width: 22, height: 22, borderRadius: 5, borderWidth: 2,
            borderColor: selectedList.length === 114 ? pal.colors.primary : pal.colors.surfaceBorder,
            backgroundColor: selectedList.length === 114 ? pal.colors.primary : 'transparent',
            alignItems: 'center', justifyContent: 'center',
          }}>
            {selectedList.length === 114 ? <Ionicons name="checkmark" size={14} color="#ffffff" /> : null}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
      <Text style={{ fontSize: 12, color: pal.colors.muted, paddingHorizontal: 12, paddingBottom: 8, textAlign: 'center' }}>
        {t('audioManager.ringkasan', { n: downloadedCount })}
      </Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: pal.colors.bg }}>
      <StatusBar style="light" />
      {/* Header bar: kembali + judul + aksi unduh/hapus multi-select */}
      <View style={{ backgroundColor: theme?.colors?.primary || '#7c3aed', paddingTop: 50, paddingBottom: 12, paddingHorizontal: 4, flexDirection: 'row', alignItems: 'center', borderBottomLeftRadius: 14, borderBottomRightRadius: 14 }}>
        <HeaderBtn icon="arrow-back" onPress={() => navigation?.goBack?.()} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700' }} numberOfLines={1}>{t('audioManager.title')}</Text>
          {!!batch && (
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11 }} numberOfLines={1}>
              {batch.deleting
                ? t('audioManager.menghapus', { a: batch.done, b: batch.total })
                : t('audioManager.batchProgress', { a: batch.done, b: batch.total }) + (batch.failed ? t('audioManager.gagalSuffix', { n: batch.failed }) : '')}
            </Text>
          )}
          {!batch && selectedList.length > 0 && (
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11 }}>{t('audioManager.terpilih', { n: selectedList.length })}</Text>
          )}
        </View>
        <HeaderBtn icon="trash-outline" danger disabled={!selectedList.length || !!batch || busySurah != null} onPress={deleteSelected} />
        <HeaderBtn icon="download-outline" disabled={!selectedList.length || !!batch || busySurah != null} onPress={downloadSelected} />
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={pal.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={surahs.length ? surahs : Array.from({ length: 114 }, (_, i) => ({ nomor: i + 1, namaLatin: '' }))}
          keyExtractor={(item) => String(item.nomor)}
          ListHeaderComponent={ListHeader}
          renderItem={Row}
          initialNumToRender={12}
          maxToRenderPerBatch={12}
          windowSize={7}
        />
      )}
    </View>
  );
}
