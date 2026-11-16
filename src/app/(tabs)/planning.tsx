import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { TopBar } from '@/components/TopBar';
import { useAuth } from '@/contexts/auth';
import { comingSoon } from '@/lib/ui';

/**
 * « Planning » — agenda personnel complet de l'étudiant.
 * Séance 0 : coquille soignée + état vide. La construction réelle (calendrier jour/semaine/mois,
 * événements, tâches, rappels, liaison avec Mes cours) arrive dès la séance PL-1.
 */
export default function PlanningScreen() {
  const { profile } = useAuth();
  return (
    <Screen>
      <TopBar xp={profile?.xp ?? 0} streak={profile?.streak_days ?? 0} />
      <EmptyState
        icon="calendar-outline"
        title="Ton agenda personnel"
        subtitle="Organise tes cours, tes révisions et tout ton quotidien. Ajoute une activité et visualise ta journée en un coup d'œil.">
        <Button label="Ajouter une activité" onPress={() => comingSoon('Planning')} />
      </EmptyState>
    </Screen>
  );
}
