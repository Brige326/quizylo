import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { TopBar } from '@/components/TopBar';
import { useAuth } from '@/contexts/auth';
import { comingSoon } from '@/lib/ui';

export default function ParcoursScreen() {
  const { profile } = useAuth();
  return (
    <Screen>
      <TopBar xp={profile?.xp ?? 0} streak={profile?.streak_days ?? 0} />
      <EmptyState
        icon="trail-sign-outline"
        title="Ton parcours commence ici"
        subtitle="Crée ta première matière pour générer un parcours de révision guidé, étape par étape.">
        <Button label="Créer un parcours" onPress={() => comingSoon('Parcours de cours')} />
      </EmptyState>
    </Screen>
  );
}
