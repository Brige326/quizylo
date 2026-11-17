// Catégories et sujets (repris à l'identique de la maquette), pour l'écran
// « Voir tous les sujets ». Icône + libellé par sujet, couleur par groupe.
import type { Ionicons } from '@expo/vector-icons';

export type Subject = { key: string; label: string; icon: keyof typeof Ionicons.glyphMap };
export type SubjectGroup = { title: string; color: string; items: Subject[] };

const s = (label: string, icon: keyof typeof Ionicons.glyphMap): Subject => ({
  key: label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-'),
  label,
  icon,
});

export const SUBJECT_GROUPS: SubjectGroup[] = [
  {
    title: 'Sciences',
    color: '#5B8CFF',
    items: [
      s('Informatique', 'laptop'),
      s('Génie Mécanique', 'cog'),
      s('Électrotechnique', 'flash'),
      s('Mathématiques', 'calculator'),
      s('Physique', 'planet'),
      s('Chimie', 'flask'),
      s('Biologie', 'leaf'),
      s('Médecine', 'medkit'),
      s('Odontologie', 'medical'),
      s('Pharmacie', 'bandage'),
      s('Architecture', 'business'),
      s('Génie industriel', 'construct'),
    ],
  },
  {
    title: "Sciences de l'environnement",
    color: '#2DD4BF',
    items: [
      s('Biotechnologie', 'nutrition'),
      s('Sciences de la Terre', 'earth'),
      s('Agroalimentaire', 'restaurant'),
      s('Science des données', 'bar-chart'),
      s('Ingénierie aérospatiale', 'rocket'),
    ],
  },
  {
    title: 'Sciences humaines & sociales',
    color: '#F5B301',
    items: [
      s('Gestion-Administration', 'briefcase'),
      s('Économie', 'cash'),
      s('Finance', 'trending-up'),
      s('Droit', 'book'),
      s('Psychologie', 'happy'),
      s('Sociologie', 'people'),
      s('Médiation culturelle', 'color-palette'),
      s('Sciences politiques', 'megaphone'),
      s('Information-Communication', 'chatbubbles'),
      s("Sciences de l'éducation", 'school'),
      s('Études de communication', 'mic'),
      s('Relations internationales', 'globe'),
      s('Géographie', 'map'),
      s('Histoire', 'hourglass'),
      s('Philosophie', 'bulb'),
      s('INSPE', 'library'),
      s('Marketing', 'pricetags'),
    ],
  },
  {
    title: 'Langues étrangères',
    color: '#A855F7',
    items: [
      s('LLCER allemand', 'language'),
      s('LLCER anglais', 'language'),
      s('Études romanes', 'book'),
      s('Traduction et Interprétation', 'swap-horizontal'),
      s('Linguistique', 'text'),
      s('LLCER chinois', 'language'),
      s('LLCER japonais', 'language'),
      s('LEA', 'briefcase'),
      s('LEA Arabe', 'language'),
    ],
  },
  {
    title: 'Arts & Musique',
    color: '#FF4D8D',
    items: [
      s('Arts plastiques', 'brush'),
      s('Design', 'shapes'),
      s('Production de films et de télévision', 'videocam'),
      s("Histoire de l'art", 'image'),
      s('Graphisme', 'color-wand'),
      s('Arts du spectacle', 'musical-notes'),
    ],
  },
  {
    title: 'Autre',
    color: '#9AA0A6',
    items: [s('Journalisme', 'newspaper'), s('BTS tourisme', 'airplane'), s('Gestion agricole', 'leaf')],
  },
  {
    title: 'EPS & Santé',
    color: '#FF5A5F',
    items: [s('STAPS', 'barbell'), s('Santé publique', 'heart')],
  },
];

export const ALL_SUBJECTS: Subject[] = SUBJECT_GROUPS.flatMap((g) => g.items);
