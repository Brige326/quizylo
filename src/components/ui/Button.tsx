import * as Haptics from 'expo-haptics';
import {
  ActivityIndicator,
  type GestureResponderEvent,
  Pressable,
  type PressableProps,
  StyleSheet,
  View,
} from 'react-native';

import { Palette, Radius, Spacing, Type } from '@/constants/theme';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'ghost';

export type ButtonProps = Omit<PressableProps, 'style'> & {
  label: string;
  variant?: Variant;
  loading?: boolean;
  fullWidth?: boolean;
  left?: React.ReactNode;
};

export function Button({
  label,
  variant = 'primary',
  loading,
  disabled,
  fullWidth = true,
  left,
  onPress,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const handlePress = (e: GestureResponderEvent) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPress?.(e);
  };
  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.base,
        fullWidth && styles.fullWidth,
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        variant === 'ghost' && styles.ghost,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
      ]}
      {...rest}>
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color={variant === 'primary' ? Palette.onPrimary : Palette.text} />
        ) : (
          <>
            {left}
            <Text
              style={[
                Type.bodyStrong,
                { color: variant === 'primary' ? Palette.onPrimary : Palette.text },
              ]}>
              {label}
            </Text>
          </>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 54,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  fullWidth: { alignSelf: 'stretch' },
  content: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  primary: { backgroundColor: Palette.primary },
  secondary: { backgroundColor: Palette.surfaceElevated, borderWidth: 1, borderColor: Palette.border },
  ghost: { backgroundColor: 'transparent' },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.5 },
});
