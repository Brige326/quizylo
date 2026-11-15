import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { type ComponentRef, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Mascot } from '@/components/ui/Mascot';
import { Tappable } from '@/components/ui/Tappable';
import { Text } from '@/components/ui/Text';
import { Screen } from '@/components/ui/Screen';
import { TopBar } from '@/components/TopBar';
import { Palette, Radius, Spacing, Type } from '@/constants/theme';
import { useAuth } from '@/contexts/auth';
import { comingSoon } from '@/lib/ui';
import { supabase } from '@/lib/supabase';

type ChatMessage = { id: string; role: 'user' | 'assistant'; content: string };
type Action = { key: string; label: string; icon: keyof typeof Ionicons.glyphMap; color: string };

const ACTIONS: Action[] = [
  { key: 'resoudre', label: 'Résoudre', icon: 'camera', color: Palette.info },
  { key: 'quiz', label: 'Quiz', icon: 'help-circle', color: '#FF4D8D' },
  { key: 'examen', label: 'Examen blanc', icon: 'document-text', color: '#5B8CFF' },
  { key: 'resume', label: 'Résumer', icon: 'reader', color: Palette.primary },
  { key: 'redaction', label: 'Rédaction', icon: 'create', color: Palette.purple },
  { key: 'rechercher', label: 'Rechercher', icon: 'search', color: '#2DD4BF' },
  { key: 'aide', label: 'Aide-mémoire', icon: 'albums', color: Palette.streak },
  { key: 'vocab', label: 'Vocabulaire', icon: 'language', color: '#F5B301' },
  { key: 'image', label: 'Créer une image', icon: 'image', color: '#A855F7' },
];

export default function AccueilScreen() {
  const { profile, session, isGuest, exitGuest } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const userId = session?.user?.id;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const inputRef = useRef<ComponentRef<typeof TextInput>>(null);
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const chatOpacity = useRef(new Animated.Value(0)).current;

  const hasChat = messages.length > 0;
  const hasText = input.trim().length > 0;

  useEffect(() => {
    if (hasChat) {
      Animated.timing(chatOpacity, { toValue: 1, duration: 260, useNativeDriver: true }).start();
    }
  }, [hasChat, chatOpacity]);

  const scrollToEnd = () =>
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));

  const ensureConversation = async (): Promise<string | null> => {
    if (conversationId) return conversationId;
    if (!userId) return null;
    const { data } = await supabase
      .from('conversations')
      .insert({ user_id: userId })
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

    const convId = await ensureConversation();
    if (convId) {
      void supabase
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
        void supabase.from('messages').insert({
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

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.bottom + 56}>
        {hasChat ? (
          <Animated.View style={[styles.flex, { opacity: chatOpacity }]}>
            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={(m) => m.id}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => <Bubble message={item} />}
              onContentSizeChange={scrollToEnd}
              showsVerticalScrollIndicator={false}
            />
          </Animated.View>
        ) : (
          <View style={styles.welcome}>
            <Mascot size={82} />
            <View style={styles.heroCard}>
              <Text variant="title" center style={styles.heroTitle}>
                Entraîne-toi avec de vrais examens blancs.
              </Text>
            </View>
            <Tappable style={styles.cta} onPress={() => comingSoon('Créer un examen blanc')}>
              <Text variant="bodyStrong" color={Palette.background}>
                Créer un examen blanc
              </Text>
            </Tappable>
          </View>
        )}

        {sending ? (
          <View style={styles.typing}>
            <Text variant="small" color={Palette.textSecondary}>
              Quizylo réfléchit…
            </Text>
          </View>
        ) : null}

        {/* Onglets d'actions — juste au-dessus de la barre, uniquement sur l'accueil */}
        {!hasChat ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}>
            {ACTIONS.map((a) => (
              <Tappable key={a.key} style={styles.chip} onPress={() => comingSoon(a.label)}>
                <Ionicons name={a.icon} size={16} color={a.color} />
                <Text variant="small">{a.label}</Text>
              </Tappable>
            ))}
          </ScrollView>
        ) : null}

        {/* Barre d'écriture */}
        <View style={[styles.inputRow, { paddingBottom: Spacing.md }]}>
          <View style={styles.inputField}>
            {!hasText ? (
              <Tappable
                onPress={() => inputRef.current?.focus()}
                scaleTo={0.9}
                accessibilityLabel="Dicter">
                <Ionicons name="mic-outline" size={22} color={Palette.textSecondary} />
              </Tappable>
            ) : null}
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder="Demande à Quizylo…"
              placeholderTextColor={Palette.textMuted}
              value={input}
              onChangeText={setInput}
              onSubmitEditing={send}
              returnKeyType="send"
              multiline
            />
            {hasText ? (
              <Tappable onPress={send} scaleTo={0.9} accessibilityLabel="Envoyer">
                <View style={styles.sendBtn}>
                  <Ionicons name="arrow-up" size={18} color={Palette.background} />
                </View>
              </Tappable>
            ) : (
              <Tappable onPress={() => comingSoon('Appareil photo')} scaleTo={0.9} accessibilityLabel="Photo">
                <Ionicons name="camera-outline" size={22} color={Palette.textSecondary} />
              </Tappable>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function Bubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  return (
    <View style={[styles.bubbleRow, isUser ? styles.rowEnd : styles.rowStart]}>
      {!isUser ? (
        <View style={styles.botAvatar}>
          <Mascot size={18} />
        </View>
      ) : null}
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleBot]}>
        <Text style={[Type.body, { color: isUser ? Palette.background : Palette.text }]}>
          {message.content}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  welcome: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.lg, gap: Spacing.lg },
  heroCard: {
    backgroundColor: Palette.surfaceElevated,
    borderRadius: Radius.xl,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.xl,
    marginTop: -Spacing.md,
    alignSelf: 'stretch',
  },
  heroTitle: { fontSize: 24, lineHeight: 30 },
  cta: {
    backgroundColor: '#F4F4F5',
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  listContent: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.sm, gap: Spacing.md },
  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm },
  rowEnd: { justifyContent: 'flex-end' },
  rowStart: { justifyContent: 'flex-start' },
  botAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Palette.purpleSurface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  bubble: { maxWidth: '80%', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderRadius: Radius.lg },
  bubbleUser: { backgroundColor: Palette.primary, borderBottomRightRadius: 6 },
  bubbleBot: { backgroundColor: Palette.surfaceElevated, borderBottomLeftRadius: 6 },
  typing: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm },
  chips: { paddingHorizontal: Spacing.lg, gap: Spacing.sm, paddingBottom: Spacing.sm },
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
  inputRow: { paddingHorizontal: Spacing.lg },
  inputField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: 50,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 6,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: Radius.lg,
  },
  input: { flex: 1, color: Palette.text, ...Type.body, maxHeight: 120, paddingTop: 0, paddingBottom: 0 },
  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
