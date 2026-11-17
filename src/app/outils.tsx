import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/Text';
import { Palette, Radius, Spacing } from '@/constants/theme';
import { comingSoon } from '@/lib/ui';

type Icon = keyof typeof Ionicons.glyphMap;
type Tool = { key: string; label: string; icon: Icon; color: string };

/** Importer (haut de la feuille) : 4 entrées rapides. */
const IMPORTER: Tool[] = [
  { key: 'camera', label: 'Caméra', icon: 'camera', color: '#5B8CFF' },
  { key: 'photos', label: 'Photos', icon: 'images', color: '#2DD4BF' },
  { key: 'fichiers', label: 'Fichiers', icon: 'document-text', color: '#F5B301' },
  { key: 'youtube', label: 'YouTube', icon: 'logo-youtube', color: '#FF4D4D' },
];

/** Mode de réponse : comment l'IA répond. */
const MODES: Tool[] = [
  { key: 'coache', label: 'Coache-moi', icon: 'school', color: '#22E07B' },
  { key: 'resoudre', label: 'Résoudre', icon: 'bulb', color: '#5B8CFF' },
  { key: 'focus', label: 'On se concentre', icon: 'eye', color: '#A855F7' },
];

/** Entraîne-toi pour contrôles & exams. */
const ENTRAINE: Tool[] = [
  { key: 'quiz', label: 'Quiz-moi', icon: 'help-circle', color: '#5B8CFF' },
  { key: 'cartes', label: 'Créer des cartes mémoire', icon: 'albums', color: '#2DD4BF' },
  { key: 'vocab', label: 'Vocabulaire', icon: 'language', color: '#A855F7' },
  { key: 'examen', label: 'Créer un examen blanc', icon: 'clipboard', color: '#F5B301' },
  { key: 'plan', label: 'Créer un plan de révision', icon: 'calendar', color: '#FF4D8D' },
];

/** Prépare tes cours. */
const PREPARE: Tool[] = [
  { key: 'explique', label: 'Explique', icon: 'chatbubbles', color: '#22E07B' },
  { key: 'fiches', label: 'Trouve des fiches de révision', icon: 'search', color: '#5B8CFF' },
  { key: 'dissertation', label: 'Écrire une dissertation', icon: 'create', color: '#F5B301' },
  { key: 'resume', label: 'Résumer', icon: 'list', color: '#2DD4BF' },
  { key: 'image', label: 'Créer une image', icon: 'color-palette', color: '#FF4D8D' },
  { key: 'aide', label: 'Aide-mémoire', icon: 'bookmarks', color: '#A855F7' },
];

export default function OutilsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const open = (label: string) => comingSoon(label);

  return (
    <View style={[styles.root, { paddingTop: insets.top + Spacing.xs }]}>
      {/* Poignée + en-tête */}
      <View style={styles.grabberWrap}>
        <View style={styles.grabber} />
      </View>
      <View style={styles.header}>
        <Text variant="title">Outils</Text>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.closeBtn}
          accessibilityLabel="Fermer">
          <Ionicons name="close" size={22} color={Palette.text} />
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + Spacing.xl }]}
        showsVerticalScrollIndicator={false}>
        {/* Importer */}
        <SectionTitle>Importer</SectionTitle>
        <GridTiles tools={IMPORTER} columns={4} width={width} onPress={open} />

        {/* Mode de réponse */}
        <SectionTitle>Mode de réponse</SectionTitle>
        <GridTiles tools={MODES} columns={3} width={width} onPress={open} />

        {/* Entraîne-toi */}
        <SectionTitle>Entraîne-toi pour contrôles &amp; exams</SectionTitle>
        <View style={styles.list}>
          {ENTRAINE.map((t) => (
            <ToolRow key={t.key} tool={t} onPress={open} />
          ))}
        </View>

        {/* Prépare tes cours */}
        <SectionTitle>Prépare tes cours</SectionTitle>
        <View style={styles.list}>
          {PREPARE.map((t) => (
            <ToolRow key={t.key} tool={t} onPress={open} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Text variant="bodyStrong" color={Palette.textSecondary} style={styles.sectionTitle}>
      {children}
    </Text>
  );
}

function GridTiles({
  tools,
  columns,
  width,
  onPress,
}: {
  tools: Tool[];
  columns: number;
  width: number;
  onPress: (label: string) => void;
}) {
  const gap = Spacing.sm;
  const tileW = (width - Spacing.lg * 2 - gap * (columns - 1)) / columns;
  return (
    <View style={[styles.grid, { gap }]}>
      {tools.map((t) => (
        <Pressable
          key={t.key}
          onPress={() => onPress(t.label)}
          style={({ pressed }) => [styles.tile, { width: tileW }, pressed && styles.pressed]}
          accessibilityLabel={t.label}>
          <View style={[styles.tileIcon, { backgroundColor: t.color + '22' }]}>
            <Ionicons name={t.icon} size={22} color={t.color} />
          </View>
          <Text variant="caption" color={Palette.text} center numberOfLines={2} style={styles.tileLabel}>
            {t.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function ToolRow({ tool, onPress }: { tool: Tool; onPress: (label: string) => void }) {
  return (
    <Pressable
      onPress={() => onPress(tool.label)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      accessibilityLabel={tool.label}>
      <View style={[styles.rowIcon, { backgroundColor: tool.color + '22' }]}>
        <Ionicons name={tool.icon} size={20} color={tool.color} />
      </View>
      <Text variant="body" color={Palette.text} style={{ flex: 1 }}>
        {tool.label}
      </Text>
      <Ionicons name="chevron-forward" size={18} color={Palette.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Palette.background },
  grabberWrap: { alignItems: 'center', paddingVertical: Spacing.sm },
  grabber: { width: 40, height: 4, borderRadius: Radius.pill, backgroundColor: Palette.border },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.surface,
  },
  body: { paddingHorizontal: Spacing.lg },
  sectionTitle: { marginTop: Spacing.lg, marginBottom: Spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  tile: {
    backgroundColor: Palette.surface,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xs,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  tileIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileLabel: { minHeight: 28 },
  list: { gap: Spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Palette.surface,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.6 },
});
