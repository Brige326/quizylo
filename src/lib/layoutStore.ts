/**
 * Petit store partagé pour la hauteur réelle de la TabBar du bas.
 * Mesurée par la TabBar (onLayout) et lue par l'accueil pour caler
 * la barre d'écriture pile au-dessus du clavier, sans saut.
 */
let tabBarHeight = 0;
const listeners = new Set<(h: number) => void>();

export function setTabBarHeight(h: number) {
  if (h > 0 && Math.abs(h - tabBarHeight) > 0.5) {
    tabBarHeight = h;
    listeners.forEach((l) => l(h));
  }
}

export function getTabBarHeight() {
  return tabBarHeight;
}

export function subscribeTabBarHeight(listener: (h: number) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
