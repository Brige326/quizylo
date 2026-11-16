import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Rappels locaux (Planning). Les notifications locales fonctionnent dans Expo Go ;
 * on reste honnête : si la permission est refusée ou l'échéance passée, on ne planifie rien.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

let androidReady = false;
async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android' || androidReady) return;
  await Notifications.setNotificationChannelAsync('reminders', {
    name: 'Rappels',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
  androidReady = true;
}

export async function ensureNotifPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

/** Planifie un rappel à la date donnée. Renvoie l'identifiant, ou null si non planifié. */
export async function scheduleReminder(date: Date, title: string, body: string): Promise<string | null> {
  if (date.getTime() <= Date.now() + 2000) return null;
  const ok = await ensureNotifPermission();
  if (!ok) return null;
  await ensureAndroidChannel();
  try {
    return await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
    });
  } catch {
    return null;
  }
}

export async function cancelReminder(id: string | null | undefined): Promise<void> {
  if (!id) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // le rappel a peut-être déjà été déclenché / annulé
  }
}
