import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { Palette, Radius, Spacing } from '@/constants/theme';
import { Text } from './Text';

/**
 * État vide « premium » : illustration en couches, petit label (eyebrow) vert en majuscules,
 * grand titre, sous-titre, et action pleine largeur. Partagé par tous les espaces.
 */
export function EmptyState({
  icon = 'sparkles-outline',
  eyebrow,
  title,
  subtitle,
  children,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <View style={styles.wrap}>
      {/* Illustration : une tuile centrale + deux cartes en retrait pour la profondeur */}
      <View style={styles.illu}>
        <View style={[styles.card, styles.cardLeft]}>
          <View style={styles.cardLine} />
          <View style={[styles.cardLine, { width: '55%' }]} />
        </View>
        <View style={[styles.card, styles.cardRight]}>
          <View style={styles.cardDot} />
        </View>
        <View style={styles.tile}>
          <Ionicons name={icon} size={46} color={Palette.primary} />
        </View>
      </View>

      {eyebrow ? (
        <View style={styles.eyebrow}>
          <Ionicons name="sparkles" size={13} color={Palette.primary} />
          <Text variant="caption" color={Palette.primary} style={styles.eyebrowText}>
            {eyebrow.toUpperCase()}
          </Text>
        </View>
      ) : null}

      <Text variant="display" center style={styles.title}>
        {title}
      </Text>

      {subtitle ? (
        <Text variant="body" color={Palette.textSecondary} center style={styles.subtitle}>
          {subtitle}
        </Text>
      ) : null}

      {children ? <View style={styles.actions}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  illu: {
    width: 180,
    height: 128,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  tile: {
    width: 96,
    height: 96,
    borderRadius: 26,
    backgroundColor: Palette.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1F4D33',
  },
  card: {
    position: 'absolute',
    width: 70,
    height: 50,
    borderRadius: 12,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: 10,
    justifyContent: 'center',
    gap: 5,
  },
  cardLeft: { left: 8, top: 30, transform: [{ rotate: '-12deg' }] },
  cardRight: { right: 8, top: 36, transform: [{ rotate: '12deg' }], alignItems: 'flex-start' },
  cardLine: { height: 4, width: '80%', borderRadius: 2, backgroundColor: Palette.border },
  cardDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: Palette.primarySurface, borderWidth: 1, borderColor: '#1F4D33' },
  eyebrow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.sm },
  eyebrowText: { letterSpacing: 1.4, fontWeight: '700' },
  title: { maxWidth: 320 },
  subtitle: { maxWidth: 300, marginTop: Spacing.sm },
  actions: { marginTop: Spacing.xl, alignSelf: 'stretch' },
});
