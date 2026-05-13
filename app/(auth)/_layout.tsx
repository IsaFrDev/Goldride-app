import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#000000' },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="phone" />
      <Stack.Screen name="otp" />
      <Stack.Screen name="role-select" />
      <Stack.Screen name="passenger-register" />
    </Stack>
  );
}
