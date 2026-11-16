import { Redirect, Tabs } from 'expo-router';

import { TabBar } from '@/components/TabBar';
import { useAuth } from '@/contexts/auth';

export default function TabsLayout() {
  const { session, isGuest } = useAuth();
  if (!session && !isGuest) return <Redirect href="/(auth)/login" />;

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <TabBar {...props} />}>
      <Tabs.Screen name="index" options={{ title: 'Accueil' }} />
      <Tabs.Screen name="dossiers" options={{ title: 'Dossiers' }} />
      <Tabs.Screen name="parcours" options={{ title: 'Parcours' }} />
      <Tabs.Screen name="cours" options={{ title: 'Mes cours' }} />
      <Tabs.Screen name="planning" options={{ title: 'Planning' }} />
    </Tabs>
  );
}
