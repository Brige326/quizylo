import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Mascot } from '@/components/ui/Mascot';
import { Tappable } from '@/components/ui/Tappable';
import { Text } from '@/components/ui/Text';
import { Palette, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/lib/supabase';

type Conversation = { id: string; title: string };

export default function MenuScreen() {
  const { session, profile, isGuest, signOut, exitGuest } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [showWidget, setShowWidget] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);

  const userId = session?.user?.id;
  const email = session?.user?.email ?? '';
  const name = isGuest ? 'Invité' : profile?.full_name || 'Mon compte';
  const handle = isGuest
    ? '@invité'
    : '@' + (profile?.username || email.split('@')[0] || 'moi');

  useEffect(() => {
    if (!userId) return;
    let active = true;
    supabase
      .from('conversations')
      .select('id, title')
      .order('updated_at', { ascending: false })
      .limit(15)
      .then(({ data }) => {
        if (active && data) setConversations(data as Conversation[]);
      });
    return () => {
      active = false;
    };
  }, [userId]);

  const close = () => router.back();

  const onAccount = () => {
    if (isGuest) {
      exitGuest();
      router.replace('/(auth)/login');
      return;
    }
    Alert.alert('Compte', name, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Se déconnecter', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  const onNewChat = () => {
    // Ramène à l'espace conversation de l'accueil, vierge (comme écrire depuis l'accueil).
    router.navigate({ pathname: '/(tabs)', params: { reset: String(Date.now()) } });
  };

  return (
    <View style={styles.wrap}>
      <View style={[styles.panel, { paddingTop: insets.top + Spacing.sm }]}>
      {/* Profil */}
      <View style={styles.profileRow}>
        <View style={styles.avatar}>
          <Mascot size={30} />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="heading">{name}</Text>
          <Text variant="small" color={Palette.textSecondary}>
            {handle}
          </Text>
        </View>
        <Tappable onPress={onAccount} scaleTo={0.9} accessibilityLabel="Compte">
          <Ionicons name="settings-outline" size={24} color={Palette.text} />
        </Tappable>
      </View>

      <ScrollView style={styles.flex} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {showWidget ? (
          <View style={styles.widgetCard}>
            <View style={styles.widgetPreview}>
              <Ionicons name="chatbubble-ellipses" size={20} color={Palette.text} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong">Ajoute le widget</Text>
              <Text variant="small" color={Palette.textSecondary}>
                Ton raccourci le plus rapide vers des réponses.
              </Text>
            </View>
            <Pressable hitSlop={8} onPress={() => setShowWidget(false)}>
              <Ionicons name="close" size={20} color={Palette.textSecondary} />
            </Pressable>
          </View>
        ) : null}

        <MenuRow icon="easel-outline" label="Tableau blanc" onPress={() => notReady()} />
        <MenuRow icon="timer-outline" label="Focus ensemble" badge="NOUVEAU" onPress={() => notReady()} />

        <Text variant="heading" style={styles.sectionTitle}>
          Discussions précédentes
        </Text>
        {conversations.length === 0 ? (
          <Text variant="body" color={Palette.textMuted} style={{ paddingVertical: Spacing.sm }}>
            {isGuest
              ? 'Connecte-toi pour retrouver tes discussions.'
              : 'Tes discussions apparaîtront ici.'}
          </Text>
        ) : (
          conversations.map((c) => (
            <MenuRow
              key={c.id}
              icon="chatbox-outline"
              iconColor={Palette.purple}
              label={c.title}
              onPress={() =>
                router.navigate({ pathname: '/(tabs)', params: { conversationId: c.id } })
              }
            />
          ))
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Spacing.md) }]}>
        <Tappable style={styles.newChat} onPress={onNewChat}>
          <Ionicons name="chatbubble-ellipses-outline" size={20} color={Palette.background} />
          <Text variant="bodyStrong" color={Palette.background}>
            Nouveau chat
          </Text>
        </Tappable>
      </View>

      </View>
      <Pressable style={styles.overlay} onPress={close} accessibilityLabel="Fermer le menu" />
    </View>
  );

  function notReady() {
    Alert.alert('Bientôt disponible', 'Cette fonctionnalité arrive dans une prochaine étape.');
  }
}

function MenuRow({
  icon,
  label,
  badge,
  iconColor = Palette.text,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  badge?: string;
  iconColor?: string;
  onPress: () => void;
}) {
  return (
    <Tappable style={styles.row} onPress={onPress} haptic={false}>
      <Ionicons name={icon} size={22} color={iconColor} />
      <Text variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>
        {label}
      </Text>
      {badge ? (
        <View style={styles.badge}>
          <Text variant="caption" color={Palette.background}>
            {badge}
          </Text>
        </View>
      ) : null}
    </Tappable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  wrap: { flex: 1, flexDirection: 'row' },
  panel: {
    width: '86%',
    maxWidth: 420,
    backgroundColor: Palette.background,
    paddingHorizontal: Spacing.lg,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: Palette.border,
  },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingBottom: Spacing.lg },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Palette.purpleSurface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  content: { paddingBottom: Spacing.xl },
  widgetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: '#14213D',
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  widgetPreview: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Palette.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md },
  badge: { backgroundColor: '#fff', borderRadius: Radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  sectionTitle: { marginTop: Spacing.lg, marginBottom: Spacing.xs },
  footer: { paddingTop: Spacing.sm },
  newChat: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: '#F4F4F5',
    borderRadius: Radius.pill,
    paddingVertical: Spacing.lg,
  },
});
