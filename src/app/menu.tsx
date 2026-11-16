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
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

import { Mascot } from '@/components/ui/Mascot';
import { Tappable } from '@/components/ui/Tappable';
import { Text } from '@/components/ui/Text';
import { Palette, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth';
import { useI18n } from '@/lib/i18n';
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
  const { session, profile, isGuest } = useAuth();
  const { t } = useI18n();
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
    // On referme le menu en douceur, puis on ouvre le vrai écran Paramètres.
    dismissThen(() => {
      if (router.canGoBack()) router.back();
      router.push('/settings');
    });
  };

  // On signale à l'accueil (déjà monté dessous) quoi afficher, PUIS on referme simplement le menu.
  // On ne renavigue pas vers /(tabs) : cela reconstruisait l'accueil et perdait la discussion chargée.
  const onNewChat = () => {
    startNewChat();
    close();
  };

  const onOpenConversation = (id: string) => {
    openConversation(id);
    close();
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
          {t('menu.previous')}
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
          // Rien pendant le (très bref) chargement : le cache est préchargé dès la connexion,
          // donc la liste est déjà prête à la 1re ouverture. Aucun squelette, aucun flash.
          null
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
            {t('menu.newChat')}
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

// Largeur du bouton « Supprimer » révélé.
const ACTION_W = 96;

function ConversationRow({
  label,
  onOpen,
  onDelete,
}: {
  label: string;
  onOpen: () => void;
  onDelete: () => void;
}) {
  // Glissement maison, 100 % maîtrisé : la ligne ne bouge QUE sur un geste horizontal franc
  // et CÈDE au scroll vertical. Résultat : au simple toucher ou défilement, le rouge n'apparaît
  // jamais — il n'apparaît que lorsque l'utilisateur balaie réellement la discussion.
  const tx = useSharedValue(0);
  const startX = useSharedValue(0);
  const openRef = useRef(false);

  const markOpen = (v: boolean) => {
    openRef.current = v;
  };

  const pan = Gesture.Pan()
    // Il faut ≥ 14 px horizontaux pour que le geste démarre…
    .activeOffsetX([-14, 14])
    // …et au moindre mouvement vertical (≥ 8 px), le geste échoue et laisse le scroll gagner.
    .failOffsetY([-8, 8])
    .onStart(() => {
      startX.value = tx.value;
    })
    .onUpdate((e) => {
      const next = startX.value + e.translationX;
      // On n'autorise que le glissement vers la gauche, borné à la largeur du bouton.
      tx.value = next < -ACTION_W ? -ACTION_W : next > 0 ? 0 : next;
    })
    .onEnd(() => {
      const shouldOpen = tx.value < -ACTION_W * 0.5;
      tx.value = withTiming(shouldOpen ? -ACTION_W : 0, { duration: 180 });
      runOnJS(markOpen)(shouldOpen);
    });

  const frontStyle = useAnimatedStyle(() => ({ transform: [{ translateX: tx.value }] }));

  const handlePress = () => {
    // Si le bouton est déjà révélé, un tap le referme au lieu d'ouvrir la discussion.
    if (openRef.current) {
      tx.value = withTiming(0, { duration: 160 });
      openRef.current = false;
      return;
    }
    onOpen();
  };

  const handleDelete = () => {
    tx.value = withTiming(0, { duration: 120 });
    openRef.current = false;
    onDelete();
  };

  return (
    <View style={styles.swipeWrap}>
      {/* Bouton Supprimer placé DERRIÈRE la ligne, à droite : invisible tant que la ligne le couvre. */}
      <Pressable style={styles.swipeDelete} onPress={handleDelete}>
        <Ionicons name="trash-outline" size={20} color="#fff" />
        <Text variant="caption" color="#fff" style={{ marginTop: 2 }}>
          Supprimer
        </Text>
      </Pressable>
      <GestureDetector gesture={pan}>
        <Reanimated.View style={[styles.swipeFront, frontStyle]}>
          <Tappable style={styles.convRow} onPress={handlePress} haptic={false}>
            <Ionicons name="chatbox-outline" size={22} color={Palette.purple} />
            <Text variant="bodyStrong" style={styles.convLabel} numberOfLines={1}>
              {label}
            </Text>
          </Tappable>
        </Reanimated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  // Conteneur : le bouton Supprimer est posé derrière (absolu), la ligne glisse par-dessus.
  swipeWrap: { width: '100%', justifyContent: 'center', overflow: 'hidden' },
  swipeFront: { width: '100%', backgroundColor: Palette.background },
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
    position: 'absolute',
    right: 0,
    top: 4,
    bottom: 4,
    width: ACTION_W,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.danger,
    borderRadius: Radius.md,
  },
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
