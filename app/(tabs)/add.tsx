import { YStack } from 'tamagui';

/**
 * Placeholder screen for the Add tab.
 * This screen is never actually displayed - the tab uses a custom button
 * that opens a popover menu instead of navigating to this screen.
 */
export default function AddScreen() {
  return <YStack flex={1} backgroundColor="$background" />;
}
