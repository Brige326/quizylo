import { useRouter } from 'expo-router';
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

/** Icône menu « artistique » : trois barres arrondies, largeurs inégales et décalées. */
function MenuGlyph() {
  return (
    <View style={styles.menu}>
      <View style={[styles.menuBar, { width: 30 }]} />
      <View style={[styles.menuBar, { width: 15, marginLeft: 6 }]} />
      <View style={[styles.menuBar, { width: 24, marginLeft: 2 }]} />
    </View>
  );
}

export function TopBar({ onMenu, onPro }: TopBarProps) {
  const router = useRouter();
  return (
    <View style={styles.row}>
      <Tappable
        onPress={onMenu ?? (() => router.push('/menu'))}
        hitSlop={12}
        accessibilityLabel="Menu"
        scaleTo={0.88}>
        <MenuGlyph />
      </Tappable>

      <Tappable
        onPress={onPro ?? (() => router.push('/pro'))}
        style={styles.pro}
        scaleTo={0.94}
        accessibilityLabel="Obtenir PRO">
        <View style={styles.proInner}>
          <Text style={styles.obtenir}>Obtenir</Text>
          <View style={styles.proBadge}>
            <Text style={styles.proText}>PRO</Text>
          </View>
        </View>
      </Tappable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
  },
  // Menu
  menu: { gap: 6, paddingVertical: 2 },
  menuBar: {
    height: 3,
    borderRadius: 2,
    backgroundColor: Palette.text,
  },
  // Obtenir PRO
  pro: {
    paddingVertical: 6,
    paddingLeft: 4,
  },
  proInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    transform: [{ skewX: '-9deg' }],
  },
  obtenir: {
    color: Palette.purple,
    fontSize: 17,
    fontFamily: 'Fredoka_600SemiBold',
  },
  proBadge: {
    backgroundColor: Palette.purple,
    borderRadius: Radius.pill,
    paddingHorizontal: 11,
    paddingVertical: 3,
  },
  proText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Fredoka_600SemiBold',
    letterSpacing: 1.5,
  },
});
