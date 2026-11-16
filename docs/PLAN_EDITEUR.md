# Quizylo — Plan de l'éditeur de leçons

Document de suivi (fil conducteur entre les séances). Mis à jour à chaque étape.

## Vision

Transformer l'éditeur de leçons en un **traitement de texte éducatif et scientifique**
professionnel : mise en forme riche, tableaux, mathématiques, notation scientifique,
images robustes, pièces jointes, et intégration de l'IA de révision — tout en restant
simple à utiliser pour un collégien/lycéen, et cohérent entre mobile et web.

## Décision n°1 — Moteur d'édition

**Recommandation : `@10play/tentap-editor` (TenTap)** = TipTap/ProseMirror rendu dans
une WebView.

Raisons : seule option qui couvre texte riche en ligne + tableaux + maths + nodes
custom *et* unifie le rendu mobile/web. Tourne dans le setup actuel **sans nouveau
build natif** (réutilise `react-native-webview`, déjà présent et fonctionnel via le
lecteur PDF). Le HTML de l'éditeur est **bundlé** dans le paquet → aucun serveur requis.

Alternatives écartées : blocs natifs (plafond : pas de mise en forme en ligne, pas de
tableaux/maths) ; `react-native-pell-rich-editor` (ancien, cul-de-sac) ; Lexical-RN
(immature).

> Statut : **moteur auto-validé**. Le bundle TipTap 3.11 (celui qui tourne dans la
> WebView) a été rendu et piloté dans un navigateur headless : titres, gras/italique/
> barré, listes, citation, saisie et mise en forme OK (0 erreur). Reste à confirmer
> sur appareil le pont React Native ↔ WebView et le clavier (non testables hors iOS/
> simulateur) — ce sera vérifié au moment de l'intégration réelle, pas en te renvoyant
> des tests manuels.

## Architecture cible

- **Écran leçon** = coquille native (en-tête, onglets, sauvegarde, actions) + **éditeur
  TenTap** au centre.
- **Barre d'outils contextuelle** au-dessus du clavier (couplée à
  `react-native-keyboard-controller`, déjà installé).
- **Insertions riches** (image, tableau, équation, graphique, dessin, pièce jointe) =
  nodes TipTap, chacune avec son éditeur/visionneuse.
- **Médias** : upload Storage privé (bucket `documents`), référencés par chemin +
  URL signée dans le document et dans `lesson_attachments`.
- **Lecture (révision)** et **édition** partagent le même document `content`.

## Modèle de données (appliqué — migration `add_lesson_content_and_attachments`)

`public.lessons` (existant) + ajout :
- `content jsonb` **nullable** — document riche TipTap/ProseMirror. Inerte tant que
  l'éditeur n'est pas livré ; `blocks` reste la source actuelle.

Nouvelle table `public.lesson_attachments` :

| colonne | type | note |
|---|---|---|
| id | uuid PK | |
| lesson_id | uuid | FK → lessons, `on delete cascade` |
| user_id | uuid | RLS |
| kind | text | `image \| pdf \| document \| audio \| other` |
| storage_path | text | chemin dans le bucket privé |
| mime | text | |
| name | text | |
| size_bytes | bigint | |
| meta | jsonb | défaut `{}` |
| position | integer | ordre d'affichage |
| created_at | timestamptz | |

RLS per-utilisateur (`auth.uid() = user_id`) sur select/insert/update/delete,
identique au motif de `lessons`.

## Plan de migration des données (blocs → content)

**Sans perte, réversible.** À la première ouverture d'une leçon :
- si `content` est null **et** `blocks` non vide → construire `content` à partir de
  `blocks`, l'enregistrer, **laisser `blocks` intact** ;
- sinon → utiliser `content`.

Conversion `blocks[] → document TipTap` :
- `heading` → `heading` niveau 1 ; `subheading` → `heading` niveau 2 ;
- `text` → `paragraph` (sauts de ligne → paragraphes / `hardBreak`) ;
- `image` → node image (chemin Storage + URL signée) ;
- `pdf` → node pièce jointe + ligne dans `lesson_attachments` ;
- `color` / `font` par bloc → marques best-effort (`textStyle` couleur, police).

`blocks` n'est jamais détruit : rollback possible tant que la bascule n'est pas validée.

## Phasage

- **Phase 0 — Décision & socle** : S1 audit ✅ · S2 prototype TenTap ✅ (test appareil en
  attente) · S3 architecture + modèle de données ✅ (migration appliquée).
- **Phase 1 — Clavier & socle d'écriture** : réglage clavier (keyboard-controller),
  curseur/sélection, tests documents longs.
- **Phase 2 — Bascule moteur** ✅ (socle) : TenTap intégré dans `lecon/[id].tsx`
  (onglet Notes), migration blocs→content à l'ouverture, autosave du document,
  barre d'outils TenTap. Reste : polices custom, insertion de médias dans le flux,
  undo/recherche avancés. Garde-fou : drapeau `RICH_EDITOR` (retour instantané à
  l'ancien éditeur), `blocks` jamais détruit.
- **Phase 3 — Images robustes** (en cours) : ✅ insertion d'images DANS le flux du
  texte (redimension + data URI embarqué, privé par défaut, aucune URL qui expire).
  Reste : conversion de formats exotiques (HEIC/AVIF/SVG), plein écran/zoom dans
  l'éditeur, bascule vers des nœuds `path` + URL signées si le poids des data URI
  devient un souci.
- **Phase 4 — Tableaux**.
- **Phase 5 — Sciences** : maths (KaTeX/MathLive), chimie, graphiques.
- **Phase 6 — Pièces jointes & dessin** (PDF/DOCX/CSV, Skia).
- **Phase 7 — Fiabilité** : autosave/brouillon local, synchro/conflits, perfs/sécurité.
- **Phase 8 — IA** : exploitation de `content` (fiches/quiz/flashcards).
- **Phase 9 — QA** : iOS/Android/web, perfs, accessibilité.

Le détail (objectif, fichiers, dépendances, risques, tests, critères) est produit **au
début de chaque séance**, pas d'avance.

## Décisions en attente de l'utilisateur

1. **Moteur** : valider TenTap après test du prototype (Séance 2).
2. **Development build** : OK pour passer d'Expo Go à un build de dev si une lib future
   l'exige (Skia...) ? (TenTap, lui, n'en a pas besoin.)
3. **Cible web** : bientôt (influence les choix) ou plus tard ?
4. **Périmètre v1** : socle (clavier + écriture riche + images + autosave + IA) d'abord,
   avancé (tableaux/maths/graphiques) ensuite ?
5. **Clé IA** : fournie en Phase 8 (posée en secret Supabase, jamais affichée).

## Journal des séances

- **S1 — Audit** : diagnostic de l'éditeur par blocs (plafond fonctionnel), cause du
  problème clavier (keyboard-controller inexploité), reco moteur.
- **S2 — Prototype** : `@10play/tentap-editor` installé ; écran de test jetable
  `src/app/lab/editor.tsx` + bandeau d'accès temporaire ; compat React 19/RN 0.88/webview
  14 confirmée ; `tsc` = 0 ; poussé. Test appareil en attente.
- **S3 — Modèle de données** : migration `add_lesson_content_and_attachments` appliquée
  (colonne `content`, table `lesson_attachments` + RLS). Plan de migration blocs→content
  défini.
- **S4 — Validation moteur + convertisseur** : moteur TipTap auto-testé en navigateur
  (rendu + formatage OK). `src/lib/lessonContent.ts` : convertisseur pur
  `blocksToDoc()` (titres, texte multi-lignes→hardBreak, couleur→mark, image, pdf→
  attachment, police, cas vides). **13 tests unitaires au vert**, `tsc` = 0.
- **S5 — Intégration Phase 2** : `src/components/LessonRichEditor.tsx` (TenTap +
  autosave `content` + migration blocs→content au montage, `blocks` préservé) ;
  branché dans `lecon/[id].tsx` derrière `RICH_EDITOR` ; `saveLessonContent` +
  `Lesson.content` ajoutés à la couche données ; bouton d'ajout de média conservé
  dans l'en-tête. `tsc` = 0 ; **export web complet réussi** (intégration sans casse).
  Rendu natif iOS à voir à l'ouverture sur appareil.
- **S6 — Images dans le flux** : `ImageBridge` (déjà dans TenTapStartKit) +
  `expo-image-manipulator` (redimension à 1400px, JPEG qualité 0.6, data URI).
  `LessonRichEditor` expose `insertImage()` ; l'écran câble appareil photo /
  galerie → image insérée dans le texte. Choix **privé par défaut** (data URI
  dans le document, même RLS), pas d'URL signée qui expire. Auto-test éditeur :
  insertion → nœud image dans le JSON + rendu DOM + data URI préservé. `tsc` = 0,
  export web OK. Limite assumée : poids des data URI (à surveiller ; bascule
  possible vers nœuds `path` plus tard).
- **S7 — Couleur du texte** : barre de couleurs dans l'éditeur
  (`editor.setColor()` / `unsetColor()`, palette `LESSON_TEXT_COLORS`) — parité
  avec l'ancien éditeur. La barre TenTap par défaut couvre déjà
  gras/italique/souligné/barré/titres/listes/cases à cocher/citation/code/lien/
  undo-redo. Auto-test moteur : sélection → `setColor` → `<span style="color…">`.
  `tsc` = 0, export web OK.

- **S8 — Surlignage** : le bandeau de couleurs bascule entre **couleur du texte**
  et **surligneur** (`setHighlight()` / `unsetHighlight()`). Un seul bandeau, un
  bouton de mode (Texte / Surligne). Auto-test moteur : `setHighlight` applique
  bien un `<mark>` ; `unsetHighlight` OK. `tsc` = 0, export web OK.

- **S9 — Finitions ergonomie** : lien & image déjà dans la barre par défaut (rien à
  faire). Ajout d'un **placeholder** (« Commence à écrire ta leçon… ») et du **focus
  auto** quand la leçon est vide (clavier + barre tout de suite). Auto-test moteur :
  placeholder rendu sur éditeur vide. `tsc` = 0, export web OK.

## Ce qui exige un bundle d'éditeur web personnalisé (phase d'infra à part)

Tableaux, mathématiques (KaTeX/MathLive), chimie, graphiques, polices custom,
dessin : non fournis par le bundle TenTap par défaut. Il faudra builder et héberger
un bundle TipTap sur-mesure (extensions supplémentaires) passé en `customSource`.
Chantier distinct à planifier avant Phase 4/5.

### Pipeline de build du bundle custom (plan)

1. Entrée web de l'éditeur avec le runtime TenTap (`useTenTap` + `EditorContent`
   de `@10play/tentap-editor/web`), kit par défaut + extensions voulues
   (d'abord Table/TableRow/TableHeader/TableCell).
2. Un **bridge Table** (BridgeExtension : `insertTable`, add/delete row/col,
   messages d'état) côté web ET côté natif, pour piloter le tableau depuis la barre.
3. Bundler l'entrée web en **HTML autonome** (JS inliné) → chaîne `customSource`.
4. Côté RN : `useEditorBridge({ customSource, bridgeExtensions: [...kit, TableBridge] })`.
5. Boutons natifs (insérer tableau, +/- ligne/colonne).
6. Étendre le convertisseur/`content` pour stocker les nœuds `table` (round-trip).
7. Tests : rendu + insertion en navigateur (auto) ; rendu natif sur appareil.

**S10 — Dé-risquage tableaux** : faisabilité prouvée en navigateur (TipTap Table :
insertion 3×3, en-tête, rendu propre, nœud `table` dans le JSON — capture). Extensions
`@tiptap/extension-table*` installées.

**S11 — Bundle custom, étape 1 (pipeline + tableaux rendus)** : ✅ étapes 1 et 3 du
pipeline. `editor-web/index.tsx` (runtime `@10play/tentap-editor/web` : `useTenTap`
+ `TenTapStartKit` + extensions Table) ; `scripts/build-editor.mjs` (esbuild →
HTML autonome) ; artefact généré `src/editor-web/editorHtml.ts` (~930 Ko).
`editor-web` exclu du typecheck de l'app. **Auto-test** : l'artefact généré, amorcé
via le vrai boot config TenTap avec un tableau en contenu initial, **boote et rend le
tableau** dans un navigateur (ProseMirror + table + cellules, 0 erreur — capture).
**S12 — Tableaux câblés dans l'app** : plutôt qu'un bridge Table complet, l'éditeur
web expose son instance (`window.__quizyloEditor`) et le natif pilote l'insertion via
`editor.injectJS()` (CoreBridge). `LessonRichEditor` charge le bundle sur-mesure
(`customSource`, drapeau `CUSTOM_BUNDLE`) et expose `insertTable()` ; bouton « Insérer
un tableau » dans le menu d'ajout. Round-trip `content` automatique (les nœuds `table`
passent par `getJSON`/`setContent`). Auto-test navigateur : éditeur exposé → chaîne
`insertTable` → tableau 3×3 inséré (0 erreur). `tsc` = 0, export web OK.
**S13 — Édition fine des tableaux** : `tableAction()` (addRowAfter, addColumnAfter,
deleteRow, deleteColumn, deleteTable) via `injectJS` ; sous-menu « Modifier le
tableau… ». Auto-test navigateur sur le bundle de l'app : insérer [3,9] → +ligne
[4,12] → +colonne [4,16] → -ligne [3,12] → -colonne [3,9] → supprimer [0,0], 0 erreur.
`tsc` = 0.

**S14 — Mathématiques (KaTeX)** : extension `@tiptap/extension-mathematics` ajoutée
au bundle ; **KaTeX inliné** (CSS + 20 polices woff2 en base64) dans le build pour un
éditeur auto-contenu ; `insertMath(latex, block)` via `injectJS`
(`insertInlineMath`/`insertBlockMath`) ; invite LaTeX (iOS) « Insérer une formule ».
Auto-test navigateur : formules inline + bloc **rendues par KaTeX** avec les bonnes
polices (exposants, intégrale, fraction — capture), 0 erreur. `tsc` = 0, export web OK.
Bundle `editorHtml` ~1,5 Mo. Reste : saisie de formule sur Android (modale custom),
test appareil.

**S15 — Chimie (mhchem)** : extension `katex/contrib/mhchem` ajoutée au bundle →
`\ce{...}` rendu par le même moteur KaTeX. Entrée « Insérer une formule chimique »
(enrobe la saisie dans `\ce{}`). Auto-test navigateur : `2H2 + O2 -> 2H2O` et `CO2`
rendus (indices + flèche de réaction, capture), 0 erreur. `tsc` = 0, export web OK.

**S16 — Saisie formules multiplateforme** : modale custom (RN `Modal` + `TextInput`,
iOS + Android) remplaçant l'`Alert.prompt` iOS-only pour maths et chimie. `tsc` = 0,
export web OK.

### Limite de test (honnête)

Le rendu natif dans la WebView iOS (Expo Go sur iPhone) n'est pas testable depuis
l'environnement de dev : pas d'appareil ni de simulateur iOS, et le moteur WebKit de
Playwright (équivalent iOS) ne peut pas être téléchargé ici (proxy). Tous les tests
sont donc faits dans Chromium (mêmes standards web) + `tsc` + export web + captures.
Le seul écart résiduel = le rendu réel sur l'iPhone, à constater sur l'appareil.
