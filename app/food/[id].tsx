import { Minus, Plus, Star, StarOff, UtensilsCrossed } from '@tamagui/lucide-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, useColorScheme } from 'react-native';
import {
    Button,
    Card,
    H2,
    H3,
    H4,
    Separator,
    Spinner,
    Text,
    XStack,
    YStack,
} from 'tamagui';

import {
    IngredientsDisplay,
    MacroCircleGroup,
    MicronutrientHighlights,
    NutritionDisplay
} from '../../src/components';
import { useToast } from '../../src/contexts/toast';
import { getFoodById } from '../../src/services/api/food';
import { useAuthStore } from '../../src/stores/auth.store';
import { useDiaryStore } from '../../src/stores/diary.store';
import { useFoodSearchStore } from '../../src/stores/food-search.store';
import { useDraftItemCount, useIsActivelyBuildingMeal, useMealStore } from '../../src/stores/meal.store';
import { NormalizedFood, NormalizedServing } from '../../src/types';
import { getTodayKey } from '../../src/utils/date';
import { scaleNutrition } from '../../src/utils/nutrition';
import { getServingPortionEquivalent } from '../../src/utils/portions';

export default function FoodDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const {
    getCachedFood,
    setCachedFood,
    addRecentFood,
    addFavorite,
    removeFavorite,
    isFavorite,
  } = useFoodSearchStore();
  const { addEntry, selectedDate } = useDiaryStore();
  const { isAuthenticated, getAccessToken } = useAuthStore();
  const { addItemToDraft } = useMealStore();
  const draftItemCount = useDraftItemCount();
  const isActivelyBuildingMeal = useIsActivelyBuildingMeal();
  const { showSuccess } = useToast();

  const [food, setFood] = useState<NormalizedFood | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedServing, setSelectedServing] = useState<NormalizedServing | null>(null);
  const [servingAmount, setServingAmount] = useState(1);

  const favorite = food ? isFavorite(food.id) : false;

  useEffect(() => {
    if (id) {
      loadFood(id);
    }
  }, [id]);

  const loadFood = async (foodId: string) => {
    setIsLoading(true);
    setError(null);

    // Check cache first
    const cached = getCachedFood(foodId);
    if (cached) {
      setFood(cached);
      setSelectedServing(cached.servings[0] || null);
      setIsLoading(false);
      return;
    }

    try {
      const result = await getFoodById(foodId);
      if (result) {
        setFood(result);
        setSelectedServing(result.servings[0] || null);
        setCachedFood(foodId, result);
        
        // Add to recent foods
        addRecentFood({
          food_id: result.id,
          food_name: result.name,
          food_description: '',
          food_type: result.brand ? 'Brand' : 'Generic',
          brand_name: result.brand,
        });
      } else {
        setError('Food not found');
      }
    } catch (err) {
      setError('Failed to load food details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleFavorite = () => {
    if (!food) return;
    
    if (favorite) {
      removeFavorite(food.id);
    } else {
      addFavorite({
        food_id: food.id,
        food_name: food.name,
        food_description: '',
        food_type: food.brand ? 'Brand' : 'Generic',
        brand_name: food.brand,
      });
    }
  };

  const handleAddToDiary = async () => {
    if (!food || !selectedServing) return;

    const scaledNutrition = scaleNutrition(selectedServing.nutrition, servingAmount);

    // Get auth token for cloud sync if authenticated
    const token = isAuthenticated ? await getAccessToken() : null;

    await addEntry({
      date: selectedDate || getTodayKey(),
      mealType: 'snack', // Default value for backwards compatibility
      foodId: food.id,
      foodName: food.name,
      brandName: food.brand,
      servingId: selectedServing.id,
      servingAmount,
      servingUnit: selectedServing.unit,
      servingDescription: selectedServing.description,
      nutrition: scaledNutrition,
      source: food.source,
    }, token || undefined);

    Alert.alert(
      'Added',
      `${food.name} added to diary`,
      [{ text: 'OK', onPress: () => router.back() }]
    );
  };

  const handleAddToMeal = () => {
    if (!food || !selectedServing) return;

    const scaledNutrition = scaleNutrition(selectedServing.nutrition, servingAmount);

    addItemToDraft({
      foodId: food.id,
      foodName: food.name,
      brandName: food.brand,
      servingId: selectedServing.id,
      servingAmount,
      servingUnit: selectedServing.unit,
      servingDescription: selectedServing.description,
      nutrition: scaledNutrition,
      source: food.source,
    });

    showSuccess(`Added ${food.name} to meal`);

    // If not in an active meal building session, navigate to meal builder
    if (!isActivelyBuildingMeal) {
      router.push('/meal/create');
    } else {
      // Otherwise go back to continue adding more items
      router.back();
    }
  };

  const incrementAmount = () => setServingAmount((prev) => Math.min(prev + 0.5, 10));
  const decrementAmount = () => setServingAmount((prev) => Math.max(prev - 0.5, 0.5));

  const scaledNutrition = selectedServing
    ? scaleNutrition(selectedServing.nutrition, servingAmount)
    : null;

  // Calculate portion equivalent for display
  const portionEquivalent = useMemo(() => {
    if (!selectedServing) return '';
    return getServingPortionEquivalent(
      selectedServing.amount,
      servingAmount,
      food?.foodCategory
    );
  }, [selectedServing, servingAmount, food?.foodCategory]);

  if (isLoading) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="$background">
        <Spinner size="large" color="#10B981" />
        <Text marginTop="$2" color="$colorHover">Loading food details...</Text>
      </YStack>
    );
  }

  if (error || !food) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" padding="$4" backgroundColor="$background">
        <Text color={isDark ? '#FCA5A5' : '#DC2626'} textAlign="center">{error || 'Food not found'}</Text>
        <Button marginTop="$4" onPress={() => router.back()}>
          Go Back
        </Button>
      </YStack>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: isDark ? '#111827' : '#F9FAFB' }}
      contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
    >
      {/* Food Header */}
      <Card elevate bordered padding="$4" marginBottom="$4" backgroundColor="$background">
        <XStack justifyContent="space-between" alignItems="flex-start">
          <YStack flex={1}>
            <H2 color="$color">{food.name}</H2>
            {food.brand && (
              <Text fontSize="$4" color="$colorHover" marginTop="$1">
                {food.brand}
              </Text>
            )}
            {/* Food metadata */}
            <XStack flexWrap="wrap" gap="$2" marginTop="$2">
              {food.dataType && (
                <YStack
                  backgroundColor={food.dataType === 'Foundation' ? '#10B98120' : food.dataType === 'SR Legacy' ? '#3B82F620' : '#F59E0B20'}
                  paddingHorizontal="$2"
                  paddingVertical="$1"
                  borderRadius="$2"
                >
                  <Text fontSize="$2" color={food.dataType === 'Foundation' ? '#10B981' : food.dataType === 'SR Legacy' ? '#3B82F6' : '#F59E0B'}>
                    {food.dataType}
                  </Text>
                </YStack>
              )}
              {food.foodCategory && (
                <YStack
                  backgroundColor="$backgroundHover"
                  paddingHorizontal="$2"
                  paddingVertical="$1"
                  borderRadius="$2"
                >
                  <Text fontSize="$2" color="$colorHover">
                    {food.foodCategory}
                  </Text>
                </YStack>
              )}
            </XStack>
            {/* Scientific name */}
            {food.scientificName && (
              <Text fontSize="$3" fontStyle="italic" color="$colorHover" marginTop="$2">
                {food.scientificName}
              </Text>
            )}
            {/* Barcode/UPC */}
            {food.gtinUpc && (
              <Text fontSize="$2" color="$colorHover" marginTop="$1">
                UPC: {food.gtinUpc}
              </Text>
            )}
          </YStack>
          <Button
            size="$3"
            chromeless
            icon={favorite ? Star : StarOff}
            onPress={handleToggleFavorite}
            color={favorite ? '#F59E0B' : '$colorHover'}
          />
        </XStack>
      </Card>

      {/* Serving Selection */}
      <Card elevate bordered padding="$4" marginBottom="$4" backgroundColor="$background">
        <H3 marginBottom="$3" color="$color">Serving Size</H3>

        {/* Serving Type Selector - Button-based for React Native compatibility */}
        {food.servings && food.servings.length > 0 ? (
          <XStack flexWrap="wrap" gap="$2">
            {food.servings.map((serving) => (
              <Button
                key={serving.id}
                size="$3"
                backgroundColor={selectedServing?.id === serving.id ? '#10B981' : '$background'}
                color={selectedServing?.id === serving.id ? 'white' : '$color'}
                borderWidth={1}
                borderColor={selectedServing?.id === serving.id ? '#10B981' : '$borderColor'}
                onPress={() => setSelectedServing(serving)}
                flexShrink={1}
              >
                <Text 
                  fontSize="$3" 
                  color={selectedServing?.id === serving.id ? 'white' : '$color'}
                  numberOfLines={1}
                >
                  {serving.description}
                </Text>
              </Button>
            ))}
          </XStack>
        ) : (
          <Text color="$colorHover">No serving sizes available</Text>
        )}

        {/* Amount Selector */}
        <XStack alignItems="center" justifyContent="center" gap="$4" marginTop="$4">
          <Button
            size="$4"
            circular
            icon={Minus}
            onPress={decrementAmount}
            disabled={servingAmount <= 0.5}
            backgroundColor="$backgroundHover"
          />
          <YStack alignItems="center" minWidth={80}>
            <Text fontSize="$8" fontWeight="700" color="$color">
              {servingAmount}
            </Text>
            <Text fontSize="$2" color="$colorHover">servings</Text>
          </YStack>
          <Button
            size="$4"
            circular
            icon={Plus}
            onPress={incrementAmount}
            disabled={servingAmount >= 10}
            backgroundColor="$backgroundHover"
          />
        </XStack>

        {/* Portion Equivalent Helper */}
        {portionEquivalent && (
          <YStack
            marginTop="$3"
            paddingTop="$3"
            borderTopWidth={1}
            borderTopColor="$borderColor"
            alignItems="center"
          >
            <Text fontSize="$3" color="$colorHover" fontStyle="italic">
              {portionEquivalent}
            </Text>
          </YStack>
        )}
      </Card>

      {/* Nutrition Info */}
      {scaledNutrition && (
        <Card elevate bordered padding="$4" marginBottom="$4" backgroundColor="$background">
          <H3 marginBottom="$3" color="$color">Nutrition</H3>

          {/* Main Macros */}
          <YStack marginBottom="$4">
            <MacroCircleGroup
              calories={scaledNutrition.calories}
              protein={scaledNutrition.protein}
              carbs={scaledNutrition.carbs}
              fat={scaledNutrition.fat}
            />
          </YStack>

          <Separator marginVertical="$3" />

          {/* Micronutrient Highlights (if significant amounts present) */}
          <MicronutrientHighlights nutrition={scaledNutrition} maxItems={4} />

          <Separator marginVertical="$3" />

          {/* Full Nutrition Display */}
          <H4 marginBottom="$2" color="$color">All Nutrients</H4>
          <NutritionDisplay
            nutrition={scaledNutrition}
            showDailyValues={true}
            expandedCategories={['macros']}
          />
        </Card>
      )}

      {/* Ingredients (for branded foods) */}
      {food.ingredients && (
        <Card elevate bordered padding="$4" marginBottom="$4" backgroundColor="$background">
          <IngredientsDisplay ingredients={food.ingredients} />
        </Card>
      )}

      {/* Add Buttons */}
      <YStack gap="$2">
        {isActivelyBuildingMeal ? (
          /* When actively editing/creating a meal, only show Add to Meal */
          <Button
            size="$5"
            backgroundColor="#10B981"
            color="white"
            icon={UtensilsCrossed}
            onPress={handleAddToMeal}
          >
            {draftItemCount > 0
              ? `Add to Meal (${draftItemCount} item${draftItemCount !== 1 ? 's' : ''})`
              : 'Add to Meal'}
          </Button>
        ) : (
          /* When not actively building a meal, show both options with Add to Diary as primary */
          <>
            <Button
              size="$5"
              backgroundColor="#10B981"
              color="white"
              onPress={handleAddToDiary}
            >
              Add to Diary
            </Button>
            <Button
              size="$4"
              backgroundColor="$background"
              borderWidth={1}
              borderColor="$borderColor"
              icon={UtensilsCrossed}
              onPress={handleAddToMeal}
            >
              <Text color="$color">Add to Meal</Text>
            </Button>
          </>
        )}
      </YStack>
    </ScrollView>
  );
}

