import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

import { Mascot } from '@/components/ui/Mascot';
import { Tappable } from '@/components/ui/Tappable';
import { Text } from '@/components/ui/Text';
import { Palette, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth';
import {
  getCachedConversations,
  notifyConversationDeleted,
  openConversation,
  setCachedConversations,
  startNewChat,
} from '@/lib/chatNav';
import { supabase } from '@/lib/supabase';

type Conversation = { id: string; title: string };

export default function MenuScreen() {
  const { session, profile, isGuest, signOut, exitGuest } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: screenW } = useWindowDimensions();
  // Largeur façon Claude/ChatGPT : un panneau net, pas toute la page.
  const panelW = Math.min(screenW * 0.8, 340);

  // Ouverture pro : le panneau glisse depuis la gauche, le fond s'assombrit en fondu.
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [anim]);

  // Ferme en rejouant l'animation à l'envers, puis exécute l'action (retour, nouvelle discussion…).
  const dismissThen = (action: () => void) => {
    Animated.timing(anim, {
      toValue: 0,
      duration: 180,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => action());
  };

  const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [-panelW, 0] });
  const backdropOpacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.55] });

  const [showWidget, setShowWidget] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>(
    () => getCachedConversations() as Conversation[],
  );
  const [loading, setLoading] = useState(getCachedConversations().length === 0);

  const userId = session?.user?.id;
  const email = session?.user?.email ?? '';
  const name = isGuest ? 'Invité' : profile?.full_name || 'Mon compte';
  const handle = isGuest
    ? '@invité'
    : '@' + (profile?.username || email.split('@')[0] || 'moi');

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
      .limit(30)
      .then(({ data }) => {
        if (!active) return;
        if (data) {
          setConversations(data as Conversation[]);
          setCachedConversations(data as Conversation[]);
        }
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [userId]);

  // Fermeture sûre du menu : animation inverse puis retour (seulement s'il y a un écran derrière).
  const close = () => dismissThen(() => router.canGoBack() && router.back());

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
    // Accueil vierge ; on signale, on referme en douceur, puis on atterrit sur l'Accueil.
    startNewChat();
    dismissThen(() => router.navigate('/(tabs)'));
  };

  const onOpenConversation = (id: string) => {
    // Rouvre la discussion à l'identique ; on signale, on referme, puis on atterrit sur l'Accueil.
    openConversation(id);
    dismissThen(() => router.navigate('/(tabs)'));
  };

  const onDeleteConversation = (id: string, title: string) => {
    Alert.alert(
      'Supprimer la discussion',
      `« ${title || 'Discussion'} » sera définitivement supprimée.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            setConversations((prev) => prev.filter((c) => c.id !== id)); // retrait immédiat
            notifyConversationDeleted(id); // l'accueil se remet à zéro si elle était ouverte
            await supabase.from('messages').delete().eq('conversation_id', id);
            await supabase.from('conversations').delete().eq('id', id);
          },
        },
      ],
    );
  };

  return (
    <View style={styles.root}>
      <AnimatedPressable
        style={[styles.overlay, { opacity: backdropOpacity }]}
        onPress={close}
        accessibilityLabel="Fermer le menu"
      />
      <Animated.View
        style={[
          styles.panel,
          { width: panelW, paddingTop: insets.top + Spacing.sm, transform: [{ translateX }] },
        ]}>
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
        {conversations.length > 0 ? (
          conversations.map((c) => (
            <ConversationRow
              key={c.id}
              label={c.title || 'Discussion'}
              onOpen={() => onOpenConversation(c.id)}
              onDelete={() => onDeleteConversation(c.id, c.title)}
            />
          ))
        ) : loading ? (
          <View>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </View>
        ) : (
          <Text variant="body" color={Palette.textMuted} style={{ paddingVertical: Spacing.sm }}>
            {isGuest
              ? 'Connecte-toi pour retrouver tes discussions.'
              : 'Tes discussions apparaîtront ici.'}
          </Text>
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

      </Animated.View>
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

function SkeletonRow() {
  return (
    <View style={styles.skelRow}>
      <View style={styles.skelDot} />
      <View style={styles.skelBar} />
    </View>
  );
}

function ConversationRow({
  label,
  onOpen,
  onDelete,
}: {
  label: string;
  onOpen: () => void;
  onDelete: () => void;
}) {
  // Glisser vers la gauche révèle « Supprimer » (comme Mail / ChatGPT).
  const renderRightActions = () => (
    <Pressable style={styles.swipeDelete} onPress={onDelete}>
      <Ionicons name="trash-outline" size={20} color="#fff" />
      <Text variant="caption" color="#fff" style={{ marginTop: 2 }}>
        Supprimer
      </Text>
    </Pressable>
  );
  return (
    <Swipeable
      renderRightActions={renderRightActions}
      overshootRight={false}
      friction={2}
      containerStyle={styles.swipeContainer}
      childrenContainerStyle={styles.swipeChild}>
      <Tappable style={styles.convRow} onPress={onOpen} haptic={false}>
        <Ionicons name="chatbox-outline" size={22} color={Palette.purple} />
        <Text variant="bodyStrong" style={styles.convLabel} numberOfLines={1}>
          {label}
        </Text>
      </Tappable>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  swipeContainer: { width: '100%' },
  swipeChild: { width: '100%' },
  convRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Palette.background,
  },
  convLabel: { flex: 1 },
  swipeDelete: {
    width: 88,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.danger,
    borderRadius: Radius.md,
    marginVertical: 4,
  },
  skelRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md },
  skelDot: { width: 22, height: 22, borderRadius: 11, backgroundColor: Palette.surface },
  skelBar: { flex: 1, height: 14, borderRadius: 7, backgroundColor: Palette.surface, maxWidth: '70%' },
  root: { flex: 1 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#000' },
  panel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: Palette.background,
    paddingHorizontal: Spacing.lg,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: Palette.border,
  },
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
