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
  - **S4** : images (photo/galerie multi, HEIC→JPEG, miniatures, visionneuse + zoom).
  - **S5** : documents (PDF affiché parfaitement ; autres formats = carte + ouverture).
  - **S6** : miniatures/aperçus (1re page PDF) + visionneuse unifiée avec swipe.
- **Phase D — Organisation**
  - **S7** : recherche, filtres, tri, renommer, favori, supprimer, réorganiser.
  - **S8** : finitions UX + nettoyage final des dépendances.
- **Phase E — Qualité**
  - **S9** : QA + test appareil.

Une séance = un objectif ; dev → test → STOP → validation.
