import { Feather, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { Keyboard, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Palette, Spacing } from '@/constants/theme';

/** Sous-ensemble des props passées par le `tabBar` d'expo-router que l'on utilise. */
type TabBarProps = {
  state: { index: number; routes: { key: string; name: string }[] };
  navigateToTab: (routeKey: string) => void;
};

type IconRenderer = (color: string, size: number) => React.ReactNode;

const ICONS: Record<string, { icon: IconRenderer; center?: boolean }> = {
  index: {
    icon: (c, s) => <Ionicons name="chatbubble-ellipses-outline" size={s} color={c} />,
  },
  dossiers: {
    icon: (c, s) => <Ionicons name="folder-outline" size={s} color={c} />,
  },
  parcours: {
    icon: (c, s) => <Feather name="target" size={s} color={c} />,
    center: true,
  },
  recherche: {
    icon: (c, s) => <Ionicons name="search-outline" size={s} color={c} />,
  },
  classement: {
    icon: (c, s) => <Ionicons name="trophy-outline" size={s} color={c} />,
  },
};

export function TabBar({ state, navigateToTab }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const [keyboardShown, setKeyboardShown] = useState(false);

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const s = Keyboard.addListener(showEvt, () => setKeyboardShown(true));
    const h = Keyboard.addListener(hideEvt, () => setKeyboardShown(false));
    return () => {
      s.remove();
      h.remove();
    };
  }, []);

  // Comme ChatGPT/Claude : la barre du bas disparaît pendant la saisie pour coller la barre d'écriture au clavier.
  if (keyboardShown) return null;

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, Spacing.sm) }]}>
      {state.routes.map((route, index) => {
        const config = ICONS[route.name];
        if (!config) return null;
        const focused = state.index === index;
        const color = focused ? Palette.text : Palette.textMuted;

        const onPress = () => {
          if (!focused) {
            Haptics.selectionAsync().catch(() => {});
            navigateToTab(route.key);
          }
        };

        if (config.center) {
          return (
            <Pressable key={route.key} style={styles.item} onPress={onPress} hitSlop={8}>
              <View style={[styles.centerButton, focused && styles.centerButtonActive]}>
                {config.icon(focused ? Palette.onPrimary : Palette.text, 28)}
              </View>
            </Pressable>
          );
        }

        return (
          <Pressable key={route.key} style={styles.item} onPress={onPress} hitSlop={8}>
            {config.icon(color, 28)}
            {focused ? <View style={styles.dot} /> : <View style={styles.dotPlaceholder} />}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: Palette.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Palette.border,
    paddingTop: Spacing.md,
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 44 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Palette.primary },
  dotPlaceholder: { width: 6, height: 6 },
  centerButton: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: Palette.surfaceElevated,
    borderWidth: 1,
    borderColor: Palette.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -10,
  },
  centerButtonActive: { backgroundColor: Palette.primary, borderColor: Palette.primary },
});
