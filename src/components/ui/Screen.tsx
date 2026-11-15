import { StyleSheet, View, type ViewProps } from 'react-native';
import { type Edge, SafeAreaView } from 'react-native-safe-area-context';

import { Palette, Spacing } from '@/constants/theme';

export type ScreenProps = ViewProps & {
  edges?: readonly Edge[];
  padded?: boolean;
};

export function Screen({
  children,
  style,
  edges = ['top'],
  padded = false,
  ...rest
}: ScreenProps) {
  return (
    <SafeAreaView edges={edges} style={styles.safe}>
      <View style={[styles.inner, padded && styles.padded, style]} {...rest}>
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Palette.background },
  inner: { flex: 1 },
  padded: { paddingHorizontal: Spacing.lg },
});
