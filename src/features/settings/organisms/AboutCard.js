import React from 'react';
import { View, Text, TouchableOpacity, Share, Linking, Platform } from 'react-native';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { APP_PLAY_STORE_URL, openPlayStoreRating, PRIVACY_POLICY_URL } from '../../../api/appLink.js';
import { useI18n } from '../../../api/i18n.js';

// ============================================================
// KARTU — Tentang: nama app, versi, dan tautan unduh Google Play.
// Tautan bisa DIBUKA (langsung ke toko) atau DI-BAGIKAN (menyusul
// fitur share di layar lain), agar orang yang belum memasang app
// ikut bisa mengunduhnya.
// ============================================================
export default function AboutCard({ pal, navigation }) {
  const { t } = useI18n();
  const version = Constants?.expoConfig?.version ? `v${Constants.expoConfig.version}` : '';

  const shareAppLink = async () => {
    try {
      await Share.share({
        message: `${t('settings.shareAppText')}\n\n${APP_PLAY_STORE_URL}`,
      });
    } catch {}
  };

  const openInPlayStore = async () => {
    const nativeUrl = Platform.OS === 'android'
      ? `market://details?id=${APP_PLAY_STORE_URL.split('id=')[1] || ''}`
      : APP_PLAY_STORE_URL;
    try {
      // Coba aplikasi Play Store dulu; bila tidak tersedia (mis. web/emulator),
      // jatuh ke URL https yang selalu terbuka di browser.
      try {
        await Linking.openURL(nativeUrl);
      } catch {
        await Linking.openURL(APP_PLAY_STORE_URL);
      }
    } catch {}
  };

  const RowButton = ({ icon, label, onPress }) => (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12,
        borderRadius: 10, borderWidth: 1, borderColor: pal.colors.surfaceBorder, backgroundColor: pal.colors.surface,
      }}
    >
      <Ionicons name={icon} size={18} color={pal.colors.primary} />
      <Text style={{ flex: 1, marginLeft: 10, fontWeight: '700', color: pal.colors.primary }}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={pal.colors.muted} />
    </TouchableOpacity>
  );

  return (
    <View style={{ marginBottom: 18 }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold', color: pal.colors.text }}>{t('settings.about')}</Text>
      <Text style={{ color: pal.colors.muted, marginBottom: 10 }}>{t('settings.aboutDesc')}</Text>
      <View style={{ backgroundColor: pal.colors.surface, borderWidth: 1, borderColor: pal.colors.surfaceBorder, borderRadius: 12, padding: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontWeight: '800', color: pal.colors.text }} numberOfLines={1}>Alquranku: Al-Qur'an & Ibadah</Text>
            {!!version && <Text style={{ color: pal.colors.muted, marginTop: 2 }}>{t('settings.appVersion')}: {version}</Text>}
          </View>
          <Ionicons name="book-outline" size={28} color={pal.colors.primary} />
        </View>
        <Text style={{ color: pal.colors.muted, marginTop: 8, fontSize: 11 }} numberOfLines={2} selectable>
          {APP_PLAY_STORE_URL}
        </Text>
        <View style={{ gap: 8, marginTop: 10 }}>
          <RowButton icon="share-social-outline" label={t('settings.shareApp')} onPress={shareAppLink} />
          <RowButton icon="logo-google-playstore" label={t('settings.bukaPlayStore')} onPress={openInPlayStore} />
          <RowButton icon="star" label={t('settings.beriRating')} onPress={() => { try { openPlayStoreRating(); } catch {} }} />
          <RowButton
            icon="information-circle"
            label={t('settings.infoPrivasi')}
            onPress={() => {
              if (PRIVACY_POLICY_URL) {
                // Kebijakan sudah di-hosting: buka langsung di browser
                try { Linking.openURL(PRIVACY_POLICY_URL); } catch {}
                return;
              }
              // Belum di-hosting: buka salinan kebijakan yang dibundel di app
              try { navigation?.navigate?.('Privacy'); } catch {}
            }}
          />
        </View>
      </View>
    </View>
  );
}
