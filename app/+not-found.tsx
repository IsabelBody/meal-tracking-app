import { Link, Stack } from 'expo-router';
import { YStack, Text, Button } from 'tamagui';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <YStack flex={1} alignItems="center" justifyContent="center" padding="$4" backgroundColor="$background">
        <Text fontSize="$6" fontWeight="bold" color="$color" marginBottom="$4">
          This screen doesn't exist.
        </Text>

        <Link href="/" asChild>
          <Button backgroundColor="#10B981" color="white">
            Go to home screen
          </Button>
        </Link>
      </YStack>
    </>
  );
}
