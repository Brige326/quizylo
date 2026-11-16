import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Tappable } from '@/components/ui/Tappable';
import { Text } from '@/components/ui/Text';
import { Palette, Radius, Spacing } from '@/constants/theme';
import {
  deleteGeneratedContent,
  getGeneratedContent,
  type GenItem,
  type QuizQuestion,
} from '@/lib/courses';

export default function RevisionViewerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [item, setItem] = useState<GenItem | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setItem(await getGeneratedContent(id));
    } catch {
      // rien d'inventé
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const back = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/cours');
  };

  const onDelete = () => {
    if (!item) return;
    Alert.alert('Supprimer', `« ${item.title} » sera supprimé définitivement.`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteGeneratedContent(item.id);
          } catch {
            /* ignore */
          }
          back();
        },
      },
    ]);
  };

  return (
    <Screen>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.xs }]}>
        <Tappable onPress={back} hitSlop={12} scaleTo={0.9} accessibilityLabel="Retour">
          <Ionicons name="chevron-back" size={26} color={Palette.text} />
        </Tappable>
        <Text variant="heading" numberOfLines={1} style={{ flex: 1, textAlign: 'center' }}>
          {item?.title ?? 'Révision'}
        </Text>
        <Tappable onPress={onDelete} hitSlop={12} scaleTo={0.9} accessibilityLabel="Supprimer">
          <Ionicons name="trash-outline" size={22} color={Palette.danger} />
        </Tappable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Palette.primary} />
        </View>
      ) : !item ? (
        <View style={styles.center}>
          <Text variant="body" color={Palette.textMuted}>
            Contenu introuvable.
          </Text>
        </View>
      ) : item.kind === 'quiz' || item.kind === 'examen' ? (
        <QuizPlayer payload={item.payload} />
      ) : item.kind === 'flashcards' ? (
        <Flashcards payload={item.payload} />
      ) : item.kind === 'fiche' ? (
        <Fiche payload={item.payload} />
      ) : (
        <ResumeView payload={item.payload} />
      )}
    </Screen>
  );
}

/* ---------- Quiz / Examen ---------- */

function QuizPlayer({ payload }: { payload: GenItem['payload'] }) {
  const questions = ((payload as { questions?: QuizQuestion[] }).questions ?? []).filter(
    (q) => q && Array.isArray(q.choices) && q.choices.length > 0,
  );
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  if (questions.length === 0) {
    return (
      <View style={styles.center}>
        <Text variant="body" color={Palette.textMuted} center>
          Ce quiz n'a pas pu être lu correctement.
        </Text>
      </View>
    );
  }

  if (done) {
    return (
      <View style={styles.center}>
        <Text variant="title" center>
          {score} / {questions.length}
        </Text>
        <Text variant="body" color={Palette.textSecondary} center style={{ marginVertical: Spacing.md }}>
          {score === questions.length
            ? 'Sans faute, bravo !'
            : score >= questions.length / 2
              ? 'Bien joué, continue à réviser.'
              : 'Reprends la fiche puis retente le quiz.'}
        </Text>
        <View style={{ alignSelf: 'stretch', paddingHorizontal: Spacing.lg }}>
          <Button
            label="Recommencer"
            onPress={() => {
              setIndex(0);
              setPicked(null);
              setScore(0);
              setDone(false);
            }}
          />
        </View>
      </View>
    );
  }

  const q = questions[index];
  const revealed = picked !== null;

  const choose = (i: number) => {
    if (revealed) return;
    setPicked(i);
    if (i === q.answer) setScore((s) => s + 1);
  };

  const next = () => {
    if (index + 1 >= questions.length) setDone(true);
    else {
      setIndex((x) => x + 1);
      setPicked(null);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.quizBody} showsVerticalScrollIndicator={false}>
      <Text variant="small" color={Palette.textMuted}>
        Question {index + 1} / {questions.length}
      </Text>
      <Text variant="title" style={{ marginVertical: Spacing.md }}>
        {q.q}
      </Text>
      {q.choices.map((c, i) => {
        const isAnswer = i === q.answer;
        const isPicked = i === picked;
        const bg = revealed
          ? isAnswer
            ? Palette.primarySurface
            : isPicked
              ? '#3A1D1D'
              : Palette.surface
          : Palette.surface;
        const border = revealed && isAnswer ? Palette.primary : revealed && isPicked ? Palette.danger : 'transparent';
        return (
          <Tappable
            key={i}
            style={[styles.choice, { backgroundColor: bg, borderColor: border }]}
            onPress={() => choose(i)}
            haptic={false}>
            <Text variant="bodyStrong" style={{ flex: 1 }}>
              {c}
            </Text>
            {revealed && isAnswer ? (
              <Ionicons name="checkmark-circle" size={20} color={Palette.primary} />
            ) : revealed && isPicked ? (
              <Ionicons name="close-circle" size={20} color={Palette.danger} />
            ) : null}
          </Tappable>
        );
      })}
      {revealed && q.explanation ? (
        <View style={styles.explain}>
          <Text variant="small" color={Palette.textSecondary}>
            {q.explanation}
          </Text>
        </View>
      ) : null}
      {revealed ? (
        <View style={{ marginTop: Spacing.lg }}>
          <Button label={index + 1 >= questions.length ? 'Voir le score' : 'Suivant'} onPress={next} />
        </View>
      ) : null}
    </ScrollView>
  );
}

/* ---------- Flashcards ---------- */

function Flashcards({ payload }: { payload: GenItem['payload'] }) {
  const cards = (payload as { cards?: { front: string; back: string }[] }).cards ?? [];
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  if (cards.length === 0) {
    return (
      <View style={styles.center}>
        <Text variant="body" color={Palette.textMuted} center>
          Ces flashcards n'ont pas pu être lues.
        </Text>
      </View>
    );
  }

  const card = cards[index];
  const go = (d: number) => {
    setFlipped(false);
    setIndex((x) => Math.min(cards.length - 1, Math.max(0, x + d)));
  };

  return (
    <View style={styles.flashWrap}>
      <Text variant="small" color={Palette.textMuted} center>
        {index + 1} / {cards.length}
      </Text>
      <Pressable style={styles.card} onPress={() => setFlipped((f) => !f)}>
        <Text variant="small" color={Palette.textMuted}>
          {flipped ? 'Réponse' : 'Question'}
        </Text>
        <Text variant="title" center style={{ marginTop: Spacing.md }}>
          {flipped ? card.back : card.front}
        </Text>
        <Text variant="small" color={Palette.textMuted} style={styles.tapHint}>
          Touche pour retourner
        </Text>
      </Pressable>
      <View style={styles.flashNav}>
        <Tappable
          style={[styles.navBtn, index === 0 && styles.navBtnOff]}
          onPress={() => go(-1)}
          disabled={index === 0}>
          <Ionicons name="chevron-back" size={24} color={Palette.text} />
        </Tappable>
        <Tappable
          style={[styles.navBtn, index === cards.length - 1 && styles.navBtnOff]}
          onPress={() => go(1)}
          disabled={index === cards.length - 1}>
          <Ionicons name="chevron-forward" size={24} color={Palette.text} />
        </Tappable>
      </View>
    </View>
  );
}

/* ---------- Fiche ---------- */

function Fiche({ payload }: { payload: GenItem['payload'] }) {
  const sections = (payload as { sections?: { heading: string; points: string[] }[] }).sections ?? [];
  if (sections.length === 0) {
    return (
      <View style={styles.center}>
        <Text variant="body" color={Palette.textMuted} center>
          Cette fiche n'a pas pu être lue.
        </Text>
      </View>
    );
  }
  return (
    <ScrollView contentContainerStyle={styles.textBody} showsVerticalScrollIndicator={false}>
      {sections.map((s, i) => (
        <View key={i} style={{ marginBottom: Spacing.lg }}>
          <Text variant="heading" style={{ marginBottom: Spacing.sm }}>
            {s.heading}
          </Text>
          {(s.points ?? []).map((p, j) => (
            <View key={j} style={styles.bulletRow}>
              <View style={styles.bullet} />
              <Text variant="body" color={Palette.textSecondary} style={{ flex: 1 }}>
                {p}
              </Text>
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

/* ---------- Résumé ---------- */

function ResumeView({ payload }: { payload: GenItem['payload'] }) {
  const text = (payload as { text?: string }).text ?? '';
  return (
    <ScrollView contentContainerStyle={styles.textBody} showsVerticalScrollIndicator={false}>
      <Text variant="body" color={Palette.textSecondary} style={{ lineHeight: 24 }}>
        {text || "Ce résumé n'a pas pu être lu."}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  quizBody: { padding: Spacing.lg },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.sm,
  },
  explain: {
    backgroundColor: Palette.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  flashWrap: { flex: 1, padding: Spacing.lg, justifyContent: 'center', gap: Spacing.lg },
  card: {
    backgroundColor: Palette.surface,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    minHeight: 260,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tapHint: { position: 'absolute', bottom: Spacing.md },
  flashNav: { flexDirection: 'row', justifyContent: 'space-between' },
  navBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Palette.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnOff: { opacity: 0.35 },
  textBody: { padding: Spacing.lg, paddingBottom: Spacing.xl },
  bulletRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm, alignItems: 'flex-start' },
  bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: Palette.primary, marginTop: 8 },
});
