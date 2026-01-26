import { ChevronLeft, ChevronRight, UtensilsCrossed } from '@tamagui/lucide-icons';
import { useRouter } from 'expo-router';
import { ScrollView, useColorScheme } from 'react-native';
import {
    Button,
    Card,
    H2,
    Text,
    XStack,
    YStack,
} from 'tamagui';

import { useSavedMeals } from '../../src/stores/meal.store';

export default function SelectMealScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const savedMeals = useSavedMeals();

  const handleMealPress = (mealId: string) => {
    router.push(`/meal/${mealId}`);
  };

  return (
    <YStack flex={1} backgroundColor={isDark ? '#111827' : '#F9FAFB'}>
      {/* Header */}
      <XStack
        paddingHorizontal="$4"
        paddingTop="$6"
        paddingBottom="$3"
        alignItems="center"
        justifyContent="space-between"
        backgroundColor="$background"
        borderBottomWidth={1}
        borderBottomColor="$borderColor"
      >
        <Button
          size="$3"
          chromeless
          icon={ChevronLeft}
          onPress={() => router.back()}
        />
        <H2 color="$color" numberOfLines={1} flex={1} textAlign="center">
          Select Meal
        </H2>
        <YStack width={40} />
      </XStack>

      {savedMeals.length === 0 ? (
        <YStack flex={1} justifyContent="center" alignItems="center" padding="$4">
          <UtensilsCrossed size={48} color={isDark ? '#4B5563' : '#9CA3AF'} />
          <Text
            color={isDark ? '#9CA3AF' : '#6B7280'}
            fontSize={16}
            textAlign="center"
            marginTop="$4"
          >
            No saved meals yet
          </Text>
          <Text
            color={isDark ? '#6B7280' : '#9CA3AF'}
            fontSize={14}
            textAlign="center"
            marginTop="$2"
          >
            Create a new meal to get started
          </Text>
          <Button
            marginTop="$4"
            backgroundColor="#10B981"
            color="white"
            onPress={() => router.replace('/meal/create')}
          >
            Create New Meal
          </Button>
        </YStack>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        >
          <YStack gap="$3">
            {savedMeals.map((meal) => (
              <Card
                key={meal.id}
                elevate
                bordered
                backgroundColor="$background"
                pressStyle={{ scale: 0.98, opacity: 0.9 }}
                onPress={() => handleMealPress(meal.id)}
              >
                <XStack padding="$4" alignItems="center" gap="$3">
                  <YStack
                    width={44}
                    height={44}
                    borderRadius={22}
                    backgroundColor={isDark ? '#374151' : '#F3F4F6'}
                    alignItems="center"
                    justifyContent="center"
                  >
                    <UtensilsCrossed size={22} color="#10B981" />
                  </YStack>
                  <YStack flex={1}>
                    <Text color="$color" fontWeight="600" fontSize={16} numberOfLines={1}>
                      {meal.name}
                    </Text>
                    <XStack gap="$2" marginTop="$1">
                      <Text color="$colorHover" fontSize={13}>
                        {Math.round(meal.totalNutrition.calories)} cal
                      </Text>
                      <Text color="$colorHover" fontSize={13}>
                        {meal.items.length} item{meal.items.length !== 1 ? 's' : ''}
                      </Text>
                    </XStack>
                  </YStack>
                  <ChevronRight size={20} color={isDark ? '#6B7280' : '#9CA3AF'} />
                </XStack>
              </Card>
            ))}
          </YStack>
        </ScrollView>
      )}
    </YStack>
  );
}
