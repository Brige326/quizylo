import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { Mascot } from '@/components/ui/Mascot';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { Palette, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth';

export default function LoginScreen() {
  const { signIn, enterGuest } = useAuth();
  const router = useRouter();

  const onExplore = () => {
    enterGuest();
    router.replace('/(tabs)');
  };
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError('Renseigne ton e-mail et ton mot de passe.');
      return;
    }
    setLoading(true);
    const { error } = await signIn({ email, password });
    setLoading(false);
    if (error) {
      setError(traduireErreur(error));
      return;
    }
    router.replace('/(tabs)');
  };

  return (
    <Screen padded>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Mascot size={84} />
            <Text variant="display" center style={styles.brand}>
              Quizylo
            </Text>
            <Text variant="body" color={Palette.textSecondary} center>
              Ton coach de révision, propulsé par l&apos;IA.
            </Text>
          </View>

          <View style={styles.form}>
            <TextField
              label="E-mail"
              icon="mail-outline"
              placeholder="toi@exemple.com"
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              value={email}
              onChangeText={setEmail}
            />
            <TextField
              label="Mot de passe"
              icon="lock-closed-outline"
              placeholder="••••••••"
              secure
              autoCapitalize="none"
              value={password}
              onChangeText={setPassword}
            />

            {error ? (
              <Text variant="small" color={Palette.danger}>
                {error}
              </Text>
            ) : null}

            <Button label="Se connecter" loading={loading} onPress={onSubmit} />
            <Button label="Explorer sans compte" variant="secondary" onPress={onExplore} />
          </View>

          <View style={styles.footer}>
            <Text variant="small" color={Palette.textSecondary}>
              Pas encore de compte ?{' '}
            </Text>
            <Link href="/(auth)/signup" replace>
              <Text variant="bodyStrong" color={Palette.primary}>
                Créer un compte
              </Text>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function traduireErreur(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login')) return 'E-mail ou mot de passe incorrect.';
  if (m.includes('email not confirmed'))
    return 'Confirme ton e-mail avant de te connecter.';
  return message;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', gap: Spacing.xxl, paddingVertical: Spacing.xl },
  header: { alignItems: 'center', gap: Spacing.sm },
  brand: { marginTop: Spacing.lg },
  form: { gap: Spacing.lg },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
});
