import { useFonts, Fredoka_600SemiBold } from '@expo-google-fonts/fredoka';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Palette } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/contexts/auth';
import { I18nProvider } from '@/lib/i18n';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { initializing } = useAuth();
  const [fontsLoaded] = useFonts({ Fredoka_600SemiBold });
  const ready = !initializing && fontsLoaded;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  // Pendant l'initialisation (auth + polices) on affiche un vrai écran (fond + spinner),
  // jamais un rendu vide qui apparaîtrait comme un écran noir.
  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: Palette.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={Palette.primary} size="large" />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Palette.background },
      }}>
      {/* L'écran-porte ne s'anime pas : il redirige, aucune transition visible. */}
      <Stack.Screen name="index" options={{ animation: 'none' }} />
      <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
      <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
      <Stack.Screen
        name="menu"
        options={{
          presentation: 'transparentModal',
          animation: 'none',
          // Fond réellement transparent : l'écran du dessous reste visible (plus de page noire
          // au backdrop ni à la fermeture). L'assombrissement vient uniquement du voile animé.
          contentStyle: { backgroundColor: 'transparent' },
        }}
      />
      <Stack.Screen name="pro" options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
      <Stack.Screen name="settings" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="select-delete" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="matiere/[id]" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="chapitre/[id]" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="revision/[id]" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="account" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="abonnement" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="ai-memory" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="language" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="notifications" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="privacy" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="support" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="about" options={{ animation: 'slide_from_right' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <SafeAreaProvider>
          <I18nProvider>
            <AuthProvider>
              <StatusBar style="light" />
              <RootNavigator />
            </AuthProvider>
          </I18nProvider>
        </SafeAreaProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
