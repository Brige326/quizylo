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
  - **S2** : écran « Voir tous les sujets » (recherche + catégories + multi-sélection).
  - **S3** : sélection d'un sujet → chat ; mémorisation des sujets choisis.
- **Phase C — Outils**
  - **S4** : écran « Outils » (mêmes sections/boutons).
- **Phase D — IA**
  - **S5** : chat IA réel via Edge Function Supabase (clé jamais exposée).
  - **S6** : outils actifs (Quiz, Résumé, Cartes…) = prompts vers l'IA.
  - **S7** : finitions (points/streak, historique), QA.

## Décisions en attente
- Clé API IA (OpenAI/Anthropic…) → secret Supabase.
- « Créer une image » et « YouTube » : activés en dernier.
