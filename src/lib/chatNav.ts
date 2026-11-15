/**
 * Canal direct entre le menu et l'écran d'accueil (le chat).
 * Plus fiable que les paramètres de navigation à travers une modale + un groupe d'onglets :
 * le menu émet une action, l'accueil (toujours monté) la reçoit et réagit immédiatement.
 */
export type ChatNavAction =
  | { type: 'open'; id: string }
  | { type: 'new' }
  | { type: 'deleted'; id: string };

const listeners = new Set<(a: ChatNavAction) => void>();

export function openConversation(id: string) {
  listeners.forEach((l) => l({ type: 'open', id }));
}

export function startNewChat() {
  listeners.forEach((l) => l({ type: 'new' }));
}

export function notifyConversationDeleted(id: string) {
  listeners.forEach((l) => l({ type: 'deleted', id }));
}

export function subscribeChatNav(listener: (a: ChatNavAction) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
