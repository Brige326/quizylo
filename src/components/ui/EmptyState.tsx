import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { Palette, Radius, Spacing } from '@/constants/theme';
import { Text } from './Text';

export function EmptyState({
  icon = 'sparkles-outline',
  title,
  subtitle,
  children,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <View style={styles.wrap}>
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={30} color={Palette.primary} />
      </View>
      <Text variant="heading" center>
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
    gap: Spacing.md,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: Radius.pill,
    backgroundColor: Palette.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: { maxWidth: 300 },
  actions: { marginTop: Spacing.md, alignSelf: 'stretch' },
});
