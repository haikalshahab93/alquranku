import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Platform, Linking, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import { Ionicons } from '@expo/vector-icons';
import { useAppearance } from '../../../api/appearance.js';
import { useI18n } from '../../../api/i18n.js';
import { getPalette } from '../../../ui';
import { PRIVACY_POLICY_URL } from '../../../api/appLink.js';

// Kebijakan privasi dibundel dari playstore/privacy-policy.html (aset),
// sehingga selalu tersedia di dalam app — TANPA internet.
const PRIVACY_HTML = require('../../../../playstore/privacy-policy.html');

// PENTING: bila PRIVACY_POLICY_URL di appLink.js sudah diisi (setelah
// kebijakan di-hosting), layar ini langsung membukanya di browser saja.

const stripTags = (s) => String(s || '')
  .replace(/<[^>]+>/g, '')
  .replace(/&amp;/g, '&')
  .replace(/&nbsp;/g, ' ')
  .replace(/&gt;/g, '>')
  .replace(/&lt;/g, '<')
  .replace(/\u0000/g, '')
  .trim();

// Ubah HTML sederhana jadi daftar blok berjenjang (judul / paragraf / butir)
function htmlToBlocks(html) {
  const blocks = [];
  const re = /<(h1|h2|h3|p|li)[^>]*>([\s\S]*?)<\/\1>/gi;
  let m;
  while ((m = re.exec(html))) {
    const text = stripTags(m[2]);
    if (text) blocks.push({ tag: m[1].toLowerCase(), text });
  }
  return blocks;
}

export default function PrivacyScreen({ navigation }) {
  const { darkMode } = useAppearance();
  const { t } = useI18n();
  const pal = getPalette(darkMode);
  const [blocks, setBlocks] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    // Jika tautan kebijakan publik sudah diisi, langsung buka di browser.
    if (PRIVACY_POLICY_URL) {
      Linking.openURL(PRIVACY_POLICY_URL).catch(() => {});
      navigation?.goBack?.();
      return;
    }
    let alive = true;
    (async () => {
      try {
        const asset = Asset.fromModule(PRIVACY_HTML);
        if (!asset.downloaded) await asset.downloadAsync();
        let html = '';
        if (asset.localUri && Platform.OS !== 'web') {
          html = await FileSystem.readAsStringAsync(asset.localUri);
        } else if (Platform.OS === 'web') {
          const resp = await fetch(asset.uri || asset.localUri);
          html = await resp.text();
        }
        const parsed = htmlToBlocks(html);
        if (!alive) return;
        setBlocks(parsed.length ? parsed : null);
        if (!parsed.length) setFailed(true);
      } catch (e) {
        if (alive) setFailed(true);
      }
    })();
    return () => { alive = false; };
  }, []);

  const HeaderBtn = ({ icon, onPress }) => (
    <TouchableOpacity onPress={onPress} style={{ padding: 8 }} accessibilityRole="button">
      <Ionicons name={icon} size={22} color="#ffffff" />
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: pal.colors.bg }}>
      <StatusBar style="light" />
      <View style={{ backgroundColor: pal.colors.primary, paddingTop: 50, paddingBottom: 12, paddingHorizontal: 4, flexDirection: 'row', alignItems: 'center', borderBottomLeftRadius: 14, borderBottomRightRadius: 14 }}>
        <HeaderBtn icon="arrow-back" onPress={() => navigation?.goBack?.()} />
        <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700', flex: 1 }} numberOfLines={1}>{t('privacy.title')}</Text>
      </View>

      {blocks === null && !failed ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={pal.colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          {blocks && blocks.map((b, i) => {
            if (b.tag === 'h1') {
              return (
                <Text key={i} style={{ fontSize: 19, fontWeight: '800', color: pal.colors.text, marginTop: i === 0 ? 0 : 18, marginBottom: 8, textAlign: 'center' }}>{b.text}</Text>
              );
            }
            if (b.tag === 'h2' || b.tag === 'h3') {
              return (
                <Text key={i} style={{ fontSize: 16, fontWeight: '800', color: pal.colors.primary, marginTop: 14, marginBottom: 6 }}>{b.text}</Text>
              );
            }
            return (
              <Text key={i} style={{ fontSize: 13.5, lineHeight: 20, color: pal.colors.text, marginBottom: 8, paddingLeft: b.tag === 'li' ? 10 : 0 }}>
                {b.tag === 'li' ? `• ${b.text}` : b.text}
              </Text>
            );
          })}
          {failed && (
            <Text style={{ color: '#b91c1c', textAlign: 'center', marginTop: 40 }}>{t('privacy.muatGagal')}</Text>
          )}
        </ScrollView>
      )}
    </View>
  );
  }
