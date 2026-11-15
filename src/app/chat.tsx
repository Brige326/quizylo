import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Mascot } from '@/components/ui/Mascot';
import { Tappable } from '@/components/ui/Tappable';
import { Text } from '@/components/ui/Text';
import { Palette, Radius, Spacing, Type } from '@/constants/theme';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/lib/supabase';

type ChatMessage = { id: string; role: 'user' | 'assistant'; content: string };

export default function ChatScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const userId = session?.user?.id;

  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  // Crée une conversation à l'ouverture (si pas déjà en cours).
  useEffect(() => {
    let active = true;
    if (!userId) return;
    (async () => {
      const { data, error } = await supabase
        .from('conversations')
        .insert({ user_id: userId })
        .select('id')
        .single();
      if (active && !error && data) setConversationId(data.id);
    })();
    return () => {
      active = false;
    };
  }, [userId]);

  const scrollToEnd = () =>
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));

  const send = async () => {
    const text = input.trim();
    if (!text || sending || !userId || !conversationId) return;
    setInput('');

    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', content: text };
    setMessages((m) => [...m, userMsg]);
    scrollToEnd();

    void supabase
      .from('messages')
      .insert({ conversation_id: conversationId, user_id: userId, role: 'user', content: text });

    setSending(true);
    try {
      const history = [...messages, userMsg]
        .slice(-20)
        .map((m) => ({ role: m.role, content: m.content }));

      const { data, error } = await supabase.functions.invoke('chat', {
        body: { messages: history },
      });

      const reply =
        error || !data?.reply
          ? "Je n'ai pas pu répondre pour le moment. Réessaie dans un instant."
          : String(data.reply);

      const botMsg: ChatMessage = { id: `a-${Date.now()}`, role: 'assistant', content: reply };
      setMessages((m) => [...m, botMsg]);
      scrollToEnd();

      void supabase.from('messages').insert({
        conversation_id: conversationId,
        user_id: userId,
        role: 'assistant',
        content: reply,
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.root}>
      {/* En-tête */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Tappable onPress={() => router.back()} scaleTo={0.9} accessibilityLabel="Retour">
          <Ionicons name="chevron-back" size={26} color={Palette.text} />
        </Tappable>
        <View style={styles.headerCenter}>
          <Mascot size={26} />
          <Text variant="heading">Quizylo</Text>
        </View>
        <View style={{ width: 26 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top + 44}>
        {messages.length === 0 ? (
          <View style={styles.empty}>
            <Mascot size={72} />
            <Text variant="heading" center style={{ marginTop: Spacing.lg }}>
              Pose ta question
            </Text>
            <Text variant="body" color={Palette.textSecondary} center style={{ maxWidth: 280 }}>
              Un exercice à résoudre, un cours à résumer, une notion à comprendre — demande à Quizylo.
            </Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => <Bubble message={item} />}
            onContentSizeChange={scrollToEnd}
            showsVerticalScrollIndicator={false}
          />
        )}

        {sending ? (
          <View style={styles.typing}>
            <ActivityIndicator color={Palette.primary} />
            <Text variant="small" color={Palette.textSecondary}>
              Quizylo réfléchit…
            </Text>
          </View>
        ) : null}

        {/* Saisie */}
        <View style={[styles.inputRow, { paddingBottom: Math.max(insets.bottom, Spacing.sm) }]}>
          <TextInput
            style={styles.input}
            placeholder="Demande à Quizylo…"
            placeholderTextColor={Palette.textMuted}
            value={input}
            onChangeText={setInput}
            multiline
            onSubmitEditing={send}
          />
          <Tappable
            onPress={send}
            disabled={!input.trim() || sending}
            style={[styles.sendBtn, (!input.trim() || sending) && styles.sendBtnOff]}
            scaleTo={0.9}
            accessibilityLabel="Envoyer">
            <Ionicons name="arrow-up" size={20} color={Palette.background} />
          </Tappable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function Bubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  return (
    <View style={[styles.bubbleRow, isUser ? styles.rowEnd : styles.rowStart]}>
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleBot]}>
        <Text
          style={[Type.body, { color: isUser ? Palette.background : Palette.text }]}>
          {message.content}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Palette.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Palette.border,
  },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.xl },
  listContent: { padding: Spacing.lg, gap: Spacing.md },
  bubbleRow: { flexDirection: 'row' },
  rowEnd: { justifyContent: 'flex-end' },
  rowStart: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '82%', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderRadius: Radius.lg },
  bubbleUser: { backgroundColor: Palette.primary, borderBottomRightRadius: 6 },
  bubbleBot: { backgroundColor: Palette.surfaceElevated, borderBottomLeftRadius: 6 },
  typing: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Palette.border,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 48,
    color: Palette.text,
    ...Type.body,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnOff: { backgroundColor: Palette.surfaceSelected },
});
