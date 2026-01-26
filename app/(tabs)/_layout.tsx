import { Book, Camera, ChevronLeft, ChevronRight, List, PieChart, Plus, Search, Timer, User, UtensilsCrossed, X } from '@tamagui/lucide-icons';
import { Tabs, useRouter } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, TouchableWithoutFeedback, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Separator, Text, XStack, YStack } from 'tamagui';

function AddButton({ activeColor, inactiveColor }: { activeColor: string; inactiveColor: string }) {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [modalVisible, setModalVisible] = useState(false);
  const [showCustomMealMenu, setShowCustomMealMenu] = useState(false);
  const insets = useSafeAreaInsets();

  const handleCloseModal = () => {
    setModalVisible(false);
    setShowCustomMealMenu(false);
  };

  const handleOptionPress = (option: 'scan' | 'search' | 'selectMeal' | 'createMeal') => {
    handleCloseModal();
    // Small delay to let modal close before navigation
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
  };

  const renderMainMenu = () => (
    <>
      {/* Header */}
      <XStack paddingHorizontal="$4" paddingVertical="$3" justifyContent="space-between" alignItems="center">
        <Text fontSize={18} fontWeight="600" color={isDark ? '#F9FAFB' : '#111827'}>
          Add Food
        </Text>
        <Pressable onPress={handleCloseModal}>
          <X size={24} color={isDark ? '#9CA3AF' : '#6B7280'} />
        </Pressable>
      </XStack>

      <Separator backgroundColor={isDark ? '#374151' : '#E5E7EB'} />

      {/* Options */}
      <YStack paddingHorizontal="$4" paddingTop="$2">
        <Pressable onPress={() => handleOptionPress('scan')}>
          <XStack
            paddingVertical="$4"
            alignItems="center"
            gap="$3"
          >
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

        <Pressable onPress={() => handleOptionPress('search')}>
          <XStack
            paddingVertical="$4"
            alignItems="center"
            gap="$3"
          >
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

        <Pressable onPress={() => setShowCustomMealMenu(true)}>
          <XStack
            paddingVertical="$4"
            alignItems="center"
            gap="$3"
          >
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
  );

  const renderCustomMealMenu = () => (
    <>
      {/* Header with back button */}
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

      {/* Custom Meal Options */}
      <YStack paddingHorizontal="$4" paddingTop="$2">
        <Pressable onPress={() => handleOptionPress('selectMeal')}>
          <XStack
            paddingVertical="$4"
            alignItems="center"
            gap="$3"
          >
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
          <XStack
            paddingVertical="$4"
            alignItems="center"
            gap="$3"
          >
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
  );

  return (
    <>
      <Pressable
        onPress={() => setModalVisible(true)}
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: 4,
        }}
      >
        <YStack
          width={48}
          height={48}
          borderRadius={24}
          backgroundColor={activeColor}
          alignItems="center"
          justifyContent="center"
          marginTop={-20}
        >
          <Plus size={28} color="white" />
        </YStack>
        <Text
          fontSize={12}
          fontWeight="500"
          color={inactiveColor}
          marginTop={4}
        >
          Add
        </Text>
      </Pressable>

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

                {showCustomMealMenu ? renderCustomMealMenu() : renderMainMenu()}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === 'dark';

  const activeColor = '#10B981';
  const inactiveColor = isDark ? '#9CA3AF' : '#6B7280';
  const backgroundColor = isDark ? '#111827' : '#FFFFFF';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: inactiveColor,
        tabBarStyle: {
          backgroundColor,
          borderTopColor: isDark ? '#374151' : '#E5E7EB',
          height: 60 + insets.bottom,
          paddingBottom: 8 + insets.bottom,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Diary',
          tabBarIcon: ({ color, size }) => <Book size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="nutrients"
        options={{
          title: 'Nutrients',
          tabBarIcon: ({ color, size }) => <PieChart size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: 'Add',
          tabBarButton: () => (
            <AddButton activeColor={activeColor} inactiveColor={inactiveColor} />
          ),
        }}
        listeners={{
          tabPress: (e) => {
            // Prevent default navigation - the popover handles it
            e.preventDefault();
          },
        }}
      />
      <Tabs.Screen
        name="fasting"
        options={{
          title: 'Fasting',
          tabBarIcon: ({ color, size }) => <Timer size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
      {/* Hidden screens - accessible via navigation but not shown in tab bar */}
      <Tabs.Screen
        name="search"
        options={{
          href: null, // Hide from tab bar
        }}
      />
      <Tabs.Screen
        name="scanner"
        options={{
          href: null, // Hide from tab bar
        }}
      />
    </Tabs>
  );
}
