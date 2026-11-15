/**
 * Quizylo — Design system (thème sombre fidèle à l'app de référence).
 * Les tokens ci-dessous sont la source unique de vérité pour les couleurs,
 * la typographie et les espacements. On garde aussi quelques exports hérités
 * du template (Spacing, Fonts, BottomTabInset, MaxContentWidth).
 */

import { Platform } from 'react-native';

/** Palette Quizylo — fond très sombre, accent vert vif, mascotte violette. */
export const Palette = {
  // Fonds — noir doux qui tend légèrement vers le gris (moins dur que le noir pur)
  background: '#14151B',
  surface: '#1D1F26',
  surfaceElevated: '#262932',
  surfaceSelected: '#2F323C',
  // Bordures / séparateurs
  border: '#2E313B',
  borderSubtle: '#212329',
  // Texte
  text: '#FFFFFF',
  textSecondary: '#9BA1AC',
  textMuted: '#636974',
  // Accent principal (vert — CTA, progression, parcours)
  primary: '#22E07B',
  primaryPressed: '#1BC56C',
  primarySurface: '#0F2A1C',
  onPrimary: '#06130C',
  // Secondaire (mascotte / IA)
  purple: '#7C5CFF',
  purpleSurface: '#1C1838',
  // Signaux
  streak: '#FF6A2B', // flamme / série
  gold: '#F5B301', // ligue / récompense
  danger: '#F0432B',
  info: '#3B9EFF',
} as const;

/** Compat template : Colors.light / Colors.dark (l'app tourne en dark). */
export const Colors = {
  light: {
    text: Palette.text,
    background: Palette.background,
    backgroundElement: Palette.surface,
    backgroundSelected: Palette.surfaceSelected,
    textSecondary: Palette.textSecondary,
  },
  dark: {
    text: Palette.text,
    background: Palette.background,
    backgroundElement: Palette.surface,
    backgroundSelected: Palette.surfaceSelected,
    textSecondary: Palette.textSecondary,
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

/** Échelle typographique. */
export const Type = {
  display: { fontSize: 28, lineHeight: 34, fontWeight: '800' as const },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '800' as const },
  heading: { fontSize: 18, lineHeight: 24, fontWeight: '700' as const },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '500' as const },
  bodyStrong: { fontSize: 15, lineHeight: 22, fontWeight: '700' as const },
  small: { fontSize: 13, lineHeight: 18, fontWeight: '500' as const },
  caption: { fontSize: 11, lineHeight: 14, fontWeight: '600' as const },
} as const;

/** Espacements (px). */
export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
  // alias sémantiques
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const Radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
