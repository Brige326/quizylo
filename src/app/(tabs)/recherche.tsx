import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { Tappable } from '@/components/ui/Tappable';
import { Text } from '@/components/ui/Text';
import { Palette, Radius, Spacing, Type } from '@/constants/theme';
import { useAuth } from '@/contexts/auth';
import { comingSoon } from '@/lib/ui';

// Aperçu (mode invité) — exemples clairement étiquetés, jamais présentés comme réels.
const POPULAIRES = [
  'Avancées démocratie',
  'Révolution française',
  'Marketing digital',
  'Décisions consommateur',
  'Méditerranée antique',
  'Analyse Hélène Dorion',
];

const REPRENDS = [
  'LE MARKETING OPÉRATIONNEL : LE…',
  'Révise ton anglais en lisant ce texte',
  'COURS HGGSP DÉMOCRATIE',
];

export default function RechercheScreen() {
  const { isGuest } = useAuth();
  const [query, setQuery] = useState('');
  const trimmed = query.trim();

  return (
    <Screen edges={['top']}>
      {/* Barre de recherche */}
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

      {/* Résultat de recherche (honnête : vide tant qu'aucun contenu n'est indexé) */}
      {trimmed ? (
        <EmptyState
          icon="search-outline"
          title="Aucun résultat pour l'instant"
          subtitle={`Rien d'indexé pour « ${trimmed} » — le contenu arrivera avec tes parcours et tes fiches.`}
        />
      ) : isGuest ? (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.sectionHead}>
            <Text variant="title">Recherches populaires</Text>
            <View style={styles.apercuBadge}>
              <Text variant="caption" color={Palette.textSecondary}>
                APERÇU
              </Text>
            </View>
          </View>
          {POPULAIRES.map((item) => (
            <Tappable
              key={item}
              style={styles.row}
              onPress={() => comingSoon(item)}
              haptic={false}>
              <Ionicons name="trending-up" size={20} color={Palette.text} />
              <Text variant="bodyStrong" style={styles.rowLabel}>
                {item}
              </Text>
              <Ionicons name="chevron-forward" size={18} color={Palette.textMuted} />
            </Tappable>
          ))}

          <View style={[styles.sectionHead, { marginTop: Spacing.xl }]}>
            <Text variant="title">Reprends où tu étais</Text>
            <Tappable onPress={() => comingSoon('Tout voir')} haptic={false}>
              <Text variant="small" color={Palette.textSecondary}>
                Tout voir
              </Text>
            </Tappable>
          </View>
          {REPRENDS.map((title) => (
            <Tappable
              key={title}
              style={styles.row}
              onPress={() => comingSoon(title)}
              haptic={false}>
              <View style={styles.cardIcon}>
                <Ionicons name="document-text" size={18} color={Palette.primary} />
              </View>
              <View style={styles.rowLabel}>
                <Text variant="bodyStrong" numberOfLines={1}>
                  {title}
                </Text>
                <Text variant="small" color={Palette.textMuted}>
                  Fiche de révision
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Palette.textMuted} />
            </Tappable>
          ))}
        </ScrollView>
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
  content: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  apercuBadge: {
    backgroundColor: Palette.surfaceElevated,
    borderRadius: Radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
  },
  rowLabel: { flex: 1 },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    backgroundColor: Palette.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
