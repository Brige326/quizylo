import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';

import { Palette, Radius, Spacing, Type } from '@/constants/theme';
import { Text } from './Text';

export type TextFieldProps = TextInputProps & {
  label?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  secure?: boolean;
};

export function TextField({ label, icon, secure, style, ...rest }: TextFieldProps) {
  const [hidden, setHidden] = useState(!!secure);
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrap}>
      {label ? (
        <Text variant="small" color={Palette.textSecondary} style={styles.label}>
          {label}
        </Text>
      ) : null}
      <View style={[styles.field, focused && styles.fieldFocused]}>
        {icon ? <Ionicons name={icon} size={18} color={Palette.textMuted} /> : null}
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={Palette.textMuted}
          secureTextEntry={hidden}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...rest}
        />
        {secure ? (
          <Pressable hitSlop={8} onPress={() => setHidden((h) => !h)}>
            <Ionicons
              name={hidden ? 'eye-outline' : 'eye-off-outline'}
              size={18}
              color={Palette.textMuted}
            />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.xs },
  label: { marginLeft: Spacing.xs },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Palette.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Palette.border,
    paddingHorizontal: Spacing.lg,
    height: 54,
  },
  fieldFocused: { borderColor: Palette.primary },
  input: { flex: 1, color: Palette.text, ...Type.body },
});
