import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { Tappable } from '@/components/ui/Tappable';
import { Text } from '@/components/ui/Text';
import { Palette, Radius, Spacing } from '@/constants/theme';

type TopBarProps = {
  xp?: number;
  streak?: number;
  onMenu?: () => void;
  onPro?: () => void;
};

export function TopBar({ xp = 0, streak = 0, onMenu, onPro }: TopBarProps) {
  return (
    <View style={styles.row}>
      <Tappable onPress={onMenu} hitSlop={10} accessibilityLabel="Menu" scaleTo={0.9}>
        <Ionicons name="menu" size={26} color={Palette.text} />
      </Tappable>

      <View style={styles.right}>
        <Tappable onPress={onPro} style={styles.pro} accessibilityLabel="Obtenir PRO">
          <Text variant="bodyStrong" color={Palette.purple}>
            Obtenir
          </Text>
          <View style={styles.proBadge}>
            <Text variant="caption" color="#fff">
              PRO
            </Text>
          </View>
        </Tappable>

        <View style={styles.stat}>
          <Text variant="bodyStrong">{xp}</Text>
          <Ionicons name="flash" size={16} color={Palette.info} />
        </View>

        <View style={styles.stat}>
          <Text variant="bodyStrong">{streak}</Text>
          <Ionicons name="flame" size={16} color={Palette.streak} />
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
  right: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg },
  pro: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  proBadge: {
    backgroundColor: Palette.purple,
    borderRadius: Radius.sm,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 5 },
});
