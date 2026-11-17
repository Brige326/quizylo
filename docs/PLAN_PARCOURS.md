# Espace « Parcours » — Transforme tes fichiers en savoir

Parcours de révision guidé : l'élève choisit une **matière**, importe ses **documents**
(photos, images, PDF), choisit un **format** (quiz / fiche / résumé), une **difficulté** et un
**niveau**, et l'IA (Claude Haiku 5.5, **multimodale**) lit les vrais documents pour produire un
**résumé explicatif** puis le contenu. Pour tous : du collège au doctorat.

Vit dans l'onglet **Parcours** (`src/app/(tabs)/parcours.tsx`, aujourd'hui vide). Réutilise le
visualiseur existant `src/app/revision/[id].tsx` (quiz interactif + correction + score, flashcards,
fiche, résumé) et la base `generated_content`.

## Le parcours (4 étapes)
1. Choisir la **matière** (matières de « Mes cours » + personnalisées).
2. **Ajouter les documents** : importer (caméra/photos/fichiers) et/ou reprendre ceux de « Mes cours ».
3. Choisir le **format** : Quiz · Fiche de révision · Résumé.
4. Choisir **difficulté** (Facile/Moyen/Difficile) + **niveau** (Collège/Lycée/Supérieur).
→ **Générer** : résumé explicatif d'abord, puis quiz corrigé (ou fiche/résumé). Sauvegardé, revisitable.

## Séances
- **P1** ✅ — Fondations IA (multimodale) + données.
- **P2** ✅ — Assistant écrans 1 & 2 : matière, puis ajout/import des documents (+ récap).
- **P3** ✅ — Assistant écrans 3 & 4 : format + difficulté + niveau, Générer (réel).
- **P4** ✅ — Historique des parcours (onglet Parcours) + formats flashcards & examen exposés.
- **P5** — Finitions pro : historique par matière, regénérer, score conservé, états vides, QA multi-niveaux.

## Journal

### P1 ✅ — Fondations IA multimodale + données
- **Base** : migration `generated_content_parcours_fields` → colonnes `difficulty`, `level`,
  `summary` (toutes nullable) ajoutées à `generated_content`. Appliquée par Claude. Vérifiée.
- **Edge Function `generate-content` v4 (multimodale)** : lit les documents de l'élève depuis le
  bucket privé `documents` (service role), construit des blocs Claude (`image` base64 pour
  JPEG/PNG/GIF/WebP, `document` base64 pour PDF), formats non supportés (HEIC…) ignorés proprement.
  Accepte `{ kind, difficulty, level, subjectLabel, attachments[], context?, title? }`. Prompts
  adaptés à la difficulté **et** au niveau (collège → doctorat). Renvoie
  `{ configured, kind, difficulty, level, title, summary, payload, meta }`. Garde-fous : clé absente
  → `configured:false` ; aucune source → `error:no_source` ; erreurs HTTP → codes clairs
  (`bad_key`, `rate_limited`, `bad_request`…). Modèle unique `claude-haiku-5-5`. Limites : 20 fichiers,
  ~24 Mo/requête. Déployée (v4).
- **Contrat app (`src/lib/courses.ts`)** : types `Difficulty`, `Level` ; `GenItem` et `GenerateResult`
  étendus (difficulty/level/summary) ; nouvelle fonction `generateFromDocuments(...)` ;
  `saveGeneratedContent` accepte difficulty/level/summary et `chapterId` optionnel. L'ancienne
  `generateContent(kind, context)` reste valable (rétrocompat).
- **Vérifs** : migration OK ; esbuild (fonction) OK ; `tsc` app = 0.
- **Non testable d'ici** : l'appel multimodal réel (mon environnement ne joint pas `supabase.co`) →
  se confirmera en P4 sur l'iPhone, quand le parcours déclenchera la génération. Aucune UI modifiée en P1.

### P2 ✅ — Assistant, écrans 1 & 2
- Nouvel écran `src/app/parcours/nouveau.tsx` (modale depuis le bas), ouvert par le bouton
  « Créer un parcours » de l'onglet Parcours (plus de `comingSoon`).
- Barre de progression 4 étapes. **Étape 1** : choix de la matière (depuis `listSubjects`, pastille
  couleur + nb de chapitres ; état vide → CTA « Aller à Mes cours »). **Étape 2** : ajout des documents
  — import (caméra/photos/PDF via ImagePicker/DocumentPicker, images converties en JPEG, upload via
  `uploadParcoursDocument` sans exiger de chapitre) **et** sélection depuis « Mes cours »
  (`listSubjectDocuments`). Liste « Sélectionnés (n) » avec retrait, CTA actif dès 1 document.
- Helpers ajoutés à `courses.ts` : `uploadParcoursDocument` (upload sans ligne documents/chapitre) et
  `listSubjectDocuments` (images+PDF d'une matière, tous chapitres).
- Auto-test web (captures) : étape 1, étape 2, et état sélectionné → rendu conforme, 0 erreur console.
  `tsc` = 0. Bloc de démo (PREV) retiré avant commit (vérifié, aucun résidu).
- Non couvert ici : le « Continuer » ouvre un `comingSoon` (format/difficulté/niveau = P3) ; l'import
  réel (caméra/fichiers) et l'upload se valident sur l'iPhone.

### P3 ✅ — Écrans 3 & 4 + génération réelle
- **Étape 3 (format)** : cartes Quiz / Fiche de révision / Résumé (icône + description).
- **Étape 4 (difficulté & niveau)** : segments Facile/Moyen/Difficile et Collège/Lycée/Supérieur,
  bouton « Générer mon support ».
- **Générer** : appelle `generateFromDocuments` (IA multimodale), overlay « Génération en cours… »,
  puis `saveGeneratedContent` (avec difficulté/niveau/résumé) et ouverture du visualiseur
  `/revision/[id]`. Garde-fous honnêtes : `configured:false` → message « IA non configurée » ;
  codes d'erreur → messages clairs (`friendlyError`) ; jamais de faux contenu.
- **Visualiseur enrichi** (`revision/[id]`) : pour un **quiz**, le **résumé explicatif** s'affiche
  d'abord (« Le point sur le cours » + bouton « Commencer le quiz ») ; pour une **fiche**, le résumé
  sert d'intro. Le quiz interactif (réponse → correction → explication → score) est réutilisé tel quel.
- Auto-test web : écrans 3 & 4 capturés (format, segments, bouton) → conformes, 0 erreur. `tsc` = 0.
  PREV retiré (aucun résidu).
- **Non testable d'ici** : la génération réelle (IA + documents + crédit) et le rendu du résultat →
  à confirmer sur l'iPhone (c'est le moment « bout-en-bout » du parcours).

### P4 ✅ — Historique + formats complets
- **Onglet Parcours = historique** : liste de tous les parcours générés (plus récent d'abord),
  rechargée à chaque focus. Chaque ligne : icône par format, titre, sous-titre
  « format · difficulté · niveau · date » → ouvre `/revision/[id]`. Bouton « Créer » en tête.
  État vide conservé (CTA « Créer un parcours »). Helper `listUserGeneratedContent(userId)`.
- **Formats complétés** : le wizard expose désormais les 5 formats — Quiz, Fiche, Résumé,
  **Cartes mémoire** et **Examen blanc** (déjà gérés par l'IA et le visualiseur).
- Auto-test web : onglet historique peuplé capturé (3 parcours, badges, date) → conforme, 0 erreur.
  `tsc` = 0. Patchs de capture (auth web + données démo) retirés, aucun résidu.
- Reste pour P5 : suppression depuis la liste, regénérer en un geste, filtres par matière, QA device.
