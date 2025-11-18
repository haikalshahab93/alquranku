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
    bg: '#f8fafc',
    text: '#1f2937',
    muted: '#6b7280',
    white: '#ffffff',
  },
  radii: { md: 12, lg: 16 },
  shadow: {
    card: {
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 3,
    },
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
    <TouchableOpacity style={[styles.card, style]} onPress={onPress}>
      <LinearGradient colors={['#ede9fe', '#e9d5ff']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cardBg}>
        <Text style={{ display: 'none' }}></Text>
        <Text style={{ display: 'none' }}></Text>
        <Text style={{ display: 'none' }}></Text>
        <Text style={{ display: 'none' }}></Text>
        <Text style={{ display: 'none' }}></Text>
        <Text style={{ display: 'none' }}></Text>
        <Text style={{ display: 'none' }}></Text>
        <Text style={{ display: 'none' }}></Text>
        <Text style={{ display: 'none' }}></Text>
        <Text style={{ display: 'none' }}></Text>
        <Text style={{ display: 'none' }}></Text>
        <Text style={{ display: 'none' }}></Text>
        <Text style={{ display: 'none' }}></Text>
        <Text style={{ display: 'none' }}></Text>
        <Text style={{ display: 'none' }}></Text>
        <Text style={{ display: 'none' }}></Text>
        <Text style={{ display: 'none' }}></Text>
        <Text style={{ display: 'none' }}></Text>
        <Text style={{ display: 'none' }}></Text>
        <Text style={{ display: 'none' }}></Text>
        <Text style={{ display: 'none' }}></Text>
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
    <TouchableOpacity onPress={onPress} style={[styles.purpleBtn, style]}>
      <Text style={styles.purpleBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

export function OutlineLightButton({ label, onPress, style }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.lightOutlineBtn, style]}>
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

// New: Feature tile with icon for compact grid menus
export function FeatureTile({ title, icon, onPress, style }) {
  return (
    <TouchableOpacity style={[styles.tile, style]} onPress={onPress}>
      <View style={styles.tileInner}>
        <Ionicons name={icon} size={28} color={theme.colors.primaryDark} />
        <Text style={styles.tileTitle}>{title}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.primaryLight,
    backgroundColor: theme.colors.white,
    borderRadius: theme.radii.lg,
    ...theme.shadow.card,
    marginBottom: 14,
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

  // Feature grid styles
  tile: {
    width: '47%',
    margin: 4,
    borderWidth: 1,
    borderColor: theme.colors.primaryLight,
    backgroundColor: theme.colors.white,
    borderRadius: theme.radii.lg,
    ...theme.shadow.card,
  },
  tileInner: { paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  tileTitle: { fontSize: 12, fontWeight: '600', color: theme.colors.text, marginTop: 6, textAlign: 'center' },
});