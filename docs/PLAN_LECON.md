# Quizylo — Plan de la leçon (ressources + note simple)

Document de suivi. Remplace l'ancien plan d'éditeur riche (abandonné le 17/11/2026).

## Vision

Une leçon n'est pas un document qu'on rédige, mais **un espace qui rassemble le
matériel de l'étudiant et le lui fait retrouver en un coup d'œil** :
- importer des **documents** (PDF, Office…) et des **images** (photo ou galerie) ;
- une **note texte ultra-simple** (un seul champ, aucune mise en forme) ;
- si clair et pratique que l'étudiant **retrouve n'importe quelle ressource
  instantanément**.

Améliorations retenues :
1. **Miniatures pour tout** (aperçu image, 1re page PDF, icône par type).
2. **Visionneuse plein écran unifiée** : zoom pour les images, défilement pour les
   PDF, swipe entre ressources.
3. **Retrouver facilement** : recherche, filtres (Tout/Images/Documents), tri,
   renommer, favori, réorganiser.
4. **Honnêteté formats** : images + PDF affichés parfaitement dans l'app ; Office et
   autres formats stockés proprement (carte type+nom+taille) et ouverts sans friction ;
   aperçu intégré de ces formats = conversion PDF, étape dédiée plus tard.

## Décisions validées (17/11/2026)

- Formats non-image/non-PDF : carte + ouverture propre d'abord ; conversion PDF plus tard.
- Anciennes colonnes `blocks`/`content` : **gardées en base** (réversible), non affichées.
- Note texte : **un seul champ simple** par leçon.

## Plan

- **Phase A — Nettoyage**
  - **S1** ✅ : retrait de tout l'éditeur riche (TenTap/bundle web, maths, chimie,
    graphiques, dessin, polices, `/lab`, dépendances). Écran leçon rétabli en version
    simple par blocs (provisoire). Données en base intactes. `tsc` = 0, export web OK.
- **Phase B — La leçon simple**
  - **S2** ✅ : modèle de données. Migration `lesson_note_and_attachment_favorite`
    (colonne `lessons.note`, colonne `lesson_attachments.favorite`). Reprise des
    données existantes : notes depuis les blocs texte, médias (image/pdf) vers
    `lesson_attachments` (idempotent, sans doublon). Couche `courses.ts` :
    `saveLessonNote`, `listLessonAttachments`, `uploadAndAddAttachment`,
    `removeLessonAttachment`, `renameLessonAttachment`, `setAttachmentFavorite`,
    type `LessonAttachment`. `tsc` = 0.
  - **S3** ✅ : écran leçon v2. En-tête (retour, badge d'enregistrement, bouton +),
    **titre** + **note texte simple** (autosave), section **Ressources** = liste de
    cartes (miniature image / icône par type, nom, type, favori ⭐, menu ⋯), **état
    vide** soigné avec bouton Ajouter. Ajout (photo / images multi / documents),
    ouverture (image plein écran, PDF in-app iOS, autres via le système), favori,
    suppression. Auto-test visuel web (états avec ressources + vide, 0 erreur,
    captures). `tsc` = 0, export web OK.
- **Phase C — Import & affichage parfait**
  - **S4** ✅ : images. Conversion **HEIC→JPEG** à l'import (expo-image-manipulator,
    borne à 2400px) pour un affichage correct partout ; prise photo + import multi.
    **Visionneuse galerie** plein écran (ScrollView horizontal paginé = swipe entre
    images, zoom par pincement via `maximumZoomScale` iOS, bouton fermer). Auto-test
    web : galerie rendue (image plein écran + fermer, 0 erreur, capture). `tsc` = 0,
    export web OK.
  - **S5** ✅ : documents. Cartes **typées** (PDF rouge, Word bleu, Excel vert,
    PowerPoint orange, texte/archive gris, audio violet) avec icône, libellé et
    **taille du fichier** → reconnaissance immédiate. PDF affiché dans l'app (iOS),
    autres formats ouverts via le système. Auto-test web : 6 types de cartes rendus
    (capture), 0 erreur. `tsc` = 0, export web OK. (Aperçu 1re page PDF = S6.)
  - **S6** ✅ : aperçus. **Bascule liste/grille** : la grille montre de vraies
    miniatures d'images + tuiles typées (couleur par type) avec favori en overlay —
    parcours visuel et pratique. Visionneuse galerie (swipe + zoom) déjà en place.
    Auto-test web : vue grille rendue (miniatures + tuiles, 0 erreur, capture).
    `tsc` = 0, export web OK. **Aperçu 1re page PDF reporté** : non réalisable
    proprement en Expo Go (nécessiterait pdf.js dans une WebView cachée ou un build
    de dev) — décision à prendre avec l'utilisateur ; PDF = tuile rouge + ouverture.
- **Phase D — Organisation**
  - **S7** ✅ : organisation. **Recherche** par nom, **filtres** (Tout / Images /
    Documents / Favoris), **tri** (Récent / Nom), **renommer** (modale), favori et
    suppression déjà en place. Message « Aucun résultat » si filtre/recherche vide.
    Auto-test web : barre + filtres rendus, recherche « fiche » → 1 résultat (captures),
    0 erreur. `tsc` = 0, export web OK. (Réorganisation manuelle = optionnel plus tard.)
  - **S8** ✅ : finitions UX. Placeholders de **chargement** des miniatures (spinner
    pendant la résolution de l'URL signée), bouton **« Réinitialiser »** quand une
    recherche/filtre ne donne rien, **libellés d'accessibilité** sur les cartes et
    tuiles. Dépendances déjà nettoyées au pivot (S1). `tsc` = 0, export web OK.
- **Phase E — Qualité**
  - **S9** : QA + test appareil.

Une séance = un objectif ; dev → test → STOP → validation.
