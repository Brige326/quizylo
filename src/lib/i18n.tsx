import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState } from 'react';

/**
 * Système multilingue léger et extensible.
 * Ajouter une langue = ajouter une entrée dans LANGUAGES et un bloc dans translations.
 * Le français est la langue de référence (repli si une clé manque ailleurs).
 */
export type LangCode = 'fr' | 'en';

export const LANGUAGES: { code: LangCode; label: string }[] = [
  { code: 'fr', label: 'Français' },
  { code: 'en', label: 'English' },
];

type Dict = Record<string, string>;

const fr: Dict = {
  'settings.title': 'Paramètres',
  'settings.account': 'Compte',
  'settings.myInfo': 'Mes informations',
  'settings.subscription': 'Abonnement',
  'settings.free': 'Gratuit',
  'settings.aiDiscussions': 'IA & discussions',
  'settings.aiMemory': "Mémoire de l'IA",
  'settings.deleteAll': 'Supprimer toutes les discussions',
  'settings.prefs': 'Préférences',
  'settings.language': 'Langue',
  'settings.notifications': 'Notifications',
  'settings.privacyHelp': 'Confidentialité & aide',
  'settings.dataProtection': 'Protection des données',
  'settings.support': "Contacter l'assistance",
  'settings.about': 'À propos',
  'settings.signOut': 'Se déconnecter',
  'settings.signIn': 'Se connecter',
  'settings.notConnected': 'Non connecté',
  'language.title': 'Langue',
  'language.subtitle': "Choisis la langue de l'application.",
  'home.hero': 'Quel est le sujet de ton prochain exam ?',
  'home.placeholder': 'Demande à Quizylo…',
  'menu.previous': 'Discussions précédentes',
  'menu.newChat': 'Nouveau chat',
};

const en: Dict = {
  'settings.title': 'Settings',
  'settings.account': 'Account',
  'settings.myInfo': 'My information',
  'settings.subscription': 'Subscription',
  'settings.free': 'Free',
  'settings.aiDiscussions': 'AI & chats',
  'settings.aiMemory': 'AI memory',
  'settings.deleteAll': 'Delete all chats',
  'settings.prefs': 'Preferences',
  'settings.language': 'Language',
  'settings.notifications': 'Notifications',
  'settings.privacyHelp': 'Privacy & help',
  'settings.dataProtection': 'Data protection',
  'settings.support': 'Contact support',
  'settings.about': 'About',
  'settings.signOut': 'Sign out',
  'settings.signIn': 'Sign in',
  'settings.notConnected': 'Not signed in',
  'language.title': 'Language',
  'language.subtitle': 'Choose the app language.',
  'home.hero': "What's your next exam about?",
  'home.placeholder': 'Ask Quizylo…',
  'menu.previous': 'Previous chats',
  'menu.newChat': 'New chat',
};

const translations: Record<LangCode, Dict> = { fr, en };

const STORAGE_KEY = 'quizylo.lang';

type I18nValue = {
  lang: LangCode;
  setLang: (l: LangCode) => void;
  t: (key: string) => string;
};

const I18nContext = createContext<I18nValue>({
  lang: 'fr',
  setLang: () => {},
  t: (k) => fr[k] ?? k,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<LangCode>('fr');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      if (v && (v === 'fr' || v === 'en')) setLangState(v);
    });
  }, []);

  const setLang = (l: LangCode) => {
    setLangState(l);
    AsyncStorage.setItem(STORAGE_KEY, l).catch(() => {});
  };

  const t = (key: string) => translations[lang][key] ?? fr[key] ?? key;

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
