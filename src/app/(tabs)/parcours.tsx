import { useRouter } from 'expo-router';

import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { TopBar } from '@/components/TopBar';
import { useAuth } from '@/contexts/auth';

export default function ParcoursScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  return (
    <Screen>
      <TopBar xp={profile?.xp ?? 0} streak={profile?.streak_days ?? 0} showMenu={false} />
      <EmptyState
        icon="trail-sign-outline"
        eyebrow="Tes parcours"
        title="Transforme tes fichiers en savoir"
        subtitle="Choisis une matière, ajoute tes cours et documents, et génère un quiz, un résumé ou une fiche de révision adaptés.">
        <Button label="Créer un parcours" onPress={() => router.push('/parcours/nouveau')} />
      </EmptyState>
    </Screen>
  );
}
