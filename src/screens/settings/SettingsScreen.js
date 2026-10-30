import React, { useEffect, useState, useRef } from 'react';
import { View, ScrollView, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAladhanHarianCoords, getAladhanHarianCity } from '../../api/aladhan';
import { schedulePrayerReminders, refreshPrayerReminderSchedule } from '../../api/notifications';
import { createAudioPlayer } from 'expo-audio';
import { emitSettingsChanged } from '../../api/settingsEvents';
import { markDirty } from '../../api/sync';
import { getDarkMode, getTextScale } from '../../api/appearance';
import { getPalette } from '../../ui';
import { getKaraokeReciters, getPreferredKaraokeReciter, setPreferredKaraokeReciter } from '../../api/quranAudio';
import { bigStats } from '../../api/bigStore';
import { listOfflineAudio, downloadAllSurahAudio } from '../../api/offlineAudio';
import { useI18n } from '../../api/i18n';
import { GroupHeader } from './components/primitives';
import LanguageCard from './components/LanguageCard';
import AppearanceCard from './components/AppearanceCard';
import NotifCard from './components/NotifCard';
import AndroidBatteryCard from './components/AndroidBatteryCard';
import PrayerMethodCard from './components/PrayerMethodCard';
import PreviewCard from './components/PreviewCard';
import AdvancedCard from './components/AdvancedCard';
import ReciterCard from './components/ReciterCard';
import AudioDownloadCard from './components/AudioDownloadCard';
import StorageCard from './components/StorageCard';

// Sumber audio preview (dua-duanya dibundel lewat config plugin expo-notifications)
const ADHAN_PREVIEW = require('../../../assets/sounds/adhan.mp3');
const DEFAULT_PREVIEW = require('../../../assets/sounds/default_preview.mp3');

// ============================================================
// Layar Setelan — sekarang hanya KERANGKA (state + logika aksi)
// yang menyusun kartu-kartu dari ./components/. Tiap kartu bisa
// diedit / dipindah tanpa menyentuh kartu lain.
//
// KELOMPOK 1: Tampilan & Bahasa  -> LanguageCard, AppearanceCard
// KELOMPOK 2: Sholat & Pengingat -> NotifCard, AndroidBatteryCard,
//                                   PrayerMethodCard, PreviewCard, AdvancedCard
// KELOMPOK 3: Audio & Bacaan     -> ReciterCard, AudioDownloadCard
// KELOMPOK 4: Penyimpanan        -> StorageCard
// ============================================================
export default function SettingsScreen() {
  const { t } = useI18n();

  // === Tampilan: dark mode + ukuran font (dimiliki di sini agar semua
  // kartu langsung ikut berganti palet saat mode gelap diaktifkan) ===
  const [darkMode, setDarkModeState] = useState(false);
  const [textScale, setTextScaleState] = useState(1);
  useEffect(() => {
    (async () => {
      setDarkModeState(await getDarkMode());
      setTextScaleState(await getTextScale());
    })();
  }, []);
  const pal = getPalette(darkMode);

  // === Sholat: metode/madzhab & setelan teknis ===
  const [method, setMethod] = useState('3');
  const [timezonestring, setTimezonestring] = useState('');
  const [tune, setTune] = useState('');
  const [school, setSchool] = useState('0');
  const [midnightMode, setMidnightMode] = useState('');
  const [latitudeAdjustmentMethod, setLatitudeAdjustmentMethod] = useState('');
  const [calendarMethod, setCalendarMethod] = useState('');
  const [shafaq, setShafaq] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null);

  // === Notifikasi pengingat waktu sholat ===
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [notifOffset, setNotifOffset] = useState(0); // menit sebelum waktu sholat
  const [notifSound, setNotifSound] = useState('default'); // 'default' | 'adhan' | 'getar' | 'silent'

  // === Pilihan qari/reciter untuk Mode Karaoke ===
  const [karaokeReciters, setKaraokeReciters] = useState([]);
  const [reciterId, setReciterId] = useState(7);
  const [reciterLoaded, setReciterLoaded] = useState(false);
  const [reciterError, setReciterError] = useState(null);

  // === Statistik penyimpanan (audio offline + cache) — dimiliki di sini agar
  // kartu Unduh Audio & kartu Penyimpanan selalu menampilkan angka yang sama ===
  const [storage, setStorage] = useState({ audioCount: 0, audioBytes: 0, cacheBytes: 0, cacheCount: 0, loading: true });

  // === Unduh semua audio karaoke per surah ===
  const [audioMetaList, setAudioMetaList] = useState([]); // [{ surah, size }] yang sudah terunduh
  const [audioBatch, setAudioBatch] = useState(null); // { done, total, failed } saat mengunduh
  const [audioBatchResult, setAudioBatchResult] = useState(null);
  const [audioShowList, setAudioShowList] = useState(false);
  // Jumlah surah terunduh per qari: { [reciterId]: count }
  const [audioByReciter, setAudioByReciter] = useState({});
  const audioCancelRef = useRef(false); // batal unduh batch

  // === Pratinjau jadwal (kartu "Cek") ===
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(null);

  // Pemain pratinjau suara dikelola manual (createAudioPlayer + release) supaya
  // tidak ada pemain lama yang menyisakan bunyi dobel / tak bisa dihentikan saat
  // pengguna toggle cepat atau berganti chip Bunyi Biasa <-> Suara Adzan.
  const previewSource = notifSound === 'adhan' ? ADHAN_PREVIEW : DEFAULT_PREVIEW;
  const previewPlayerRef = useRef(null);
  const [previewPlaying, setPreviewPlaying] = useState(false);

  const stopPreview = () => {
    const p = previewPlayerRef.current;
    if (p) {
      try { p.pause(); } catch {}
      try { p.removeListener?.('playToEnd', stopPreview); } catch {}
      try { p.release?.(); } catch {}
    }
    previewPlayerRef.current = null;
    setPreviewPlaying(false);
  };

  // Toggle pratinjau: klik untuk MEMUTAR, klik lagi untuk MENGHENTIKAN.
  // Selalu reset penuh sebelum memutar agar tidak ada bunyi dobel.
  const togglePreview = () => {
    try {
      if (previewPlaying || previewPlayerRef.current) { stopPreview(); return; }
      stopPreview();
      const player = createAudioPlayer(previewSource);
      previewPlayerRef.current = player;
      try { player.addListener('playToEnd', stopPreview); } catch {}
      player.play();
      setPreviewPlaying(true);
    } catch (e) { stopPreview(); }
  };

  // Chip suara berganti: pastikan pratinjau lama berhenti & pemain dilepas
  useEffect(() => { stopPreview(); }, [notifSound]);
  // Bersihkan saat layar ditutup
  useEffect(() => { return () => { stopPreview(); }; }, []);

  // ============================================================
  // LOAD — muat semua setelan tersimpan saat layar dibuka
  // ============================================================
  useEffect(() => {
    (async () => {
      try {
        const m = await AsyncStorage.getItem('aladhan_method');
        const tz = await AsyncStorage.getItem('aladhan_timezonestring');
        const tn = await AsyncStorage.getItem('aladhan_tune');
        const sc = await AsyncStorage.getItem('aladhan_school');
        const mm = await AsyncStorage.getItem('aladhan_midnightMode');
        const lam = await AsyncStorage.getItem('aladhan_latitudeAdjustmentMethod');
        const cm = await AsyncStorage.getItem('aladhan_calendarMethod');
        const sf = await AsyncStorage.getItem('aladhan_shafaq');
        const ne = await AsyncStorage.getItem('notif_prayer_enabled');
        const no = await AsyncStorage.getItem('notif_prayer_offset');
        const ns = await AsyncStorage.getItem('notif_prayer_sound');
        if (ne != null) setNotifEnabled(ne !== '0');
        if (no != null && Number.isFinite(parseInt(no, 10))) setNotifOffset(parseInt(no, 10));
        if (['adhan', 'getar', 'silent'].includes(ns)) setNotifSound(ns);
        if (m) setMethod(m);
        if (tz) setTimezonestring(tz);
        if (tn) setTune(tn);
        if (sc) setSchool(sc);
        if (mm) setMidnightMode(mm);
        if (lam) setLatitudeAdjustmentMethod(lam);
        if (cm) setCalendarMethod(cm);
        if (sf) setShafaq(sf);
      } catch (e) {
        console.log('Load settings error', e);
      }
    })();

    // Muat daftar reciter karaoke + pilihan tersimpan
    (async () => {
      try {
        const list = await getKaraokeReciters(false);
        setKaraokeReciters(list);
        setReciterError(null);
      } catch (e) {
        try {
          const stale = await getKaraokeReciters(true); // cache usang pun lebih baik daripada kosong
          setKaraokeReciters(stale || []);
        } catch {}
        setReciterError(t('settings.qariErr'));
      } finally {
        try {
          const pref = await getPreferredKaraokeReciter();
          if (pref != null) setReciterId(pref);
        } catch {}
        setReciterLoaded(true);
      }
    })();
  }, []);

  const pickReciter = async (id) => {
    setReciterId(id);
    try { await setPreferredKaraokeReciter(id); } catch {}
  };

  // ============================================================
  // PENYIMPANAN — statistik bersama (audio offline + cache)
  // ============================================================
  const refreshStorageStats = async () => {
    try {
      const [audio, cache] = await Promise.all([
        listOfflineAudio(),
        bigStats('cache:quran:'),
      ]);
      setStorage({
        audioCount: audio.length,
        audioBytes: audio.reduce((s, m) => s + (m.size || m.bytes || 0), 0),
        cacheBytes: cache.totalBytes || 0,
        cacheCount: cache.count || 0,
        loading: false,
      });
      // Daftar surah yang sudah terunduh (untuk tanda di daftar Unduh Semua)
      setAudioMetaList(
        audio
          .map((m) => ({ surah: Number(m.surah ?? m.nomor ?? m.id), reciterId: m.reciterId, size: m.size || m.bytes || 0 }))
          .filter((m) => Number.isFinite(m.surah) && m.surah > 0)
          .sort((a, b) => a.surah - b.surah)
      );
      // Rekap per qari: berapa surah yang sudah tersimpan offline untuk qari itu
      const perReciter = {};
      audio.forEach((m) => {
        const rid = String(m.reciterId ?? m.reciter_id ?? '');
        if (!rid) return;
        perReciter[rid] = (perReciter[rid] || 0) + 1;
      });
      setAudioByReciter(perReciter);
    } catch {
      setStorage((s) => ({ ...s, loading: false }));
    }
  };
  useEffect(() => { refreshStorageStats(); }, []);

  // === Unduh semua audio karaoke per surah ===
  const startAudioBatchDownload = async () => {
    if (audioBatch) return;
    setAudioBatchResult(null);
    setAudioBatch({ done: 0, total: 114, failed: 0 });
    try {
      const reciterId = await getPreferredKaraokeReciter();
      const res = await downloadAllSurahAudio(
        reciterId,
        (p) => setAudioBatch({ done: p.done, total: p.total, failed: p.failed }),
        () => audioCancelRef.current
      );
      setAudioBatchResult(res);
    } catch {
      setAudioBatchResult({ downloaded: 0, skipped: 0, failed: 114, cancelled: false });
    } finally {
      setAudioBatch(null);
      refreshStorageStats();
    }
  };

  // ============================================================
  // SHOLAT — simpan / pratinjau / penjadwalan notifikasi
  // ============================================================
  // Baca penuh setelan sholat saat ini (dipakai penjadwalan & pratinjau).
  const buildSholatOptions = () => {
    const toNum = (v) => { const n = Number(v); return Number.isFinite(n) ? n : undefined; };
    return {
      method: toNum(method) ?? 3,
      timezonestring: timezonestring || undefined,
      tune: tune || undefined,
      school: toNum(school),
      midnightMode: toNum(midnightMode),
      latitudeAdjustmentMethod: toNum(latitudeAdjustmentMethod),
      calendarMethod: toNum(calendarMethod),
      shafaq: (shafaq || '').trim() || undefined,
    };
  };

  const saveAll = async () => {
    const errors = [];
    if (tune) {
      const parts = tune.split(',').map(s => s.trim());
      if (parts.length !== 8 || parts.some(p => isNaN(parseInt(p)))) {
        errors.push(t('settings.tuneErr'));
      }
    }
    if (errors.length) {
      setSaveMsg({ ok: false, text: t('settings.periksa', { n: errors.join(' ') }) });
      return;
    }
    try {
      await AsyncStorage.setItem('aladhan_method', method || '3');
      await AsyncStorage.setItem('aladhan_timezonestring', timezonestring || '');
      await AsyncStorage.setItem('aladhan_tune', tune || '');
      await AsyncStorage.setItem('aladhan_school', school || '0');
      await AsyncStorage.setItem('aladhan_midnightMode', midnightMode || '');
      await AsyncStorage.setItem('aladhan_latitudeAdjustmentMethod', latitudeAdjustmentMethod || '');
      await AsyncStorage.setItem('aladhan_calendarMethod', calendarMethod || '');
      await AsyncStorage.setItem('aladhan_shafaq', shafaq || '');
      // tandai pembaruan pengaturan agar screen lain dapat refresh otomatis
      await AsyncStorage.setItem('settings:sholat:lastUpdated', String(Date.now()));
      // Beri tahu layar lain (Home, dst.) tanpa polling — event langsung, hemat baterai
      emitSettingsChanged();
      setSaveMsg({ ok: true, text: t('settings.saveOk') });
    } catch (e) {
      setSaveMsg({ ok: false, text: t('settings.saveErr') });
    }
  };

  // Simpan preferensi notifikasi lalu jadwalkan ulang pengingat berdasarkan jadwal hari ini
  const applyNotificationSettings = async (enabled, offset, sound = notifSound) => {
    try {
      await AsyncStorage.setItem('notif_prayer_enabled', enabled ? '1' : '0');
      await AsyncStorage.setItem('notif_prayer_offset', String(offset));
      await AsyncStorage.setItem('notif_prayer_sound', ['adhan', 'getar', 'silent'].includes(sound) ? sound : 'default');
    } catch (e) {}
    // Beri tahu semua layar (termasuk layar Jadwal Sholat) agar ikut berubah live
    emitSettingsChanged();
    // Setelan berubah → antre sinkronisasi ke cloud (no-op bila belum disetup)
    markDirty('settings').catch(() => {});
    if (!enabled) {
      try { await schedulePrayerReminders({ enabled: false }); } catch (e) {}
      return;
    }
    try {
      // Koordinat terakhir yang diketahui; jika belum ada, tarik lokasi via IP
      let lat = null, lon = null, city = null, country = null;
      try {
        const la = await AsyncStorage.getItem('last_lat');
        const lo = await AsyncStorage.getItem('last_lon');
        if (la != null && lo != null) { lat = parseFloat(la); lon = parseFloat(lo); }
      } catch (e) {}
      if (lat == null && typeof navigator !== 'undefined' && 'geolocation' in navigator) {
        try {
          await new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
              (pos) => { lat = pos.coords.latitude; lon = pos.coords.longitude; resolve(); },
              () => resolve(),
              { enableHighAccuracy: true, maximumAge: 60000, timeout: 8000 }
            );
          });
        } catch (e) {}
      }
      if (lat == null) {
        try {
          const resp = await fetch('https://ipapi.co/json');
          const json = await resp.json();
          city = json?.city || json?.region || 'Jakarta';
          country = json?.country_name || 'Indonesia';
        } catch (e) {}
      }
      // Di Android memakai jadwal bulanan multi-hari eksak; iOS pakai repeat harian.
      // Bila offline, refresh akan memakai snapshot jadwal terakhir yang tersimpan.
      const result = await refreshPrayerReminderSchedule({
        lat, lon, city, country,
        options: buildSholatOptions(),
        offsetMinutes: offset,
        enabled: true,
        soundChoice: (['adhan', 'getar', 'silent'].includes(sound) ? sound : 'default'),
      });
      if (Platform.OS !== 'web') {
        if (result?.reason === 'permission') alert(t('settings.errIzinNotif'));
        else if (result?.reason === 'no-data') alert(t('settings.errNoData'));
        else alert(t('settings.suksesJadwal', { n: result?.scheduled ?? 0 }));
      }
    } catch (e) {
      if (Platform.OS !== 'web') alert(t('settings.errJadwal'));
    }
  };

  const resetDefaults = () => {
    setMethod('3');
    setSchool('0');
    setMidnightMode('');
    setLatitudeAdjustmentMethod('');
    setShafaq('');
    setTimezonestring('');
    setTune('');
    setCalendarMethod('');
    setSaveMsg(null);
  };

  const detectTimezone = () => {
    try {
      const tz = Intl?.DateTimeFormat?.().resolvedOptions?.().timeZone;
      if (tz) {
        setTimezonestring(tz);
      } else {
        alert(t('settings.errTz'));
      }
    } catch (e) {
      alert(t('settings.errTz'));
    }
  };

  const doPreview = async () => {
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const iso = new Date().toISOString().slice(0, 10);
      let lat = null, lon = null;
      if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
        try {
          await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
              (pos) => { lat = pos.coords.latitude; lon = pos.coords.longitude; resolve(); },
              (err) => { resolve(); },
              { enableHighAccuracy: true, maximumAge: 10000, timeout: 8000 }
            );
          });
        } catch {}
      }
      if (lat != null && lon != null) {
        const res = await getAladhanHarianCoords(lat, lon, iso, buildSholatOptions());
        setPreview(res?.data || null);
      } else {
        try {
          const resp = await fetch('https://ipapi.co/json');
          const json = await resp.json();
          const city = json?.city || json?.region || json?.region_code || 'Jakarta';
          const country = json?.country_name || json?.country || 'Indonesia';
          const res = await getAladhanHarianCity(city, country, iso, buildSholatOptions());
          setPreview(res?.data || null);
        } catch (e) {
          setPreviewError(t('settings.previewErr'));
        }
      }
    } catch (e) {
      setPreviewError(e?.message || t('settings.previewLoadErr'));
    } finally {
      setPreviewLoading(false);
    }
  };

  // ============================================================
  // RENDER — kerangka tipis: header kelompok + kartu-kartu
  // ============================================================
  return (
    <ScrollView contentContainerStyle={{ padding: 16, backgroundColor: pal.colors.bg }}>

      {/** ==================== KELOMPOK 1: TAMPILAN & BAHASA ==================== **/}
      <GroupHeader pal={pal} icon="settings-outline" label={t('settings.grupTampilan')} desc={t('settings.grupTampilanDesc')} />
      <LanguageCard pal={pal} />
      <AppearanceCard pal={pal} darkMode={darkMode} setDarkModeState={setDarkModeState} textScale={textScale} setTextScaleState={setTextScaleState} />

      {/** ==================== KELOMPOK 2: SHOLAT & PENGINGAT ==================== **/}
      <GroupHeader pal={pal} icon="notifications-outline" label={t('settings.grupSholat')} desc={t('settings.grupSholatDesc')} />
      <NotifCard
        pal={pal}
        notifEnabled={notifEnabled} setNotifEnabled={setNotifEnabled}
        notifOffset={notifOffset} setNotifOffset={setNotifOffset}
        notifSound={notifSound} setNotifSound={setNotifSound}
        onApply={applyNotificationSettings}
        previewPlaying={previewPlaying} togglePreview={togglePreview}
      />
      {Platform.OS === 'android' && <AndroidBatteryCard pal={pal} />}
      <PrayerMethodCard pal={pal} method={method} setMethod={setMethod} school={school} setSchool={setSchool} saveMsg={saveMsg} saveAll={saveAll} />
      <PreviewCard pal={pal} preview={preview} previewLoading={previewLoading} previewError={previewError} doPreview={doPreview} />
      <AdvancedCard
        pal={pal}
        showAdvanced={showAdvanced} setShowAdvanced={setShowAdvanced}
        adv={{ timezonestring, tune, midnightMode, latitudeAdjustmentMethod, shafaq, calendarMethod }}
        setAdv={{ timezonestring: setTimezonestring, tune: setTune, midnightMode: setMidnightMode, latitudeAdjustmentMethod: setLatitudeAdjustmentMethod, shafaq: setShafaq, calendarMethod: setCalendarMethod }}
        detectTimezone={detectTimezone} resetDefaults={resetDefaults} saveAll={saveAll}
      />

      {/** ==================== KELOMPOK 3: AUDIO & BACAAN ==================== **/}
      <GroupHeader pal={pal} icon="musical-notes-outline" label={t('settings.grupAudio')} desc={t('settings.grupAudioDesc')} />
      <ReciterCard pal={pal} karaokeReciters={karaokeReciters} reciterId={reciterId} reciterLoaded={reciterLoaded} reciterError={reciterError} audioByReciter={audioByReciter} pickReciter={pickReciter} />
      <AudioDownloadCard
        pal={pal}
        storage={storage}
        audioBatch={audioBatch} audioBatchResult={audioBatchResult}
        audioCancelRef={audioCancelRef} startAudioBatchDownload={startAudioBatchDownload}
        audioShowList={audioShowList} setAudioShowList={setAudioShowList}
        audioMetaList={audioMetaList} reciterId={reciterId}
        karaokeReciters={karaokeReciters} audioByReciter={audioByReciter}
      />

      {/** ==================== KELOMPOK 4: PENYIMPANAN ==================== **/}
      <GroupHeader pal={pal} icon="server-outline" label={t('settings.storage')} desc={t('settings.penyimpananDesc')} />
      <StorageCard pal={pal} storage={storage} onRefresh={refreshStorageStats} />

    </ScrollView>
  );
}
