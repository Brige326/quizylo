import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { Tappable } from '@/components/ui/Tappable';
import { Palette, Radius, Spacing, Type } from '@/constants/theme';
import { comingSoon } from '@/lib/ui';

export default function RechercheScreen() {
  const [query, setQuery] = useState('');
  const trimmed = query.trim();

  return (
    <Screen edges={['top']}>
      <View style={styles.searchRow}>
        <View style={styles.searchField}>
          <Ionicons name="search" size={18} color={Palette.textMuted} />
          <TextInput
            style={styles.input}
            placeholder="Cherche un sujet…"
            placeholderTextColor={Palette.textMuted}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {trimmed ? (
            <Tappable onPress={() => setQuery('')} scaleTo={0.9} accessibilityLabel="Effacer">
              <Ionicons name="close-circle" size={18} color={Palette.textMuted} />
            </Tappable>
          ) : null}
        </View>
        <Tappable
          style={styles.gear}
          onPress={() => comingSoon('Réglages de recherche')}
          scaleTo={0.9}
          accessibilityLabel="Réglages">
          <Ionicons name="settings-outline" size={20} color={Palette.text} />
        </Tappable>
      </View>

      {trimmed ? (
        <EmptyState
          icon="search-outline"
          title="Aucun résultat pour l'instant"
          subtitle={`Rien d'indexé pour « ${trimmed} » — le contenu arrivera avec tes parcours et tes fiches.`}
        />
      ) : (
        <EmptyState
          icon="search-outline"
          title="Cherche ce que tu veux réviser"
          subtitle="Tape un sujet, une matière ou une notion. Tes recherches et reprises apparaîtront ici."
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  searchField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    height: 48,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: Radius.pill,
  },
  input: { flex: 1, color: Palette.text, ...Type.body },
  gear: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
});
