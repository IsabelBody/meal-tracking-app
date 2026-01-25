import { Camera, Flashlight, FlashlightOff, Search } from '@tamagui/lucide-icons';
import { BarcodeScanningResult, CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';
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
import { NormalizedFood } from '../../src/types';

export default function ScannerScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(true);
  const [torch, setTorch] = useState(false);
  const [scannedProduct, setScannedProduct] = useState<NormalizedFood | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleBarcodeScanned = async (result: BarcodeScanningResult) => {
    if (!isScanning || isLoading) return;
    
    setIsScanning(false);
    setIsLoading(true);
    setError(null);

    try {
      const product = await getProductByBarcode(result.data);
      
      if (product) {
        setScannedProduct(product);
      } else {
        setError(`No product found for barcode: ${result.data}`);
      }
    } catch (err) {
      setError('Failed to lookup barcode. Please try again.');
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
    setIsScanning(true);
  };

  const handleManualSearch = () => {
    router.push('/(tabs)/search');
  };

  // Permission not determined yet
  if (!permission) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="$background">
        <Spinner size="large" color="#10B981" />
      </YStack>
    );
  }

  // Permission denied
  if (!permission.granted) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" padding="$4" backgroundColor="$background">
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

  return (
    <YStack flex={1} backgroundColor="black">
      {/* Camera View */}
      {isScanning && (
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          enableTorch={torch}
          barcodeScannerSettings={{
            barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'],
          }}
          onBarcodeScanned={handleBarcodeScanned}
        />
      )}

      {/* Scanning Overlay */}
      {isScanning && (
        <YStack
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          justifyContent="center"
          alignItems="center"
        >
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
      )}

      {/* Scanned Product Result */}
      {scannedProduct && (
        <YStack flex={1} padding="$4" backgroundColor="$background">
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
              Add to Diary
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
          </YStack>
        </YStack>
      )}

      {/* Error State */}
      {error && (
        <YStack flex={1} padding="$4" justifyContent="center" backgroundColor="$background">
          <Card padding="$4" backgroundColor="#FEF2F2" marginBottom="$4">
            <Text color="#DC2626" textAlign="center">{error}</Text>
          </Card>
          <YStack gap="$3">
            <Button
              size="$5"
              backgroundColor="#10B981"
              color="white"
              icon={Camera}
              onPress={handleScanAgain}
            >
              Try Again
            </Button>
            <Button
              size="$4"
              backgroundColor="$background"
              borderWidth={1}
              borderColor="$borderColor"
              icon={Search}
              onPress={handleManualSearch}
            >
              Search Manually
            </Button>
          </YStack>
        </YStack>
      )}
    </YStack>
  );
}

