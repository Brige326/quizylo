// ⚠️ ÉCRAN DE TEST JETABLE — Séance 2 (Phase 0).
// But : valider la faisabilité du moteur d'édition TenTap/TipTap (WebView)
// sur l'iPhone, sans toucher au vrai éditeur de leçons (src/app/lecon/[id].tsx).
// Sera supprimé une fois la décision prise. Ne pas construire de produit ici.

import { Ionicons } from '@expo/vector-icons';
import { RichText, Toolbar, useEditorBridge } from '@10play/tentap-editor';
import { router } from 'expo-router';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Palette } from '@/constants/theme';

// Contenu initial volontairement long : on veut pouvoir tester
// « modifier la toute dernière ligne d'un long document sans perdre le curseur ».
const INITIAL = `
<h1>Titre de niveau 1</h1>
<p>Paragraphe normal. On teste <strong>gras</strong>, <em>italique</em>, <u>souligné</u> et <s>barré</s> au sein d'une même ligne.</p>
<h2>Sous-titre de niveau 2</h2>
<ul><li>Puce une</li><li>Puce deux</li><li>Puce trois</li></ul>
<ol><li>Étape une</li><li>Étape deux</li></ol>
<blockquote>Une citation pour vérifier le style.</blockquote>
<p>Ligne 1 de remplissage pour pousser le contenu vers le bas.</p>
<p>Ligne 2 de remplissage.</p>
<p>Ligne 3 de remplissage.</p>
<p>Ligne 4 de remplissage.</p>
<p>Ligne 5 de remplissage.</p>
<p>Ligne 6 de remplissage.</p>
<p>Ligne 7 de remplissage.</p>
<p>Ligne 8 de remplissage.</p>
<p>Ligne 9 de remplissage.</p>
<p>Ligne 10 de remplissage.</p>
<p><strong>DERNIÈRE LIGNE</strong> — tape ici pour vérifier que le curseur reste visible au-dessus du clavier.</p>
`;

export default function EditorLabScreen() {
  const insets = useSafeAreaInsets();

  const editor = useEditorBridge({
    autofocus: false,
    avoidIosKeyboard: true,
    initialContent: INITIAL,
  });

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* En-tête de test */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={Palette.text} />
        </Pressable>
        <View style={styles.headerTexts}>
          <Text style={styles.title}>🧪 Test éditeur (TenTap)</Text>
          <Text style={styles.subtitle}>Écran jetable — Phase 0 / Séance 2</Text>
        </View>
      </View>

      {/* L'éditeur riche (WebView + TipTap, HTML bundlé, pas de serveur requis) */}
      <RichText editor={editor} />

      {/* Barre d'outils de mise en forme, collée au-dessus du clavier */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
        style={styles.kav}
      >
        <Toolbar editor={editor} />
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Palette.border,
  },
  back: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTexts: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: Palette.text,
  },
  subtitle: {
    fontSize: 12,
    color: Palette.textMuted,
    marginTop: 1,
  },
  kav: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
});
