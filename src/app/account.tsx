import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Screen } from '@/components/ui/Screen';
import { Tappable } from '@/components/ui/Tappable';
import { Text } from '@/components/ui/Text';
import { Palette, Radius, Spacing, Type } from '@/constants/theme';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/lib/supabase';

export default function AccountScreen() {
  const { session, profile, isGuest, refreshProfile, exitGuest } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const userId = session?.user?.id;
  const email = session?.user?.email ?? '';
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [username, setUsername] = useState(profile?.username ?? '');
  const [saving, setSaving] = useState(false);

  const back = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/settings');
  };

  const dirty =
    fullName.trim() !== (profile?.full_name ?? '') || username.trim() !== (profile?.username ?? '');

  const save = async () => {
    if (!userId || saving || !dirty) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName.trim() || null,
        username: username.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);
    setSaving(false);
    if (error) {
      Alert.alert('Oups', "Impossible d'enregistrer pour le moment. Réessaie.");
      return;
    }
    await refreshProfile();
    Alert.alert('Enregistré', 'Tes informations ont été mises à jour.');
  };

  return (
    <Screen>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.xs }]}>
        <Tappable onPress={back} hitSlop={12} scaleTo={0.9} accessibilityLabel="Retour">
          <Ionicons name="chevron-back" size={26} color={Palette.text} />
        </Tappable>
        <Text variant="heading">Mes informations</Text>
        <View style={{ width: 26 }} />
      </View>

      {isGuest ? (
        <View style={styles.guest}>
          <Text variant="body" color={Palette.textSecondary} center>
            Connecte-toi pour gérer tes informations.
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
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: Spacing.lg, paddingBottom: insets.bottom + Spacing.xl }}>
          <Field label="Nom complet">
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Ton nom"
              placeholderTextColor={Palette.textMuted}
              autoCapitalize="words"
            />
          </Field>

          <Field label="Pseudo">
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              placeholder="ton_pseudo"
              placeholderTextColor={Palette.textMuted}
              autoCapitalize="none"
            />
          </Field>

          <Field label="Email">
            <View style={[styles.input, styles.readonly]}>
              <Text variant="body" color={Palette.textSecondary}>
                {email || '—'}
              </Text>
            </View>
            <Text variant="caption" color={Palette.textMuted} style={{ marginTop: 4 }}>
              L'adresse email ne peut pas être modifiée ici.
            </Text>
          </Field>

          <Tappable
            style={[styles.primaryBtn, (!dirty || saving) && styles.btnDisabled]}
            onPress={save}>
            <Text variant="bodyStrong" color={Palette.onPrimary}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </Text>
          </Tappable>
        </ScrollView>
      )}
    </Screen>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: Spacing.lg }}>
      <Text variant="small" color={Palette.textSecondary} style={{ marginBottom: 6 }}>
        {label}
      </Text>
      {children}
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
  input: {
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    minHeight: 50,
    justifyContent: 'center',
    color: Palette.text,
    ...Type.body,
  },
  readonly: { backgroundColor: Palette.surfaceElevated, borderColor: 'transparent' },
  primaryBtn: {
    backgroundColor: Palette.primary,
    borderRadius: Radius.pill,
    paddingVertical: Spacing.md + 2,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  btnDisabled: { opacity: 0.5 },
});
