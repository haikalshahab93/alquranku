import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

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

export function GradientCard({ title, desc, onPress, style }) {
  return (
    <TouchableOpacity style={[styles.card, style]} onPress={onPress}>
      <LinearGradient colors={['#ede9fe', '#e9d5ff']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cardBg}>
        <Text style={styles.cardTitle}>{title}</Text>
        {!!desc && <Text style={styles.cardDesc}>{desc}</Text>}
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
});