import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { Spacing } from '@/constants/theme';

export default function RechercheScreen() {
  const [query, setQuery] = useState('');
  return (
    <Screen edges={['top']}>
      <View style={styles.header}>
        <TextField
          icon="search-outline"
          placeholder="Rechercher un sujet, un cours…"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          returnKeyType="search"
        />
      </View>
      <EmptyState
        icon="search-outline"
        title="Cherche ce que tu veux réviser"
        subtitle="Tape un sujet, une matière ou une notion. Tes recherches et suggestions apparaîtront ici."
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: Spacing.md },
});
