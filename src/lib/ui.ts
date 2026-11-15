import { Alert } from 'react-native';

/** Message honnête pour une fonctionnalité pas encore branchée (étapes suivantes). */
export function comingSoon(feature: string) {
  Alert.alert('Bientôt disponible', `« ${feature} » arrive dans une prochaine étape.`);
}
