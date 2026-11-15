import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Screen } from '@/components/ui/Screen';
import { Tappable } from '@/components/ui/Tappable';
import { Text } from '@/components/ui/Text';
import { Palette, Radius, Spacing, Type } from '@/constants/theme';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/lib/supabase';

const LEVELS = ['Primaire', 'Collège', 'Lycée', 'Études sup.'];
const STYLES = ['Concis', 'Équilibré', 'Détaillé'];

export default function AiMemoryScreen() {
  const { session, isGuest, exitGuest } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const userId = session?.user?.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [level, setLevel] = useState<string | null>(null);
  const [subjects, setSubjects] = useState('');
  const [goal, setGoal] = useState('');
  const [style, setStyle] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  const back = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/settings');
  };

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    let active = true;
    supabase
      .from('ai_memory')
      .select('enabled, level, subjects, goal, style, notes')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        if (data) {
          setEnabled(data.enabled ?? true);
          setLevel(data.level ?? null);
          setSubjects(data.subjects ?? '');
          setGoal(data.goal ?? '');
          setStyle(data.style ?? null);
          setNotes(data.notes ?? '');
        }
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [userId]);

  const save = async () => {
    if (!userId || saving) return;
    setSaving(true);
    const { error } = await supabase.from('ai_memory').upsert({
      user_id: userId,
      enabled,
      level,
      subjects: subjects.trim() || null,
      goal: goal.trim() || null,
      style,
      notes: notes.trim() || null,
      updated_at: new Date().toISOString(),
    });
    setSaving(false);
    if (error) {
      Alert.alert('Oups', "Impossible d'enregistrer pour le moment. Réessaie.");
      return;
    }
    Alert.alert('Enregistré', "L'IA tiendra compte de ces informations dès qu'elle sera active.");
  };

  if (isGuest) {
    return (
      <Screen>
        <Header insetTop={insets.top} onBack={back} />
        <View style={styles.guest}>
          <Text variant="body" color={Palette.textSecondary} center>
            Connecte-toi pour personnaliser la mémoire de l'IA.
          </Text>
          <Tappable
            style={styles.primaryBtn}
            onPress={() => {
              exitGuest();
              router.replace('/(auth)/login');
            }}>
            <Text variant="bodyStrong" color={Palette.onPrimary}>
              Se connecter
            </Text>
          </Tappable>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <Header insetTop={insets.top} onBack={back} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: Spacing.lg, paddingBottom: insets.bottom + Spacing.xl }}>
        <Text variant="small" color={Palette.textSecondary} style={{ marginBottom: Spacing.lg }}>
          Dis à l'IA ce qu'elle doit retenir de toi pour des réponses plus adaptées. Tu gardes le
          contrôle : tu peux tout modifier ou désactiver à tout moment.
        </Text>

        {/* Activation */}
        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong">Utiliser ma mémoire</Text>
            <Text variant="small" color={Palette.textSecondary}>
              L'IA s'appuie sur ces informations dans ses réponses.
            </Text>
          </View>
          <Switch
            value={enabled}
            onValueChange={setEnabled}
            trackColor={{ false: Palette.surfaceSelected, true: Palette.primary }}
            thumbColor="#fff"
          />
        </View>

        {loading ? null : (
          <>
            <Label>Niveau</Label>
            <ChipGroup options={LEVELS} value={level} onSelect={setLevel} />

            <Label>Matières principales</Label>
            <TextInput
              style={styles.input}
              value={subjects}
              onChangeText={setSubjects}
              placeholder="Ex : Maths, Physique, SVT"
              placeholderTextColor={Palette.textMuted}
            />

            <Label>Objectif</Label>
            <TextInput
              style={styles.input}
              value={goal}
              onChangeText={setGoal}
              placeholder="Ex : Réussir le bac, comprendre mes cours…"
              placeholderTextColor={Palette.textMuted}
            />

            <Label>Style de réponse</Label>
            <ChipGroup options={STYLES} value={style} onSelect={setStyle} />

            <Label>À retenir sur moi</Label>
            <TextInput
              style={[styles.input, styles.multiline]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Ex : je préfère des exemples concrets, explique étape par étape…"
              placeholderTextColor={Palette.textMuted}
              multiline
            />

            <Tappable style={[styles.primaryBtn, saving && styles.btnDisabled]} onPress={save}>
              <Text variant="bodyStrong" color={Palette.onPrimary}>
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </Text>
            </Tappable>

            <Text variant="caption" color={Palette.textMuted} center style={{ marginTop: Spacing.md }}>
              Ces informations seront utilisées par l'IA dès son activation.
            </Text>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

function Header({ insetTop, onBack }: { insetTop: number; onBack: () => void }) {
  return (
    <View style={[styles.header, { paddingTop: insetTop + Spacing.xs }]}>
      <Tappable onPress={onBack} hitSlop={12} scaleTo={0.9} accessibilityLabel="Retour">
        <Ionicons name="chevron-back" size={26} color={Palette.text} />
      </Tappable>
      <Text variant="heading">Mémoire de l'IA</Text>
      <View style={{ width: 26 }} />
    </View>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <Text variant="small" color={Palette.textSecondary} style={{ marginBottom: 6, marginTop: Spacing.lg }}>
      {children}
    </Text>
  );
}

function ChipGroup({
  options,
  value,
  onSelect,
}: {
  options: string[];
  value: string | null;
  onSelect: (v: string) => void;
}) {
  return (
    <View style={styles.chips}>
      {options.map((o) => {
        const active = value === o;
        return (
          <Tappable
            key={o}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => onSelect(o)}>
            <Text variant="small" color={active ? Palette.onPrimary : Palette.text}>
              {o}
            </Text>
          </Tappable>
        );
      })}
    </View>
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
  guest: { padding: Spacing.xl, gap: Spacing.lg, alignItems: 'center' },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Palette.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
  input: {
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    minHeight: 50,
    color: Palette.text,
    ...Type.body,
  },
  multiline: { minHeight: 96, textAlignVertical: 'top', paddingTop: Spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: 9,
  },
  chipActive: { backgroundColor: Palette.primary, borderColor: Palette.primary },
  primaryBtn: {
    backgroundColor: Palette.primary,
    borderRadius: Radius.pill,
    paddingVertical: Spacing.md + 2,
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  btnDisabled: { opacity: 0.5 },
});
