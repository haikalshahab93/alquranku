import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Rect, Polygon } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';

export const theme = {
  colors: {
    primary: '#8b5cf6',
    primaryDark: '#6d28d9',
    primaryLight: '#a78bfa',
    // Permukaan shell gelap (header & bottom bar)
    shellDark: '#17102b',
    shellDark2: '#1e1535',
    shellBorder: 'rgba(167, 139, 250, 0.25)',
    shellText: '#e9e4f5',
    shellMuted: '#8d84ab',
    bg: '#f8fafc',
    text: '#1f2937',
    muted: '#6b7280',
    white: '#ffffff',
  },
  gradients: {
    brand: ['#7c3aed', '#4c1d95'],
    brandSoft: ['#ede9fe', '#e9d5ff'],
    shell: ['#1a1130', '#221743'],
  },
  radii: { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 },
  shadow: {
    // boxShadow (RN 0.76+): satu properti lintas platform, tanpa warning deprecated di web
    card: { elevation: 2, boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.08)' },
    float: { elevation: 6, boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.18)' },
  },
};

export function BookIcon({ size = 72, style }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 72 72" style={style}>
      {/* Spine */}
      <Rect x="32" y="18" width="8" height="36" rx="2" fill={theme.colors.primaryDark} />
      {/* Left page */}
      <Polygon points="32,18 12,22 12,54 32,50" fill="#ffffff" stroke={theme.colors.primaryLight} strokeWidth="2" />
      {/* Right page */}
      <Polygon points="40,18 60,22 60,54 40,50" fill="#ffffff" stroke={theme.colors.primaryLight} strokeWidth="2" />
      {/* Page lines */}
      <Path d="M14 28 L30 25" stroke={theme.colors.primary} strokeWidth="1.5" />
      <Path d="M42 25 L58 28" stroke={theme.colors.primary} strokeWidth="1.5" />
      <Path d="M14 34 L30 31" stroke={theme.colors.primary} strokeWidth="1.2" />
      <Path d="M42 31 L58 34" stroke={theme.colors.primary} strokeWidth="1.2" />
    </Svg>
  );
}

export function GradientCard({ title, desc, onPress, style, showQuran }) {
  return (
    <TouchableOpacity style={[styles.card, style]} onPress={onPress} activeOpacity={0.85}>
      <LinearGradient colors={theme.gradients.brandSoft} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cardBg}>
        <View style={styles.cardRow}>
          <View style={styles.cardTextBox}>
            <Text style={styles.cardTitle}>{title}</Text>
            {!!desc && <Text style={styles.cardDesc}>{desc}</Text>}
          </View>
          {showQuran && <BookIcon style={styles.cardIcon} />}
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

export function PurpleButton({ label, onPress, style }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.purpleBtn, style]} activeOpacity={0.85}>
      <Text style={styles.purpleBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

export function OutlineLightButton({ label, onPress, style }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.lightOutlineBtn, style]} activeOpacity={0.85}>
      <Text style={styles.lightOutlineBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

export function SectionTitle({ children, style }) {
  return <Text style={[styles.sectionTitle, style]}>{children}</Text>;
}

export function SecondaryText({ children, style }) {
  return <Text style={[styles.secondaryText, style]}>{children}</Text>;
}

// Ubin menu dengan ikon berwarna untuk grid fitur
export function FeatureTile({ title, icon, iconColor, onPress, style }) {
  return (
    <TouchableOpacity style={[styles.tile, style]} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.tileInner}>
        <View style={[styles.tileIconWrap, { backgroundColor: (iconColor || theme.colors.primary) + '1f' }]}>
          <Ionicons name={icon} size={22} color={iconColor || theme.colors.primary} />
        </View>
        <Text style={styles.tileTitle}>{title}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 0,
    borderWidth: 1,
    borderColor: theme.colors.primaryLight,
    backgroundColor: theme.colors.white,
    borderRadius: theme.radii.lg,
    ...theme.shadow.card,
    marginBottom: 14,
    overflow: 'hidden',
  },
  cardBg: { padding: 16, borderRadius: theme.radii.lg, borderWidth: 1, borderColor: theme.colors.primaryLight },
  cardTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
  cardDesc: { color: theme.colors.muted, marginTop: 6 },
  cardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTextBox: { flex: 1, paddingRight: 8 },
  cardIcon: { width: 72, height: 72 },
  purpleBtn: {
    backgroundColor: theme.colors.primaryDark,
    borderRadius: theme.radii.md,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: theme.colors.primaryLight,
  },
  purpleBtnText: { color: theme.colors.white, fontWeight: '700' },

  lightOutlineBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: theme.radii.md,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  lightOutlineBtnText: { color: theme.colors.white, fontWeight: '700' },

  sectionTitle: { fontSize: 20, fontWeight: '800', color: theme.colors.text },
  secondaryText: { color: theme.colors.muted },

  // Grid fitur
  tile: {
    width: '31.5%',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ede9fe',
    backgroundColor: theme.colors.white,
    borderRadius: theme.radii.lg,
    ...theme.shadow.card,
  },
  tileInner: { paddingVertical: 14, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
  tileIconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  tileTitle: { fontSize: 12, fontWeight: '600', color: theme.colors.text, textAlign: 'center' },
});