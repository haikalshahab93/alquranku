import React from 'react';
import { Text, View, TouchableOpacity, Linking, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../../../api/i18n.js';
import { CONTACT_LINKS } from '../../../api/appLink.js';

// ============================================================
// KARTU — Kontak Kami: ikon Instagram, Email, Website ala kartu
// About. Tautannya dikumpulkan di SATU tempat (appLink.js) supaya
// ganti akun hanya mengubah satu file.
// ============================================================
const TAN = '#b9975b'; // warna ikon hangat seperti kartu kontak umum

export default function ContactCard({ pal }) {
  const { t } = useI18n();

  const open = (url) => {
    if (!url || url.includes('_GANTI')) {
      Alert.alert(t('settings.kontakKami'), t('settings.kontakBelumDiset'));
      return;
    }
    if (Platform.OS === 'web') {
      try { window.open(url, '_blank'); } catch {}
      return;
    }
    Linking.openURL(url).catch(() => {});
  };

  // Hanya ikon yang tautannya benar-benar terisi yang tampil
  // (sekarang: email). Ikon lain muncul otomatis setelah CONTACT_LINKS
  // diisi di appLink.js.
  const items = [
    CONTACT_LINKS.email ? { icon: 'mail-outline', label: t('settings.kontakEmail'), url: CONTACT_LINKS.email } : null,
    CONTACT_LINKS.instagram ? { icon: 'logo-instagram', label: t('settings.kontakInstagram'), url: CONTACT_LINKS.instagram } : null,
    CONTACT_LINKS.website ? { icon: 'globe-outline', label: t('settings.kontakWebsite'), url: CONTACT_LINKS.website } : null,
  ].filter(Boolean);

  return (
    <View style={{ alignItems: 'center', marginTop: 4, marginBottom: 26 }}>
      <Text style={{ color: pal.colors.primary, fontWeight: '800', fontSize: 15, marginBottom: 12 }}>
        {t('settings.kontakKami')}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {items.map((it) => (
          <TouchableOpacity
            key={it.icon}
            onPress={() => open(it.url)}
            accessibilityRole="button"
            accessibilityLabel={it.label}
            style={{
              width: 44, height: 44, borderRadius: 12, marginHorizontal: 12,
              alignItems: 'center', justifyContent: 'center',
              backgroundColor: pal.colors.surface, borderWidth: 1, borderColor: pal.colors.surfaceBorder,
            }}
          >
            <Ionicons name={it.icon} size={22} color={TAN} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
