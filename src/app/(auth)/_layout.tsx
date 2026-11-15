import { Redirect, Stack } from 'expo-router';

import { Palette } from '@/constants/theme';
import { useAuth } from '@/contexts/auth';

export default function AuthLayout() {
  const { session } = useAuth();
  if (session) return <Redirect href="/(tabs)" />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Palette.background },
      }}
    />
  );
}
