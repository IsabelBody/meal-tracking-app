import { AlertTriangle, Camera, ChevronLeft, Flashlight, FlashlightOff, History, Search } from '@tamagui/lucide-icons';
import { BarcodeScanningResult, CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    Button,
    Card,
    Paragraph,
    Spinner,
    Text,
    XStack,
    YStack,
} from 'tamagui';

import { MacroItemGroup } from '../../src/components';
import { getProductByBarcode } from '../../src/services/api/openfoodfacts';
import { useAvoidFoodsStore } from '../../src/stores/avoid-foods.store';
import { useFoodSearchStore } from '../../src/stores/food-search.store';
import { useDraftItemCount, useIsActivelyBuildingMeal, useIsEditingMeal } from '../../src/stores/meal.store';
import { NormalizedFood } from '../../src/types';

type ScannerView = 'menu' | 'scanner' | 'history' | 'result';

export default function ScannerScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [currentView, setCurrentView] = useState<ScannerView>('menu');
  const [torch, setTorch] = useState(false);
  const [scannedProduct, setScannedProduct] = useState<NormalizedFood | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Recent scans from store
  const recentScans = useFoodSearchStore((state) => state.recentScans);
  const addRecentScan = useFoodSearchStore((state) => state.addRecentScan);

  // Check for avoided ingredients
  const checkIngredients = useAvoidFoodsStore((state) => state.checkIngredients);
  const avoidCheck = useMemo(
    () => checkIngredients(scannedProduct?.ingredients),
    [scannedProduct?.ingredients, checkIngredients]
  );

  // Check if actively building a meal
  const isActivelyBuildingMeal = useIsActivelyBuildingMeal();
  const draftItemCount = useDraftItemCount();
  const isEditingMeal = useIsEditingMeal();

  const handleBarcodeScanned = async (result: BarcodeScanningResult) => {
    if (currentView !== 'scanner' || isLoading) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const product = await getProductByBarcode(result.data);
      
      if (product) {
        setScannedProduct(product);
        addRecentScan(product);
        setCurrentView('result');
      } else {
        setError(`No product found for barcode: ${result.data}`);
        setCurrentView('menu');
      }
    } catch (err) {
      setError('Failed to lookup barcode. Please try again.');
      setCurrentView('menu');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddFood = () => {
    if (scannedProduct) {
      // Navigate to add food screen with the scanned product data
      router.push({
        pathname: '/add-food',
        params: { 
          foodData: JSON.stringify(scannedProduct),
          source: 'barcode',
        },
      });
    }
  };

  const handleScanAgain = () => {
    setScannedProduct(null);
    setError(null);
    setCurrentView('scanner');
  };

  const handleManualSearch = () => {
    router.push('/(tabs)/search');
  };

  const handleSelectPreviousScan = (food: NormalizedFood) => {
    setScannedProduct(food);
    setCurrentView('result');
  };

  const handleBackToMenu = () => {
    setScannedProduct(null);
    setError(null);
    setCurrentView('menu');
  };

  // Permission not determined yet
  if (!permission) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="$background" paddingTop={insets.top}>
        <Spinner size="large" color="#10B981" />
      </YStack>
    );
  }

  // Permission denied
  if (!permission.granted) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" padding="$4" paddingTop={insets.top} backgroundColor="$background">
        <Camera size={64} color="$colorHover" />
        <Text fontSize="$6" fontWeight="600" marginTop="$4" textAlign="center" color="$color">
          Camera Access Required
        </Text>
        <Paragraph textAlign="center" color="$colorHover" marginTop="$2" marginBottom="$4">
          We need camera access to scan food barcodes. This helps you quickly log nutrition information.
        </Paragraph>
        <Button
          size="$4"
          backgroundColor="#10B981"
          color="white"
          onPress={requestPermission}
        >
          Grant Camera Access
        </Button>
        <Button
          size="$4"
          marginTop="$3"
          backgroundColor="$background"
          borderWidth={1}
          borderColor="$borderColor"
          onPress={handleManualSearch}
          icon={Search}
        >
          Search Instead
        </Button>
      </YStack>
    );
  }

  // Menu View - Choice between Scan Now and Previously Scanned
  if (currentView === 'menu') {
    return (
      <YStack flex={1} backgroundColor="$background" paddingTop={insets.top}>
        <YStack flex={1} padding="$4" justifyContent="center" gap="$4">
          <Text fontSize="$8" fontWeight="700" textAlign="center" color="$color" marginBottom="$4">
            Barcode Scanner
          </Text>

          {/* Error message if any */}
          {error && (
            <Card 
              padding="$3" 
              marginBottom="$2"
              backgroundColor={isDark ? '#450A0A' : '#FEF2F2'} 
              borderWidth={1}
              borderColor={isDark ? '#7F1D1D' : '#FECACA'}
            >
              <Text color={isDark ? '#FCA5A5' : '#DC2626'} textAlign="center" fontSize="$3">{error}</Text>
            </Card>
          )}

          {/* Scan Now Button */}
          <Button
            size="$6"
            backgroundColor="#10B981"
            color="white"
            icon={Camera}
            onPress={() => setCurrentView('scanner')}
          >
            Scan Now
          </Button>

          {/* Previously Scanned Button */}
          <Button
            size="$5"
            backgroundColor="$background"
            borderWidth={1}
            borderColor="$borderColor"
            icon={History}
            onPress={() => setCurrentView('history')}
            disabled={recentScans.length === 0}
            opacity={recentScans.length === 0 ? 0.5 : 1}
          >
            {`Previously Scanned (${recentScans.length})`}
          </Button>

          {/* Manual Search Option */}
          <Button
            size="$4"
            backgroundColor="transparent"
            color="$colorHover"
            icon={Search}
            onPress={handleManualSearch}
          >
            Search Manually
          </Button>
        </YStack>
      </YStack>
    );
  }

  // History View - Previously Scanned Items
  if (currentView === 'history') {
    return (
      <YStack flex={1} backgroundColor="$background" paddingTop={insets.top}>
        {/* Header */}
        <XStack paddingHorizontal="$4" paddingVertical="$3" alignItems="center" gap="$3">
          <Button
            size="$3"
            circular
            backgroundColor="transparent"
            icon={ChevronLeft}
            onPress={handleBackToMenu}
          />
          <Text fontSize="$6" fontWeight="600" color="$color" flex={1}>
            Previously Scanned
          </Text>
        </XStack>

        {/* List of scanned items */}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 12 }}>
          {recentScans.map((food) => (
            <Card
              key={food.id}
              padding="$3"
              pressStyle={{ opacity: 0.8 }}
              onPress={() => handleSelectPreviousScan(food)}
            >
              <XStack justifyContent="space-between" alignItems="center">
                <YStack flex={1} gap="$1">
                  <Text fontSize="$4" fontWeight="600" color="$color" numberOfLines={1}>
                    {food.name}
                  </Text>
                  {food.brand && (
                    <Text fontSize="$3" color="$colorHover" numberOfLines={1}>
                      {food.brand}
                    </Text>
                  )}
                  {food.servings[0] && (
                    <Text fontSize="$2" color="$colorHover">
                      {`${Math.round(food.servings[0].nutrition.calories)} cal`}
                    </Text>
                  )}
                </YStack>
                <ChevronLeft size={20} color="$colorHover" style={{ transform: [{ rotate: '180deg' }] }} />
              </XStack>
            </Card>
          ))}
        </ScrollView>
      </YStack>
    );
  }

  // Scanner View - Camera
  if (currentView === 'scanner') {
    return (
      <YStack flex={1} backgroundColor="black">
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          enableTorch={torch}
          barcodeScannerSettings={{
            barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'],
          }}
          onBarcodeScanned={handleBarcodeScanned}
        />

        {/* Scanning Overlay */}
        <YStack
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          justifyContent="center"
          alignItems="center"
        >
          {/* Back Button */}
          <Button
            position="absolute"
            top={insets.top + 10}
            left={16}
            size="$4"
            circular
            backgroundColor="rgba(0,0,0,0.5)"
            icon={ChevronLeft}
            onPress={handleBackToMenu}
          />

          {/* Scan Frame */}
          <YStack
            width={280}
            height={200}
            borderWidth={3}
            borderColor="white"
            borderRadius="$4"
            justifyContent="center"
            alignItems="center"
          >
            {isLoading && <Spinner size="large" color="white" />}
          </YStack>
          
          <Text color="white" marginTop="$4" fontSize="$4">
            Point at a barcode to scan
          </Text>

          {/* Torch Toggle */}
          <XStack position="absolute" bottom={100} gap="$4">
            <Button
              size="$5"
              circular
              backgroundColor={torch ? '#10B981' : 'rgba(255,255,255,0.3)'}
              icon={torch ? Flashlight : FlashlightOff}
              onPress={() => setTorch(!torch)}
            />
            <Button
              size="$5"
              circular
              backgroundColor="rgba(255,255,255,0.3)"
              icon={Search}
              onPress={handleManualSearch}
            />
          </XStack>
        </YStack>
      </YStack>
    );
  }

  // Result View - Scanned Product Details
  if (currentView === 'result' && scannedProduct) {
    return (
      <YStack flex={1} padding="$4" paddingTop={16 + insets.top} backgroundColor="$background">
        {/* Meal Building Indicator */}
        {isActivelyBuildingMeal && (
          <Card
            padding="$3"
            marginBottom="$3"
            backgroundColor="#3B82F620"
            borderWidth={1}
            borderColor="#3B82F6"
          >
            <XStack alignItems="center" gap="$2">
              <Camera size={20} color="#3B82F6" />
              <YStack flex={1}>
                <Text fontWeight="600" color="#3B82F6" fontSize="$3">
                  {isEditingMeal ? 'Editing a meal' : 'Creating a meal'}
                </Text>
                <Text fontSize="$2" color="#3B82F6">
                  {draftItemCount > 0 
                    ? `${draftItemCount} item${draftItemCount !== 1 ? 's' : ''} in meal`
                    : 'Add this item to your meal'}
                </Text>
              </YStack>
            </XStack>
          </Card>
        )}

        {/* Avoided Ingredients Warning */}
        {avoidCheck.hasAvoidedIngredients && (
          <Card
            padding="$3"
            marginBottom="$3"
            backgroundColor="#EF444420"
            borderWidth={1}
            borderColor="#EF4444"
          >
            <XStack alignItems="center" gap="$2">
              <AlertTriangle size={20} color="#EF4444" />
              <YStack flex={1}>
                <Text fontWeight="600" color="#EF4444" fontSize="$3">
                  Contains ingredients to avoid
                </Text>
                <Text fontSize="$2" color="#EF4444">
                  {avoidCheck.matchedTerms.slice(0, 3).join(', ')}
                  {avoidCheck.matchedTerms.length > 3 && ` +${avoidCheck.matchedTerms.length - 3} more`}
                </Text>
              </YStack>
            </XStack>
          </Card>
        )}

        <Card elevate bordered padding="$4" marginBottom="$4">
          <YStack gap="$2">
            <Text fontSize="$6" fontWeight="700" color="$color">
              {scannedProduct.name}
            </Text>
            {scannedProduct.brand && (
              <Text fontSize="$4" color="$colorHover">
                {scannedProduct.brand}
              </Text>
            )}
          </YStack>

          {scannedProduct.servings[0] && (
            <YStack marginTop="$4" gap="$2">
              <Text fontWeight="600" color="$color">
                Nutrition per {scannedProduct.servings[0].description}
              </Text>
              <YStack marginTop="$2">
                <MacroItemGroup
                  calories={scannedProduct.servings[0].nutrition.calories}
                  protein={scannedProduct.servings[0].nutrition.protein}
                  carbs={scannedProduct.servings[0].nutrition.carbs}
                  fat={scannedProduct.servings[0].nutrition.fat}
                />
              </YStack>
            </YStack>
          )}
        </Card>

        <YStack gap="$3">
          <Button
            size="$5"
            backgroundColor="#10B981"
            color="white"
            onPress={handleAddFood}
          >
            {isActivelyBuildingMeal ? 'Add Food...' : 'Add to Diary'}
          </Button>
          <Button
            size="$4"
            backgroundColor="$background"
            borderWidth={1}
            borderColor="$borderColor"
            icon={Camera}
            onPress={handleScanAgain}
          >
            Scan Another
          </Button>
          <Button
            size="$4"
            backgroundColor="transparent"
            color="$colorHover"
            onPress={handleBackToMenu}
          >
            Back to Menu
          </Button>
        </YStack>
      </YStack>
    );
  }

  // Fallback (shouldn't happen)
  return (
    <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="$background">
      <Spinner size="large" color="#10B981" />
    </YStack>
  );
}

