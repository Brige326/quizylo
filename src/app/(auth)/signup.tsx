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

export default function SignupScreen() {
  const { signUp } = useAuth();
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setError(null);
    setNotice(null);
    if (!fullName.trim() || !email.trim() || !password) {
      setError('Remplis tous les champs.');
      return;
    }
    if (password.length < 6) {
      setError('Le mot de passe doit faire au moins 6 caractères.');
      return;
    }
    setLoading(true);
    const { error, needsConfirmation } = await signUp({ email, password, fullName });
    setLoading(false);
    if (error) {
      setError(error);
      return;
    }
    if (needsConfirmation) {
      setNotice('Compte créé ! Confirme ton e-mail, puis connecte-toi.');
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
            <Mascot size={72} />
            <Text variant="title" center style={styles.brand}>
              Crée ton compte
            </Text>
            <Text variant="body" color={Palette.textSecondary} center>
              Rejoins Quizylo et commence à réviser autrement.
            </Text>
          </View>

          <View style={styles.form}>
            <TextField
              label="Nom complet"
              icon="person-outline"
              placeholder="Ton nom"
              value={fullName}
              onChangeText={setFullName}
            />
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
              placeholder="6 caractères minimum"
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
            {notice ? (
              <Text variant="small" color={Palette.primary}>
                {notice}
              </Text>
            ) : null}

            <Button label="Créer mon compte" loading={loading} onPress={onSubmit} />
          </View>

          <View style={styles.footer}>
            <Text variant="small" color={Palette.textSecondary}>
              Déjà inscrit ?{' '}
            </Text>
            <Link href="/(auth)/login" replace>
              <Text variant="bodyStrong" color={Palette.primary}>
                Se connecter
              </Text>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', gap: Spacing.xxl, paddingVertical: Spacing.xl },
  header: { alignItems: 'center', gap: Spacing.sm },
  brand: { marginTop: Spacing.md },
  form: { gap: Spacing.lg },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
});
