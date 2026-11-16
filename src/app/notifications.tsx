import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Screen } from '@/components/ui/Screen';
import { Tappable } from '@/components/ui/Tappable';
import { Text } from '@/components/ui/Text';
import { Palette, Radius, Spacing } from '@/constants/theme';
import { useI18n } from '@/lib/i18n';

const KEY = 'quizylo.notif';
const ITEMS = [
  { id: 'reminders', label: 'Rappels de révision', desc: 'Des rappels pour garder ton rythme.' },
  { id: 'news', label: 'Nouveautés et conseils', desc: 'Astuces et nouvelles fonctionnalités.' },
  { id: 'summaries', label: 'Résumés hebdomadaires', desc: 'Un récap de ta semaine de révisions.' },
];

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const [state, setState] = useState<Record<string, boolean>>({
    reminders: true,
    news: true,
    summaries: false,
  });

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((v) => {
      if (v) {
        try {
          setState((s) => ({ ...s, ...JSON.parse(v) }));
        } catch {}
      }
    });
  }, []);

  const toggle = (id: string, value: boolean) => {
    const next = { ...state, [id]: value };
    setState(next);
    AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
  };

  const back = () => (router.canGoBack() ? router.back() : router.replace('/settings'));

  return (
    <Screen>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.xs }]}>
        <Tappable onPress={back} hitSlop={12} scaleTo={0.9} accessibilityLabel="Retour">
          <Ionicons name="chevron-back" size={26} color={Palette.text} />
        </Tappable>
        <Text variant="heading">{t('settings.notifications')}</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: Spacing.lg, paddingBottom: insets.bottom + Spacing.xl }}>
        <View style={styles.card}>
          {ITEMS.map((it, i) => (
            <View key={it.id} style={[styles.row, i < ITEMS.length - 1 && styles.rowBorder]}>
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong">{it.label}</Text>
                <Text variant="small" color={Palette.textSecondary}>
                  {it.desc}
                </Text>
              </View>
              <Switch
                value={state[it.id]}
                onValueChange={(v) => toggle(it.id, v)}
                trackColor={{ false: Palette.surfaceSelected, true: Palette.primary }}
                thumbColor="#fff"
              />
            </View>
          ))}
        </View>
        <Text variant="caption" color={Palette.textMuted} style={{ marginTop: Spacing.lg }}>
          L'envoi réel des notifications sera activé prochainement. Tes préférences sont déjà
          enregistrées.
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  card: { backgroundColor: Palette.surface, borderRadius: Radius.lg, paddingHorizontal: Spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md + 2 },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Palette.border },
});
