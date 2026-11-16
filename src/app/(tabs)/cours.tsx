import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { TopBar } from '@/components/TopBar';
import { useAuth } from '@/contexts/auth';
import { comingSoon } from '@/lib/ui';

/**
 * « Mes cours » — bibliothèque personnelle de l'étudiant.
 * Séance 0 : coquille soignée + état vide. La construction réelle (matières, chapitres,
 * documents, contenus générés, révision) arrive dès la séance MC-1.
 */
export default function MesCoursScreen() {
  const { profile } = useAuth();
  return (
    <Screen>
      <TopBar xp={profile?.xp ?? 0} streak={profile?.streak_days ?? 0} />
      <EmptyState
        icon="library-outline"
        title="Ta bibliothèque de cours"
        subtitle="Range tes matières, importe tes documents et retrouve en quelques secondes tout ce dont tu as besoin pour réviser.">
        <Button label="Ajouter une matière" onPress={() => comingSoon('Mes cours')} />
      </EmptyState>
    </Screen>
  );
}
