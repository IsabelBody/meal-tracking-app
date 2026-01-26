import { AlertCircle, Camera, ChevronLeft, ChevronRight, Cloud, CloudOff, List, Minus, Pencil, Plus, RefreshCw, Search, Trash2, UtensilsCrossed, X } from '@tamagui/lucide-icons';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, TouchableWithoutFeedback, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Button,
  Card,
  Progress,
  Separator,
  Spinner,
  Text,
  XStack,
  YStack
} from 'tamagui';

import { SwipeableDateHeader } from '../../src/components';
import { useToast } from '../../src/contexts/toast';
import { useSync } from '../../src/hooks/useSync';
import { getFoodById } from '../../src/services/api/food';
import { useAuthStore } from '../../src/stores/auth.store';
import { useDateEntries, useDiaryStore } from '../../src/stores/diary.store';
import { useFoodSearchStore } from '../../src/stores/food-search.store';
import { useGoalsStore, useNutritionProgress } from '../../src/stores/goals.store';
import { DiaryEntry, NormalizedFood, NormalizedServing } from '../../src/types';
import { formatTime } from '../../src/utils/date';
import { scaleNutrition, sumNutrition } from '../../src/utils/nutrition';

export default function DashboardScreen() {
  const router = useRouter();
  const { showError, showSuccess } = useToast();
  const selectedDate = useDiaryStore((state) => state.selectedDate);
  const setSelectedDate = useDiaryStore((state) => state.setSelectedDate);
  const diaryError = useDiaryStore((state) => state.error);
  const entries = useDateEntries(selectedDate);
  const goals = useGoalsStore((state) => state.goals);
  const goalsError = useGoalsStore((state) => state.error);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  
  // Add food modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [showCustomMealMenu, setShowCustomMealMenu] = useState(false);
  
  // Edit entry modal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingEntry, setEditingEntry] = useState<DiaryEntry | null>(null);
  const [editServingAmount, setEditServingAmount] = useState(1);
  const [editingFood, setEditingFood] = useState<NormalizedFood | null>(null);
  const [editSelectedServing, setEditSelectedServing] = useState<NormalizedServing | null>(null);
  const [isLoadingEditFood, setIsLoadingEditFood] = useState(false);
  
  // Food cache access
  const { getCachedFood, setCachedFood } = useFoodSearchStore();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  const activeColor = '#10B981';
  
  // Initialize sync
  const { isSyncing, syncCurrentDate, fullSync } = useSync();
  
  // Show toast when sync errors occur
  useEffect(() => {
    if (diaryError) {
      showError(new Error(diaryError), 'Sync Error');
    }
  }, [diaryError, showError]);

  useEffect(() => {
    if (goalsError) {
      showError(new Error(goalsError), 'Goals Sync Error');
    }
  }, [goalsError, showError]);
  
  // Memoize expensive calculations
  const totals = useMemo(() => sumNutrition(entries), [entries]);
  const progress = useNutritionProgress(totals);

  const handleCloseModal = useCallback(() => {
    setModalVisible(false);
    setShowCustomMealMenu(false);
  }, []);

  const handleOptionPress = useCallback((option: 'scan' | 'search' | 'selectMeal' | 'createMeal') => {
    handleCloseModal();
    setTimeout(() => {
      switch (option) {
        case 'scan':
          router.push('/(tabs)/scanner');
          break;
        case 'search':
          router.push('/(tabs)/search');
          break;
        case 'selectMeal':
          router.push('/meal/select');
          break;
        case 'createMeal':
          router.push('/meal/create');
          break;
      }
    }, 100);
  }, [handleCloseModal, router]);

  const handleAddFood = useCallback(() => {
    setModalVisible(true);
  }, []);

  // Pull to refresh
  const handleRefresh = useCallback(async () => {
    if (isAuthenticated) {
      await syncCurrentDate();
    }
  }, [isAuthenticated, syncCurrentDate]);

  // Retry sync after error
  const handleRetrySync = useCallback(async () => {
    if (isAuthenticated) {
      await fullSync();
    }
  }, [isAuthenticated, fullSync]);

  // Check if there's a sync error
  const hasSyncError = !!(diaryError || goalsError);

  // Sort entries by creation time (most recent first)
  const sortedEntries = useMemo(() => {
    return [...entries].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [entries]);

  // Get delete and update handlers
  const deleteEntry = useDiaryStore((state) => state.deleteEntry);
  const updateEntry = useDiaryStore((state) => state.updateEntry);
  const getAccessToken = useAuthStore((state) => state.getAccessToken);

  // Edit entry handlers
  const handleEditEntry = useCallback(async (entry: DiaryEntry) => {
    setEditingEntry(entry);
    setEditServingAmount(entry.servingAmount);
    setEditModalVisible(true);
    setEditingFood(null);
    setEditSelectedServing(null);
    
    // Skip food lookup for custom meals (meal_ prefix)
    if (entry.foodId.startsWith('meal_')) {
      return;
    }
    
    // Try to load the food to get available servings
    setIsLoadingEditFood(true);
    try {
      // Check cache first
      const cached = getCachedFood(entry.foodId);
      if (cached) {
        setEditingFood(cached);
        // Find the matching serving by ID or description
        const matchingServing = cached.servings.find(
          (s) => s.id === entry.servingId || s.description === entry.servingDescription
        );
        setEditSelectedServing(matchingServing || cached.servings[0] || null);
      } else {
        const food = await getFoodById(entry.foodId);
        if (food) {
          setEditingFood(food);
          setCachedFood(entry.foodId, food);
          // Find the matching serving
          const matchingServing = food.servings.find(
            (s) => s.id === entry.servingId || s.description === entry.servingDescription
          );
          setEditSelectedServing(matchingServing || food.servings[0] || null);
        }
      }
    } catch (error) {
      console.error('Failed to load food for editing:', error);
      // Continue without food data - user can still edit amount
    } finally {
      setIsLoadingEditFood(false);
    }
  }, [getCachedFood, setCachedFood]);

  const handleCloseEditModal = useCallback(() => {
    setEditModalVisible(false);
    setEditingEntry(null);
    setEditServingAmount(1);
    setEditingFood(null);
    setEditSelectedServing(null);
    setIsLoadingEditFood(false);
  }, []);

  const handleDeleteEntry = useCallback(async (entryId: string, entryName?: string) => {
    Alert.alert(
      'Delete Entry?',
      entryName 
        ? `Are you sure you want to delete "${entryName}"? This cannot be undone.`
        : 'Are you sure you want to delete this entry? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const token = await getAccessToken();
            await deleteEntry(entryId, selectedDate, token ?? undefined);
            showSuccess('Entry deleted');
            handleCloseEditModal();
          },
        },
      ]
    );
  }, [deleteEntry, selectedDate, getAccessToken, showSuccess, handleCloseEditModal]);

  const handleSaveEdit = useCallback(async () => {
    if (!editingEntry) return;

    const token = (await getAccessToken()) ?? undefined;

    if (editingFood && editSelectedServing) {
      const newNutrition = scaleNutrition(editSelectedServing.nutrition, editServingAmount);
      const servingChanged = editSelectedServing.id !== editingEntry.servingId;

      await updateEntry(
        editingEntry.id,
        {
          servingId: editSelectedServing.id,
          servingAmount: editServingAmount,
          servingUnit: editSelectedServing.unit,
          servingDescription: editSelectedServing.description,
          nutrition: newNutrition,
        },
        token
      );

      showSuccess(servingChanged ? 'Entry updated with new serving' : 'Entry updated');
    } else {
      const baseNutrition = scaleNutrition(editingEntry.nutrition, 1 / editingEntry.servingAmount);
      const newNutrition = scaleNutrition(baseNutrition, editServingAmount);

      await updateEntry(
        editingEntry.id,
        { servingAmount: editServingAmount, nutrition: newNutrition },
        token
      );

      showSuccess('Entry updated');
    }

    handleCloseEditModal();
  }, [editingEntry, editServingAmount, editingFood, editSelectedServing, updateEntry, showSuccess, handleCloseEditModal, getAccessToken]);

  const incrementEditAmount = useCallback(() => {
    setEditServingAmount((prev) => Math.min(prev + 0.5, 10));
  }, []);

  const decrementEditAmount = useCallback(() => {
    setEditServingAmount((prev) => Math.max(prev - 0.5, 0.5));
  }, []);

  // Calculate preview nutrition for edit modal
  const editPreviewNutrition = useMemo(() => {
    if (!editingEntry) return null;
    
    // If we have food data with selected serving, use that for accurate preview
    if (editingFood && editSelectedServing) {
      return scaleNutrition(editSelectedServing.nutrition, editServingAmount);
    }
    
    // Fallback: scale from existing entry nutrition
    const baseNutrition = scaleNutrition(editingEntry.nutrition, 1 / editingEntry.servingAmount);
    return scaleNutrition(baseNutrition, editServingAmount);
  }, [editingEntry, editServingAmount, editingFood, editSelectedServing]);

  return (
    <SwipeableDateHeader
      selectedDate={selectedDate}
      onDateChange={setSelectedDate}
      refreshing={isSyncing}
      onRefresh={handleRefresh}
      rightContent={
        isAuthenticated ? (
          hasSyncError ? (
            <XStack 
              alignItems="center" 
              gap="$1" 
              onPress={handleRetrySync}
              pressStyle={{ opacity: 0.7 }}
            >
              <AlertCircle size={16} color="#EF4444" />
              <Text fontSize="$1" color="#EF4444">Sync Error</Text>
              <RefreshCw size={12} color="#EF4444" />
            </XStack>
          ) : isSyncing ? (
            <XStack alignItems="center" gap="$1" opacity={0.6}>
              <RefreshCw size={16} color="#10B981" />
              <Text fontSize="$1" color="#10B981">Syncing...</Text>
            </XStack>
          ) : (
            <XStack alignItems="center" gap="$1" opacity={0.6}>
              <Cloud size={16} color="#10B981" />
              <Text fontSize="$1" color="#10B981">Synced</Text>
            </XStack>
          )
        ) : (
          <XStack alignItems="center" gap="$1" opacity={0.6}>
            <CloudOff size={16} color="$colorHover" />
            <Text fontSize="$1" color="$colorHover">Local</Text>
          </XStack>
        )
      }
    >
      {/* Calorie Summary Card */}
      <Card
        elevate
        bordered
        padding="$4"
        marginBottom="$4"
        backgroundColor="$background"
      >
        <YStack alignItems="center" gap="$3">
          <Text fontSize="$3" color="$colorHover">
            Calories
          </Text>
          <XStack alignItems="baseline" gap="$2">
            <Text fontSize="$9" fontWeight="700" color="$color">
              {Math.round(totals.calories)}
            </Text>
            <Text fontSize="$5" color="$colorHover">
              / {goals.calories}
            </Text>
          </XStack>
          <Progress
            value={progress.calories}
            backgroundColor="$backgroundHover"
            height={8}
            width="100%"
          >
            <Progress.Indicator
              backgroundColor={progress.calories > 100 ? '#EF4444' : '#10B981'}
            />
          </Progress>
          <Text fontSize="$2" color="$colorHover">
            {Math.max(0, goals.calories - totals.calories)} remaining
          </Text>
        </YStack>
      </Card>

      {/* Food Diary */}
      <Card
        elevate
        bordered
        padding="$3"
        marginBottom="$3"
        backgroundColor="$background"
      >
        <XStack justifyContent="space-between" alignItems="center">
          <YStack>
            <Text fontWeight="600" fontSize="$5" color="$color">
              Food Diary
            </Text>
            <Text fontSize="$3" color="$colorHover">
              {entries.length} {entries.length === 1 ? 'item' : 'items'}
            </Text>
          </YStack>
        </XStack>

        {sortedEntries.length > 0 && (
          <YStack marginTop="$3" gap="$2">
            <Separator />
            {sortedEntries.map((entry: DiaryEntry) => (
              <XStack
                key={entry.id}
                justifyContent="space-between"
                alignItems="center"
                paddingVertical="$2"
                gap="$2"
              >
                <YStack flex={1}>
                  <Text fontSize="$3" color="$color" numberOfLines={1}>
                    {entry.foodName}
                  </Text>
                  <Text fontSize="$2" color="$colorHover">
                    {formatTime(entry.createdAt)}
                  </Text>
                </YStack>
                <XStack alignItems="center" gap="$2">
                  <Text fontSize="$3" color="$colorHover">
                    {Math.round(entry.nutrition.calories)} cal
                  </Text>
                  <Button
                    size="$2"
                    circular
                    backgroundColor="transparent"
                    pressStyle={{ backgroundColor: '$backgroundHover' }}
                    onPress={() => handleEditEntry(entry)}
                  >
                    <Pencil size={16} color="#3B82F6" />
                  </Button>
                </XStack>
              </XStack>
            ))}
          </YStack>
        )}

        {sortedEntries.length === 0 && (
          <YStack marginTop="$3" paddingVertical="$4" alignItems="center">
            <Text fontSize="$3" color="$colorHover">
              No foods logged yet
            </Text>
          </YStack>
        )}
      </Card>

      {/* Add Food Button */}
      <Button
        size="$5"
        backgroundColor="#10B981"
        color="white"
        icon={Plus}
        onPress={handleAddFood}
      >
        Add Food
      </Button>

      {/* Add Food Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={handleCloseModal}
      >
        <TouchableWithoutFeedback onPress={handleCloseModal}>
          <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <TouchableWithoutFeedback>
              <View
                style={{
                  backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                  borderTopLeftRadius: 20,
                  borderTopRightRadius: 20,
                  paddingBottom: insets.bottom + 16,
                  paddingTop: 8,
                }}
              >
                {/* Handle bar */}
                <View style={{ alignItems: 'center', paddingVertical: 8 }}>
                  <View
                    style={{
                      width: 40,
                      height: 4,
                      backgroundColor: isDark ? '#4B5563' : '#D1D5DB',
                      borderRadius: 2,
                    }}
                  />
                </View>

                {showCustomMealMenu ? (
                  /* Custom Meal Sub-menu */
                  <>
                    <XStack paddingHorizontal="$4" paddingVertical="$3" justifyContent="space-between" alignItems="center">
                      <Pressable onPress={() => setShowCustomMealMenu(false)}>
                        <ChevronLeft size={24} color={isDark ? '#9CA3AF' : '#6B7280'} />
                      </Pressable>
                      <Text fontSize={18} fontWeight="600" color={isDark ? '#F9FAFB' : '#111827'}>
                        Custom Meal
                      </Text>
                      <Pressable onPress={handleCloseModal}>
                        <X size={24} color={isDark ? '#9CA3AF' : '#6B7280'} />
                      </Pressable>
                    </XStack>

                    <Separator backgroundColor={isDark ? '#374151' : '#E5E7EB'} />

                    <YStack paddingHorizontal="$4" paddingTop="$2">
                      <Pressable onPress={() => handleOptionPress('selectMeal')}>
                        <XStack paddingVertical="$4" alignItems="center" gap="$3">
                          <YStack
                            width={44}
                            height={44}
                            borderRadius={22}
                            backgroundColor={isDark ? '#374151' : '#F3F4F6'}
                            alignItems="center"
                            justifyContent="center"
                          >
                            <List size={22} color={activeColor} />
                          </YStack>
                          <YStack flex={1}>
                            <Text color={isDark ? '#F9FAFB' : '#111827'} fontWeight="600" fontSize={16}>
                              Select Existing Meal
                            </Text>
                            <Text color={isDark ? '#9CA3AF' : '#6B7280'} fontSize={13}>
                              Choose from your saved meals
                            </Text>
                          </YStack>
                        </XStack>
                      </Pressable>

                      <Separator backgroundColor={isDark ? '#374151' : '#E5E7EB'} />

                      <Pressable onPress={() => handleOptionPress('createMeal')}>
                        <XStack paddingVertical="$4" alignItems="center" gap="$3">
                          <YStack
                            width={44}
                            height={44}
                            borderRadius={22}
                            backgroundColor={isDark ? '#374151' : '#F3F4F6'}
                            alignItems="center"
                            justifyContent="center"
                          >
                            <Plus size={22} color={activeColor} />
                          </YStack>
                          <YStack flex={1}>
                            <Text color={isDark ? '#F9FAFB' : '#111827'} fontWeight="600" fontSize={16}>
                              Create New Meal
                            </Text>
                            <Text color={isDark ? '#9CA3AF' : '#6B7280'} fontSize={13}>
                              Build a custom meal from scratch
                            </Text>
                          </YStack>
                        </XStack>
                      </Pressable>
                    </YStack>
                  </>
                ) : (
                  /* Main Menu */
                  <>
                    <XStack paddingHorizontal="$4" paddingVertical="$3" justifyContent="space-between" alignItems="center">
                      <Text fontSize={18} fontWeight="600" color={isDark ? '#F9FAFB' : '#111827'}>
                        Add Food
                      </Text>
                      <Pressable onPress={handleCloseModal}>
                        <X size={24} color={isDark ? '#9CA3AF' : '#6B7280'} />
                      </Pressable>
                    </XStack>

                    <Separator backgroundColor={isDark ? '#374151' : '#E5E7EB'} />

                    <YStack paddingHorizontal="$4" paddingTop="$2">
                      <Pressable onPress={() => handleOptionPress('search')}>
                        <XStack paddingVertical="$4" alignItems="center" gap="$3">
                          <YStack
                            width={44}
                            height={44}
                            borderRadius={22}
                            backgroundColor={isDark ? '#374151' : '#F3F4F6'}
                            alignItems="center"
                            justifyContent="center"
                          >
                            <Search size={22} color={activeColor} />
                          </YStack>
                          <YStack flex={1}>
                            <Text color={isDark ? '#F9FAFB' : '#111827'} fontWeight="600" fontSize={16}>
                              Search Food
                            </Text>
                            <Text color={isDark ? '#9CA3AF' : '#6B7280'} fontSize={13}>
                              Search our food database
                            </Text>
                          </YStack>
                        </XStack>
                      </Pressable>

                      <Separator backgroundColor={isDark ? '#374151' : '#E5E7EB'} />

                      <Pressable onPress={() => handleOptionPress('scan')}>
                        <XStack paddingVertical="$4" alignItems="center" gap="$3">
                          <YStack
                            width={44}
                            height={44}
                            borderRadius={22}
                            backgroundColor={isDark ? '#374151' : '#F3F4F6'}
                            alignItems="center"
                            justifyContent="center"
                          >
                            <Camera size={22} color={activeColor} />
                          </YStack>
                          <YStack flex={1}>
                            <Text color={isDark ? '#F9FAFB' : '#111827'} fontWeight="600" fontSize={16}>
                              Scan Barcode
                            </Text>
                            <Text color={isDark ? '#9CA3AF' : '#6B7280'} fontSize={13}>
                              Scan a product barcode
                            </Text>
                          </YStack>
                        </XStack>
                      </Pressable>

                      <Separator backgroundColor={isDark ? '#374151' : '#E5E7EB'} />

                      <Pressable onPress={() => setShowCustomMealMenu(true)}>
                        <XStack paddingVertical="$4" alignItems="center" gap="$3">
                          <YStack
                            width={44}
                            height={44}
                            borderRadius={22}
                            backgroundColor={isDark ? '#374151' : '#F3F4F6'}
                            alignItems="center"
                            justifyContent="center"
                          >
                            <UtensilsCrossed size={22} color={activeColor} />
                          </YStack>
                          <YStack flex={1}>
                            <Text color={isDark ? '#F9FAFB' : '#111827'} fontWeight="600" fontSize={16}>
                              Custom Meal
                            </Text>
                            <Text color={isDark ? '#9CA3AF' : '#6B7280'} fontSize={13}>
                              Select or create a meal
                            </Text>
                          </YStack>
                          <ChevronRight size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
                        </XStack>
                      </Pressable>
                    </YStack>
                  </>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Edit Entry Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={editModalVisible}
        onRequestClose={handleCloseEditModal}
      >
        <TouchableWithoutFeedback onPress={handleCloseEditModal}>
          <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <TouchableWithoutFeedback>
              <View
                style={{
                  backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                  borderTopLeftRadius: 20,
                  borderTopRightRadius: 20,
                  paddingBottom: insets.bottom + 16,
                  paddingTop: 8,
                }}
              >
                {/* Handle bar */}
                <View style={{ alignItems: 'center', paddingVertical: 8 }}>
                  <View
                    style={{
                      width: 40,
                      height: 4,
                      backgroundColor: isDark ? '#4B5563' : '#D1D5DB',
                      borderRadius: 2,
                    }}
                  />
                </View>

                {/* Header */}
                <XStack paddingHorizontal="$4" paddingVertical="$3" justifyContent="space-between" alignItems="center">
                  <Text fontSize={18} fontWeight="600" color={isDark ? '#F9FAFB' : '#111827'}>
                    Edit Entry
                  </Text>
                  <Pressable onPress={handleCloseEditModal}>
                    <X size={24} color={isDark ? '#9CA3AF' : '#6B7280'} />
                  </Pressable>
                </XStack>

                <Separator backgroundColor={isDark ? '#374151' : '#E5E7EB'} />

                {editingEntry && (
                  <YStack paddingHorizontal="$4" paddingTop="$4" gap="$4">
                    {/* Food Name */}
                    <YStack>
                      <Text fontSize={16} fontWeight="600" color={isDark ? '#F9FAFB' : '#111827'}>
                        {editingEntry.foodName}
                      </Text>
                      {editingEntry.brandName && (
                        <Text fontSize={14} color={isDark ? '#9CA3AF' : '#6B7280'}>
                          {editingEntry.brandName}
                        </Text>
                      )}
                    </YStack>

                    {/* Serving Type Selector */}
                    <YStack gap="$2">
                      <Text fontSize={14} fontWeight="500" color={isDark ? '#F9FAFB' : '#111827'}>
                        Serving Size
                      </Text>
                      
                      {isLoadingEditFood ? (
                        <XStack justifyContent="center" paddingVertical="$2">
                          <Spinner size="small" color="#10B981" />
                        </XStack>
                      ) : editingFood && editingFood.servings.length > 0 ? (
                        <XStack flexWrap="wrap" gap="$2">
                          {editingFood.servings.map((serving) => (
                            <Button
                              key={serving.id}
                              size="$3"
                              backgroundColor={editSelectedServing?.id === serving.id ? '#10B981' : (isDark ? '#374151' : '#F3F4F6')}
                              borderWidth={1}
                              borderColor={editSelectedServing?.id === serving.id ? '#10B981' : (isDark ? '#4B5563' : '#E5E7EB')}
                              onPress={() => setEditSelectedServing(serving)}
                              flexShrink={1}
                            >
                              <Text 
                                fontSize={13} 
                                color={editSelectedServing?.id === serving.id ? 'white' : (isDark ? '#F9FAFB' : '#111827')}
                                numberOfLines={1}
                              >
                                {serving.description}
                              </Text>
                            </Button>
                          ))}
                        </XStack>
                      ) : (
                        <Text fontSize={14} color={isDark ? '#9CA3AF' : '#6B7280'}>
                          {editingEntry.servingDescription}
                        </Text>
                      )}
                    </YStack>

                    {/* Serving Amount Selector */}
                    <YStack gap="$2">
                      <Text fontSize={14} fontWeight="500" color={isDark ? '#F9FAFB' : '#111827'}>
                        Number of Servings
                      </Text>
                      <XStack alignItems="center" justifyContent="center" gap="$4" paddingVertical="$2">
                        <Button
                          size="$4"
                          circular
                          icon={Minus}
                          onPress={decrementEditAmount}
                          disabled={editServingAmount <= 0.5}
                          backgroundColor={isDark ? '#374151' : '$backgroundHover'}
                        />
                        <YStack alignItems="center" minWidth={80}>
                          <Text fontSize={32} fontWeight="700" color={isDark ? '#F9FAFB' : '#111827'}>
                            {editServingAmount}
                          </Text>
                          <Text fontSize={12} color={isDark ? '#9CA3AF' : '#6B7280'}>
                            servings
                          </Text>
                        </YStack>
                        <Button
                          size="$4"
                          circular
                          icon={Plus}
                          onPress={incrementEditAmount}
                          disabled={editServingAmount >= 10}
                          backgroundColor={isDark ? '#374151' : '$backgroundHover'}
                        />
                      </XStack>
                    </YStack>

                    {/* Nutrition Preview */}
                    {editPreviewNutrition && (
                      <Card
                        backgroundColor={isDark ? '#374151' : '#F3F4F6'}
                        padding="$3"
                        borderRadius="$3"
                      >
                        <XStack justifyContent="space-around">
                          <YStack alignItems="center">
                            <Text fontSize={20} fontWeight="700" color={isDark ? '#F9FAFB' : '#111827'}>
                              {Math.round(editPreviewNutrition.calories)}
                            </Text>
                            <Text fontSize={12} color={isDark ? '#9CA3AF' : '#6B7280'}>
                              cal
                            </Text>
                          </YStack>
                          <YStack alignItems="center">
                            <Text fontSize={20} fontWeight="700" color={isDark ? '#F9FAFB' : '#111827'}>
                              {Math.round(editPreviewNutrition.protein * 10) / 10}g
                            </Text>
                            <Text fontSize={12} color={isDark ? '#9CA3AF' : '#6B7280'}>
                              protein
                            </Text>
                          </YStack>
                          <YStack alignItems="center">
                            <Text fontSize={20} fontWeight="700" color={isDark ? '#F9FAFB' : '#111827'}>
                              {Math.round(editPreviewNutrition.carbs * 10) / 10}g
                            </Text>
                            <Text fontSize={12} color={isDark ? '#9CA3AF' : '#6B7280'}>
                              carbs
                            </Text>
                          </YStack>
                          <YStack alignItems="center">
                            <Text fontSize={20} fontWeight="700" color={isDark ? '#F9FAFB' : '#111827'}>
                              {Math.round(editPreviewNutrition.fat * 10) / 10}g
                            </Text>
                            <Text fontSize={12} color={isDark ? '#9CA3AF' : '#6B7280'}>
                              fat
                            </Text>
                          </YStack>
                        </XStack>
                      </Card>
                    )}

                    {/* Action Buttons */}
                    <YStack gap="$2" marginTop="$2">
                      <Button
                        size="$4"
                        backgroundColor="#10B981"
                        color="white"
                        onPress={handleSaveEdit}
                      >
                        Save Changes
                      </Button>
                      <Button
                        size="$4"
                        backgroundColor="#EF4444"
                        color="white"
                        icon={Trash2}
                        onPress={() => editingEntry && handleDeleteEntry(editingEntry.id, editingEntry.foodName)}
                      >
                        Delete Entry
                      </Button>
                    </YStack>
                  </YStack>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SwipeableDateHeader>
  );
}
