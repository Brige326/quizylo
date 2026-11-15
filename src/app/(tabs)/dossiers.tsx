import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { TopBar } from '@/components/TopBar';
import { useAuth } from '@/contexts/auth';
import { comingSoon } from '@/lib/ui';

export default function DossiersScreen() {
  const { profile } = useAuth();
  return (
    <Screen>
      <TopBar
        xp={profile?.xp ?? 0}
        streak={profile?.streak_days ?? 0}
        onPro={() => comingSoon('Quizylo PRO')}
      />
      <EmptyState
        icon="folder-open-outline"
        title="Transforme tes fichiers en savoir"
        subtitle="Ajoute tes cours et documents : Quizylo en fera des quiz, des résumés et des fiches de révision.">
        <Button label="C'est parti" onPress={() => comingSoon('Import de fichiers')} />
      </EmptyState>
    </Screen>
  );
}
