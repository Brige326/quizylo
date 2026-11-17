import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { type ComponentRef, useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  FlatList,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Reanimated, { useAnimatedStyle } from 'react-native-reanimated';
import { useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Mascot } from '@/components/ui/Mascot';
import { Tappable } from '@/components/ui/Tappable';
import { Text } from '@/components/ui/Text';
import { Screen } from '@/components/ui/Screen';
import { TopBar } from '@/components/TopBar';
import { Palette, Radius, Spacing, Type } from '@/constants/theme';
import { useAuth } from '@/contexts/auth';
import { comingSoon } from '@/lib/ui';
import { getTabBarHeight, subscribeTabBarHeight } from '@/lib/layoutStore';
import { setCachedConversations, subscribeChatNav } from '@/lib/chatNav';
import { supabase } from '@/lib/supabase';
import { useI18n } from '@/lib/i18n';

type ChatMessage = { id: string; role: 'user' | 'assistant'; content: string };
type Chip = { key: string; label: string; icon: keyof typeof Ionicons.glyphMap; color: string };

const ACTIONS: Chip[] = [
  { key: 'resoudre', label: 'Résoudre', icon: 'camera', color: Palette.info },
  { key: 'quiz', label: 'Quiz', icon: 'help-circle', color: '#FF4D8D' },
  { key: 'examen', label: 'Examen blanc', icon: 'document-text', color: '#5B8CFF' },
  { key: 'resume', label: 'Résumer', icon: 'reader', color: Palette.primary },
  { key: 'redaction', label: 'Rédaction', icon: 'create', color: Palette.purple },
  { key: 'rechercher', label: 'Rechercher', icon: 'search', color: '#2DD4BF' },
  { key: 'aide', label: 'Aide-mémoire', icon: 'albums', color: Palette.streak },
  { key: 'prepa', label: 'Préparer un exam', icon: 'clipboard', color: '#5B8CFF' },
  { key: 'tableau', label: 'Tableau', icon: 'grid', color: '#2DD4BF' },
  { key: 'vocab', label: 'Vocabulaire', icon: 'language', color: '#F5B301' },
  { key: 'image', label: 'Créer une image', icon: 'image', color: '#A855F7' },
];

// Matières rapides sous le hero (comme sur la maquette) ; la liste complète
// s'ouvre via « Voir tous les sujets ».
const QUICK_SUBJECTS: Chip[] = [
  { key: 'informatique', label: 'Informatique', icon: 'laptop', color: '#5B8CFF' },
  { key: 'mathematiques', label: 'Mathématiques', icon: 'calculator', color: Palette.primary },
  { key: 'medecine', label: 'Médecine', icon: 'medkit', color: '#FF4D8D' },
  { key: 'physique', label: 'Physique', icon: 'planet', color: '#F5B301' },
  { key: 'biologie', label: 'Biologie', icon: 'leaf', color: '#2DD4BF' },
];

export default function AccueilScreen() {
  const { profile, session, exitGuest } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const userId = session?.user?.id;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [focused, setFocused] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const inputRef = useRef<ComponentRef<typeof TextInput>>(null);
  const listRef = useRef<FlatList<ChatMessage>>(null);
  // Vrai si l'utilisateur est déjà en bas de la conversation : on ne recale en bas que dans ce cas,
  // pour ne jamais interrompre la lecture d'anciens messages (fin du « balayage » au scroll).
  const atBottomRef = useRef(true);
  const chatOpacity = useRef(new Animated.Value(0)).current;
  const heroOpacity = useRef(new Animated.Value(1)).current;
  const chipsOpacity = useRef(new Animated.Value(1)).current;

  // Suivi NATIF du clavier, image par image, sur le thread UI (react-native-keyboard-controller).
  // height.value va de 0 (fermé) à -hauteurClavier (ouvert) et suit exactement le doigt/clavier.
  const { height: kbHeight } = useReanimatedKeyboardAnimation();
  const [tabH, setTabH] = useState(getTabBarHeight());
  useEffect(() => subscribeTabBarHeight(setTabH), []);

  // Préchargement silencieux des discussions dès la connexion : le cache est prêt AVANT
  // que l'utilisateur n'ouvre le menu la première fois → aucun squelette, aucun flash.
  useEffect(() => {
    if (!userId) return;
    let active = true;
    supabase
      .from('conversations')
      .select('id, title')
      .order('updated_at', { ascending: false })
      .limit(30)
      .then(({ data }) => {
        if (active && data) setCachedConversations(data as { id: string; title: string }[]);
      });
    return () => {
      active = false;
    };
  }, [userId]);

  // On remonte la barre de (hauteur clavier − hauteur réelle de la TabBar), pile collée au clavier.
  const kavAnimatedStyle = useAnimatedStyle(() => ({
    paddingBottom: Math.max(0, -kbHeight.value - tabH),
  }));

  const hasChat = messages.length > 0;
  const hasText = input.trim().length > 0;

  // Fondu discret du texte du hero au focus — la mascotte, elle, ne bouge jamais (bloc toujours monté).
  useEffect(() => {
    Animated.timing(heroOpacity, {
      toValue: focused ? 0 : 1,
      duration: 160,
      useNativeDriver: true,
    }).start();
  }, [focused, heroOpacity]);

  // Fondu discret des onglets dès qu'on écrit — leur espace reste réservé, donc la barre ne saute pas.
  useEffect(() => {
    Animated.timing(chipsOpacity, {
      toValue: hasText ? 0 : 1,
      duration: 160,
      useNativeDriver: true,
    }).start();
  }, [hasText, chipsOpacity]);

  // Nouveau chat : on revient à l'accueil vierge, exactement comme au tout début.
  const resetChat = useCallback(() => {
    atBottomRef.current = true;
    setMessages([]);
    setConversationId(null);
    setInput('');
    setFocused(false);
    chatOpacity.setValue(0);
  }, [chatOpacity]);

  // Ouvrir une discussion précédente : on recharge SES messages, à l'identique.
  const loadConversation = useCallback(
    async (id: string) => {
      if (!userId) return;
      atBottomRef.current = true;
      setInput('');
      setFocused(false);
      const { data } = await supabase
        .from('messages')
        .select('id, role, content')
        .eq('conversation_id', id)
        .order('created_at', { ascending: true });
      if (!data) return;
      setConversationId(id);
      setMessages(
        data
          .filter((m) => m.role === 'user' || m.role === 'assistant')
          .map((m) => ({ id: m.id, role: m.role as 'user' | 'assistant', content: m.content })),
      );
    },
    [userId],
  );

  // Référence vivante de la discussion ouverte (pour réagir à une suppression sans se réabonner).
  const convIdRef = useRef<string | null>(null);
  useEffect(() => {
    convIdRef.current = conversationId;
  }, [conversationId]);

  // Canal direct depuis le menu : « Nouveau chat » → accueil vierge ; une discussion → on la rouvre ;
  // une discussion supprimée alors qu'elle est ouverte → on revient à l'accueil vierge.
  useEffect(
    () =>
      subscribeChatNav((a) => {
        if (a.type === 'new') {
          resetChat();
          if (a.seed) {
            // Tuteur IA depuis un chapitre : on pré-remplit la barre, l'utilisateur relit puis envoie.
            setInput(a.seed);
            setFocused(true);
          }
        } else if (a.type === 'open') loadConversation(a.id);
        else if (a.type === 'deleted' && convIdRef.current === a.id) resetChat();
      }),
    [resetChat, loadConversation],
  );

  useEffect(() => {
    if (hasChat) {
      Animated.timing(chatOpacity, { toValue: 1, duration: 260, useNativeDriver: true }).start();
    }
  }, [hasChat, chatOpacity]);

  const scrollToEnd = () =>
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));

  const ensureConversation = async (firstText: string): Promise<string | null> => {
    if (conversationId) return conversationId;
    if (!userId) return null;
    const title = firstText.slice(0, 48) + (firstText.length > 48 ? '…' : '');
    const { data } = await supabase
      .from('conversations')
      .insert({ user_id: userId, title })
      .select('id')
      .single();
    const id = data?.id ?? null;
    if (id) setConversationId(id);
    return id;
  };

  const promptSignIn = () =>
    Alert.alert('Crée un compte', 'Connecte-toi pour discuter avec Quizylo et sauvegarder tes échanges.', [
      { text: 'Plus tard', style: 'cancel' },
      {
        text: 'Se connecter',
        onPress: () => {
          exitGuest();
          router.replace('/(auth)/login');
        },
      },
    ]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    if (!userId) {
      promptSignIn();
      return;
    }
    setInput('');
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', content: text };
    setMessages((m) => [...m, userMsg]);
    scrollToEnd();

    const convId = await ensureConversation(text);
    if (convId) {
      // IMPORTANT : await — une requête Supabase ne part QUE si on l'attend (sinon rien n'est enregistré).
      await supabase
        .from('messages')
        .insert({ conversation_id: convId, user_id: userId, role: 'user', content: text });
    }

    setSending(true);
    try {
      const history = [...messages, userMsg]
        .slice(-20)
        .map((m) => ({ role: m.role, content: m.content }));
      const { data, error } = await supabase.functions.invoke('chat', { body: { messages: history } });
      const reply =
        error || !data?.reply
          ? "Je n'ai pas pu répondre pour le moment. Réessaie dans un instant."
          : String(data.reply);
      const bot: ChatMessage = { id: `a-${Date.now()}`, role: 'assistant', content: reply };
      setMessages((m) => [...m, bot]);
      scrollToEnd();
      if (convId) {
        // await obligatoire : la réponse de l'IA est enregistrée ; le déclencheur met à jour updated_at.
        await supabase.from('messages').insert({
          conversation_id: convId,
          user_id: userId,
          role: 'assistant',
          content: reply,
        });
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <Screen>
      <TopBar xp={profile?.xp ?? 0} streak={profile?.streak_days ?? 0} />

      <Reanimated.View style={[styles.kav, kavAnimatedStyle]}>
        {hasChat ? (
          <Animated.View style={[styles.flex, { opacity: chatOpacity }]}>
            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={(m) => m.id}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => <Bubble message={item} />}
              onScroll={(e) => {
                const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
                atBottomRef.current =
                  contentSize.height - layoutMeasurement.height - contentOffset.y < 80;
              }}
              scrollEventThrottle={16}
              onContentSizeChange={() => {
                if (atBottomRef.current) scrollToEnd();
              }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}
            />
          </Animated.View>
        ) : (
          <Pressable style={styles.welcome} onPress={() => Keyboard.dismiss()}>
            <Mascot size={76} />
            <Animated.View style={[styles.heroCard, { opacity: heroOpacity }]} pointerEvents="none">
              <Text variant="title" center style={styles.heroTitle}>
                {t('home.hero')}
              </Text>
            </Animated.View>

            <Animated.View
              style={[styles.subjectZone, { opacity: heroOpacity }]}
              pointerEvents={focused ? 'none' : 'auto'}>
              <View style={styles.subjectChips}>
                {QUICK_SUBJECTS.map((s) => (
                  <Tappable
                    key={s.key}
                    style={styles.subjectChip}
                    onPress={() => comingSoon(s.label)}>
                    <Ionicons name={s.icon} size={15} color={s.color} />
                    <Text variant="small">{s.label}</Text>
                  </Tappable>
                ))}
              </View>
              <Tappable
                style={styles.seeAll}
                onPress={() => comingSoon('Voir tous les sujets')}>
                <Text variant="small" color={Palette.primary}>
                  Voir tous les sujets
                </Text>
                <Ionicons name="arrow-forward" size={14} color={Palette.primary} />
              </Tappable>
            </Animated.View>
          </Pressable>
        )}

        {sending ? (
          <View style={styles.typing}>
            <Text variant="small" color={Palette.textSecondary}>
              Quizylo réfléchit…
            </Text>
          </View>
        ) : null}

        {/* Onglets d'actions — toujours montés (espace réservé), fondu discret dès qu'on écrit */}
        {!hasChat ? (
          <Animated.View
            style={{ opacity: chipsOpacity }}
            pointerEvents={hasText ? 'none' : 'auto'}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              style={styles.chipsScroll}
              contentContainerStyle={styles.chips}>
              {ACTIONS.map((a) => (
                <Tappable key={a.key} style={styles.chip} onPress={() => comingSoon(a.label)}>
                  <Ionicons name={a.icon} size={16} color={a.color} />
                  <Text variant="small">{a.label}</Text>
                </Tappable>
              ))}
            </ScrollView>
          </Animated.View>
        ) : null}

        {/* Barre d'écriture */}
        <View style={[styles.inputRow, { paddingBottom: focused ? Spacing.sm : Spacing.md }]}>
          <Tappable
            style={styles.plus}
            onPress={() => comingSoon('Pièce jointe')}
            scaleTo={0.9}
            accessibilityLabel="Ajouter">
            <Ionicons name="add" size={24} color={Palette.text} />
          </Tappable>

          <View style={styles.inputField}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder={t('home.placeholder')}
              placeholderTextColor={Palette.textMuted}
              value={input}
              onChangeText={setInput}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onSubmitEditing={send}
              returnKeyType="send"
              multiline
            />
            {hasText ? (
              <Tappable onPress={send} scaleTo={0.9} accessibilityLabel="Envoyer">
                <View style={styles.sendBtn}>
                  <Ionicons name="arrow-up" size={18} color="#fff" />
                </View>
              </Tappable>
            ) : (
              <View style={styles.rightIcons}>
                <Tappable
                  onPress={() => comingSoon('Appareil photo')}
                  scaleTo={0.9}
                  accessibilityLabel="Photo">
                  <Ionicons name="camera-outline" size={22} color={Palette.textSecondary} />
                </Tappable>
                <Tappable
                  onPress={() => inputRef.current?.focus()}
                  scaleTo={0.9}
                  accessibilityLabel="Dicter">
                  <Ionicons name="mic-outline" size={22} color={Palette.textSecondary} />
                </Tappable>
              </View>
            )}
          </View>
        </View>
      </Reanimated.View>
    </Screen>
  );
}

function Bubble({ message }: { message: ChatMessage }) {
  if (message.role === 'user') {
    return (
      <View style={styles.userRow}>
        <View style={styles.userBubble}>
          <Text style={[Type.body, { color: Palette.text }]}>{message.content}</Text>
        </View>
      </View>
    );
  }
  return (
    <View style={styles.botBlock}>
      <View style={styles.botAvatar}>
        <Mascot size={18} />
      </View>
      <Text style={[Type.body, { color: Palette.text, marginTop: Spacing.xs }]}>
        {message.content}
      </Text>
      <View style={styles.reactions}>
        <Ionicons name="copy-outline" size={16} color={Palette.textMuted} />
        <Ionicons name="thumbs-up-outline" size={16} color={Palette.textMuted} />
        <Ionicons name="thumbs-down-outline" size={16} color={Palette.textMuted} />
        <Ionicons name="ellipsis-horizontal" size={16} color={Palette.textMuted} />
      </View>
      <Text variant="caption" color={Palette.textMuted}>
        Quizylo génère des réponses grâce à l&apos;IA
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  kav: { flex: 1 },
  flex: { flex: 1 },
  welcome: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  heroZone: { alignItems: 'center', gap: Spacing.md },
  heroCard: {
    backgroundColor: Palette.surfaceElevated,
    borderRadius: Radius.xl,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
  },
  heroTitle: { fontSize: 22, lineHeight: 28 },
  subjectZone: { alignItems: 'center', gap: Spacing.md },
  subjectChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  subjects: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  subjectChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Palette.surface,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: 9,
  },
  seeAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Palette.surface,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
    gap: Spacing.lg,
  },
  userRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  userBubble: {
    maxWidth: '82%',
    backgroundColor: Palette.surfaceElevated,
    borderRadius: Radius.lg,
    borderBottomRightRadius: 6,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  botBlock: { alignItems: 'flex-start', gap: 4 },
  botAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Palette.purpleSurface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  reactions: { flexDirection: 'row', gap: Spacing.lg, marginTop: Spacing.xs },
  typing: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm },
  chipsScroll: { flexGrow: 0, flexShrink: 0, height: 52, marginBottom: Spacing.sm },
  chips: { paddingHorizontal: Spacing.lg, gap: Spacing.sm, alignItems: 'center' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
  },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.md },
  plus: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Palette.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: 50,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 6,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: Radius.pill,
  },
  input: { flex: 1, color: Palette.text, ...Type.body, maxHeight: 120, paddingTop: 0, paddingBottom: 0 },
  rightIcons: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Palette.info,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
