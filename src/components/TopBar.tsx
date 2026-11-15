import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { Palette, Radius, Spacing } from '@/constants/theme';
import { Text } from '@/components/ui/Text';

type TopBarProps = {
  xp?: number;
  streak?: number;
  onMenu?: () => void;
  onPro?: () => void;
};

export function TopBar({ xp = 0, streak = 0, onMenu, onPro }: TopBarProps) {
  return (
    <View style={styles.row}>
      <Pressable hitSlop={10} onPress={onMenu} accessibilityLabel="Menu">
        <Ionicons name="menu" size={26} color={Palette.text} />
      </Pressable>

      <View style={styles.right}>
        <Pressable style={styles.proPill} onPress={onPro} accessibilityRole="button">
          <Ionicons name="flash" size={13} color={Palette.purple} />
          <Text variant="caption" color={Palette.purple}>
            Obtenir PRO
          </Text>
        </Pressable>

        <View style={styles.stat}>
          <Ionicons name="diamond" size={15} color={Palette.info} />
          <Text variant="bodyStrong">{xp}</Text>
        </View>

        <View style={styles.stat}>
          <Ionicons name="flame" size={15} color={Palette.streak} />
          <Text variant="bodyStrong">{streak}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
  },
  right: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  proPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Palette.purpleSurface,
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
