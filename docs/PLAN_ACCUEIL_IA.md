# Quizylo — Espace Accueil / Chat IA (d'après la maquette Knowunity)

Reproduire l'expérience : Accueil (chat IA) + « Voir tous les sujets » + « Outils »,
adaptée à Quizylo (mascotte et branding à nous, pas ceux de la référence).

## Les 3 écrans

1. **Accueil / Chat** : mascotte + « Quel est le sujet de ton prochain exam ? » +
   puces de matières rapides + « Voir tous les sujets » + puces d'action + barre de
   saisie (+, caméra, micro). ⚠️ existait déjà en grande partie (chat, mascotte,
   actions).
2. **Voir tous les sujets** : recherche + catégories groupées + multi-sélection +
   « Choisis-en au moins 1 » → sélection renvoie au chat.
3. **Outils** : sources d'import + modes de réponse + outils d'entraînement + prépa.

## Catégories de sujets (identiques à la maquette)

- **Sciences** : Informatique, Génie Mécanique, Électrotechnique, Mathématiques,
  Physique, Chimie, Biologie, Médecine, Odontologie, Pharmacie, Architecture,
  Génie industriel
- **Sciences de l'environnement** : Biotechnologie, Sciences de la Terre,
  Agroalimentaire, Science des données, Ingénierie aérospatiale
- **Sciences humaines & sociales** : Gestion-Administration, Économie, Finance, Droit,
  Psychologie, Sociologie, Médiation culturelle, Sciences politiques,
  Information-Communication, Sciences de l'éducation, Études de communication,
  Relations internationales, Géographie, Histoire, Philosophie, INSPE, Marketing
- **Langues étrangères** : LLCER allemand, LLCER anglais, Études romanes,
  Traduction et Interprétation, Linguistique, LLCER chinois, LLCER japonais, LEA,
  LEA Arabe
- **Arts & Musique** : Arts plastiques, Design, Production de films et de télévision,
  Histoire de l'art, Graphisme, Arts du spectacle
- **Autre** : Journalisme, BTS tourisme, Gestion agricole
- **EPS & Santé** : STAPS, Santé publique
- + « Propose un sujet »

## Outils (identiques à la maquette)

- **Importer** : Caméra · Photos · Fichiers · YouTube
- **Mode de réponse** : Coache-moi · Résoudre · On se concentre
- **Entraîne-toi pour contrôles & exams** : Quiz-moi · Créer des cartes mémoire ·
  Vocabulaire · Créer un examen blanc · Créer un plan de révision
- **Prépare tes cours** : Explique · Trouve des fiches de révision ·
  Écrire une dissertation · Résumer · Créer une image · Aide-mémoire

## Plan

- **Phase A — Accueil**
  - **S1** ✅ : puces de matières rapides (Informatique, Mathématiques, Médecine,
    Physique, Biologie) + « Voir tous les sujets → » sous le hero, dans l'accueil
    existant. Auto-test web (rendu conforme à la maquette, 0 erreur, capture).
    `tsc` = 0, export web OK.
- **Phase B — Sujets**
  - **S2** ✅ : écran `/sujets` « Voir tous les sujets » — recherche, toutes les
    catégories (data `src/lib/subjects.ts`, icône/couleur par sujet), multi-sélection
    (puce cochée = couleur du groupe), « Propose un sujet », bouton bas
    « Choisis-en au moins 1 » → « Continuer (N) ». Lien « Voir tous les sujets » de
    l'accueil câblé. Auto-test web : écran rendu + 2 sélections + compteur (capture),
    0 erreur. `tsc` = 0, export web OK. (Mémorisation + routage chat = S3.)
  - **S3** ✅ : mémorisation + chat. Migration `profiles.subjects text[]` ;
    `getUserSubjects`/`saveUserSubjects`. `/sujets` présélectionne les sujets déjà
    choisis et les enregistre à « Continuer » → retour au chat. L'accueil affiche les
    **matières choisies** comme puces (sinon la sélection par défaut), rechargées au
    focus ; taper une puce **pré-remplit le chat** (« Explique-moi les bases en … »)
    et donne le focus (réponse dès que l'IA est branchée). RLS vérifiée. `tsc` = 0,
    export web OK.
- **Phase C — Outils**
  - **S4** ✅ : écran `/outils` (modale depuis le bas), ouvert par le « + » de la
    barre d'écriture. Mêmes sections/boutons que la maquette : **Importer**
    (Caméra/Photos/Fichiers/YouTube, tuiles), **Mode de réponse**
    (Coache-moi/Résoudre/On se concentre, tuiles), **Entraîne-toi pour contrôles &
    exams** (Quiz-moi, Cartes mémoire, Vocabulaire, Examen blanc, Plan de révision,
    en lignes) et **Prépare tes cours** (Explique, Fiches de révision, Dissertation,
    Résumer, Créer une image, Aide-mémoire, en lignes). Chaque bouton = `comingSoon`
    honnête en attendant le branchement IA (S5/S6). Auto-test web : rendu conforme
    (2 captures), 0 erreur console. `tsc` = 0, export web OK.
- **Phase D — IA**
  - **S5** : chat IA réel via Edge Function Supabase (clé jamais exposée).
  - **S6** : outils actifs (Quiz, Résumé, Cartes…) = prompts vers l'IA.
  - **S7** : finitions (points/streak, historique), QA.

## Décisions en attente
- Clé API IA (OpenAI/Anthropic…) → secret Supabase.
- « Créer une image » et « YouTube » : activés en dernier.
