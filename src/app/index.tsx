import { Redirect } from 'expo-router';

import { useAuth } from '@/contexts/auth';

export default function Index() {
  const { session, isGuest } = useAuth();
  return <Redirect href={session || isGuest ? '/(tabs)' : '/(auth)/login'} />;
}
