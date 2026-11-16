import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Mascot } from '@/components/ui/Mascot';
import { Screen } from '@/components/ui/Screen';
import { Tappable } from '@/components/ui/Tappable';
import { Text } from '@/components/ui/Text';
import { Palette, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth';
import {
  getCachedConversations,
  notifyConversationDeleted,
  setCachedConversations,
  type ConversationLite,
} from '@/lib/chatNav';
import { useI18n } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';

export default function SelectDeleteScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const userId = session?.user?.id;

  const cached = getCachedConversations();
  const [conversations, setConversations] = useState<ConversationLite[]>(cached);
  const [loading, setLoading] = useState(cached.length === 0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  // Garde une réf stable du set pour éviter les fermetures périmées dans les callbacks.
  const selectedRef = useRef(selected);
  selectedRef.current = selected;

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    let active = true;
    supabase
      .from('conversations')
      .select('id, title')
      .order('updated_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (!active) return;
        if (data) {
          const list = data as ConversationLite[];
          setConversations(list);
          setCachedConversations(list);
          // On nettoie la sélection des ids disparus entre-temps.
          setSelected((prev) => {
            const next = new Set<string>();
            list.forEach((c) => {
              if (prev.has(c.id)) next.add(c.id);
            });
            return next;
          });
        }
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [userId]);

  const back = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/settings');
  };

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allSelected = conversations.length > 0 && selected.size === conversations.length;

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(conversations.map((c) => c.id)));
  };

  const count = selected.size;

  const confirmDelete = () => {
    if (count === 0 || deleting) return;
    Alert.alert(t('selectDelete.title'), t('selectDelete.confirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: runDelete,
      },
    ]);
  };

  const runDelete = async () => {
    const ids = Array.from(selectedRef.current);
    if (ids.length === 0 || !userId) return;
    setDeleting(true);

    // Retrait optimiste immédiat + avertir l'accueil (il se remet à zéro si une discussion ouverte disparaît).
    const remaining = conversations.filter((c) => !selectedRef.current.has(c.id));
    setConversations(remaining);
    setCachedConversations(remaining);
    ids.forEach((id) => notifyConversationDeleted(id));
    setSelected(new Set());

    await supabase.from('messages').delete().in('conversation_id', ids);
    await supabase.from('conversations').delete().eq('user_id', userId).in('id', ids);

    setDeleting(false);
    Alert.alert(t('selectDelete.done'));
  };

  return (
    <Screen>
      {/* En-tête */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.xs }]}>
        <Tappable onPress={back} hitSlop={12} scaleTo={0.9} accessibilityLabel="Retour">
          <Ionicons name="chevron-back" size={26} color={Palette.text} />
        </Tappable>
        <Text variant="heading">{t('selectDelete.title')}</Text>
        <View style={{ width: 26 }} />
      </View>

      {conversations.length > 0 ? (
        <View style={styles.toolbar}>
          <Text variant="small" color={Palette.textSecondary}>
            {count > 0 ? `${count} ${t('selectDelete.selected')}` : t('selectDelete.hint')}
          </Text>
          <Tappable onPress={toggleAll} hitSlop={8} haptic={false}>
            <Text variant="small" color={Palette.primary}>
              {allSelected ? t('selectDelete.deselectAll') : t('selectDelete.selectAll')}
            </Text>
          </Tappable>
        </View>
      ) : null}

      {loading && conversations.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color={Palette.primary} />
        </View>
      ) : conversations.length === 0 ? (
        <View style={styles.center}>
          <Mascot size={64} />
          <Text variant="body" color={Palette.textSecondary} center style={{ marginTop: Spacing.md }}>
            {t('selectDelete.empty')}
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: Spacing.lg,
            paddingBottom: insets.bottom + 96,
          }}>
          <View style={styles.card}>
            {conversations.map((c, i) => {
              const isSel = selected.has(c.id);
              return (
                <Tappable
                  key={c.id}
                  style={[styles.row, i === conversations.length - 1 && styles.rowLast]}
                  onPress={() => toggle(c.id)}
                  haptic={false}>
                  <View style={[styles.checkbox, isSel && styles.checkboxOn]}>
                    {isSel ? <Ionicons name="checkmark" size={16} color={Palette.onPrimary} /> : null}
                  </View>
                  <Text
                    variant="bodyStrong"
                    color={Palette.text}
                    numberOfLines={1}
                    style={{ flex: 1 }}>
                    {c.title || 'Discussion'}
                  </Text>
                </Tappable>
              );
            })}
          </View>
        </ScrollView>
      )}

      {/* Barre d'action fixe en bas */}
      {conversations.length > 0 ? (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + Spacing.md }]}>
          <Tappable
            style={[styles.deleteBtn, count === 0 && styles.deleteBtnDisabled]}
            onPress={confirmDelete}
            disabled={count === 0 || deleting}>
            {deleting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
                <Text variant="bodyStrong" color="#FFFFFF">
                  {t('selectDelete.delete')}
                  {count > 0 ? ` (${count})` : ''}
                </Text>
              </>
            )}
          </Tappable>
        </View>
      ) : null}
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
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg + Spacing.xs,
    paddingBottom: Spacing.sm,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  card: {
    backgroundColor: Palette.surface,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Palette.border,
  },
  rowLast: { borderBottomWidth: 0 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Palette.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primary,
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    backgroundColor: Palette.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Palette.border,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Palette.danger,
    borderRadius: Radius.pill,
    paddingVertical: Spacing.md + 2,
  },
  deleteBtnDisabled: { opacity: 0.4 },
});
