import { Cloud, LogIn, LogOut, Settings, Target, User } from '@tamagui/lucide-icons';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, ScrollView, useColorScheme } from 'react-native';
import {
  Button,
  Card,
  H3,
  Input,
  Label,
  Separator,
  Spinner,
  Switch,
  Text,
  XStack,
  YStack,
} from 'tamagui';

import { useAuthStore } from '../../src/stores/auth.store';
import { useGoalsStore } from '../../src/stores/goals.store';
import { DEFAULT_GOALS } from '../../src/types';

export default function ProfileScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { goals, profile, updateGoals, updateProfile, resetGoals, isSyncing } = useGoalsStore();
  const { isAuthenticated, user, logout, getAccessToken, isLoading: authLoading } = useAuthStore();

  // Local state for editing
  const [editedGoals, setEditedGoals] = useState({
    calories: String(goals.calories),
    protein: String(goals.protein),
    carbs: String(goals.carbs),
    fat: String(goals.fat),
    fiber: String(goals.fiber || 25),
  });

  const handleSaveGoals = useCallback(async () => {
    const newGoals = {
      calories: parseInt(editedGoals.calories, 10) || DEFAULT_GOALS.calories,
      protein: parseInt(editedGoals.protein, 10) || DEFAULT_GOALS.protein,
      carbs: parseInt(editedGoals.carbs, 10) || DEFAULT_GOALS.carbs,
      fat: parseInt(editedGoals.fat, 10) || DEFAULT_GOALS.fat,
      fiber: parseInt(editedGoals.fiber, 10) || DEFAULT_GOALS.fiber,
    };
    
    // Get token for cloud sync if authenticated
    const token = isAuthenticated ? await getAccessToken() : null;
    await updateGoals(newGoals, token || undefined);
    
    Alert.alert('Success', 'Your goals have been updated.');
  }, [editedGoals, isAuthenticated, getAccessToken, updateGoals]);

  const handleLogout = useCallback(async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await logout();
            Alert.alert('Signed Out', 'You have been signed out. Your local data is preserved.');
          },
        },
      ]
    );
  }, [logout]);

  const handleLogin = useCallback(() => {
    router.push('/(auth)/login');
  }, [router]);

  const handleResetGoals = () => {
    Alert.alert(
      'Reset Goals',
      'Are you sure you want to reset your goals to defaults?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            resetGoals();
            setEditedGoals({
              calories: String(DEFAULT_GOALS.calories),
              protein: String(DEFAULT_GOALS.protein),
              carbs: String(DEFAULT_GOALS.carbs),
              fat: String(DEFAULT_GOALS.fat),
              fiber: String(DEFAULT_GOALS.fiber),
            });
          },
        },
      ]
    );
  };

  const handleToggleUnits = () => {
    updateProfile({
      unitSystem: profile.unitSystem === 'metric' ? 'imperial' : 'metric',
    });
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: isDark ? '#111827' : '#F9FAFB' }}
      contentContainerStyle={{ padding: 16 }}
    >
      {/* Goals Section */}
      <Card elevate bordered padding="$4" marginBottom="$4" backgroundColor="$background">
        <XStack alignItems="center" gap="$2" marginBottom="$4">
          <Target size={24} color="#10B981" />
          <H3 color="$color">Daily Goals</H3>
        </XStack>

        <YStack gap="$4">
          {/* Calories */}
          <YStack gap="$2">
            <Label htmlFor="calories" color="$color">
              Daily Calories
            </Label>
            <Input
              id="calories"
              value={editedGoals.calories}
              onChangeText={(text) =>
                setEditedGoals((prev) => ({ ...prev, calories: text }))
              }
              keyboardType="numeric"
              placeholder="2000"
            />
          </YStack>

          <Separator />

          {/* Macros */}
          <Text fontWeight="600" color="$color">Macronutrients (grams)</Text>
          
          <XStack gap="$3">
            <YStack flex={1} gap="$2">
              <Label htmlFor="protein" fontSize="$2" color="$colorHover">
                Protein
              </Label>
              <Input
                id="protein"
                value={editedGoals.protein}
                onChangeText={(text) =>
                  setEditedGoals((prev) => ({ ...prev, protein: text }))
                }
                keyboardType="numeric"
                placeholder="150"
                size="$3"
              />
            </YStack>

            <YStack flex={1} gap="$2">
              <Label htmlFor="carbs" fontSize="$2" color="$colorHover">
                Carbs
              </Label>
              <Input
                id="carbs"
                value={editedGoals.carbs}
                onChangeText={(text) =>
                  setEditedGoals((prev) => ({ ...prev, carbs: text }))
                }
                keyboardType="numeric"
                placeholder="250"
                size="$3"
              />
            </YStack>

            <YStack flex={1} gap="$2">
              <Label htmlFor="fat" fontSize="$2" color="$colorHover">
                Fat
              </Label>
              <Input
                id="fat"
                value={editedGoals.fat}
                onChangeText={(text) =>
                  setEditedGoals((prev) => ({ ...prev, fat: text }))
                }
                keyboardType="numeric"
                placeholder="65"
                size="$3"
              />
            </YStack>
          </XStack>

          {/* Fiber */}
          <YStack gap="$2">
            <Label htmlFor="fiber" fontSize="$2" color="$colorHover">
              Fiber (optional)
            </Label>
            <Input
              id="fiber"
              value={editedGoals.fiber}
              onChangeText={(text) =>
                setEditedGoals((prev) => ({ ...prev, fiber: text }))
              }
              keyboardType="numeric"
              placeholder="25"
              size="$3"
            />
          </YStack>

          <XStack gap="$3" marginTop="$2">
            <Button
              flex={1}
              backgroundColor="#10B981"
              color="white"
              onPress={handleSaveGoals}
            >
              Save Goals
            </Button>
            <Button
              backgroundColor="$background"
              borderWidth={1}
              borderColor="$borderColor"
              onPress={handleResetGoals}
            >
              Reset
            </Button>
          </XStack>
        </YStack>
      </Card>

      {/* Preferences Section */}
      <Card elevate bordered padding="$4" marginBottom="$4" backgroundColor="$background">
        <XStack alignItems="center" gap="$2" marginBottom="$4">
          <Settings size={24} color="#10B981" />
          <H3 color="$color">Preferences</H3>
        </XStack>

        <XStack justifyContent="space-between" alignItems="center">
          <YStack>
            <Text fontWeight="500" color="$color">Unit System</Text>
            <Text fontSize="$2" color="$colorHover">
              Currently: {profile.unitSystem === 'metric' ? 'Metric (g, kg)' : 'Imperial (oz, lb)'}
            </Text>
          </YStack>
          <Switch
            checked={profile.unitSystem === 'imperial'}
            onCheckedChange={handleToggleUnits}
            backgroundColor={profile.unitSystem === 'imperial' ? '#10B981' : '$backgroundHover'}
          >
            <Switch.Thumb animation="bouncy" />
          </Switch>
        </XStack>
      </Card>

      {/* Account Section */}
      <Card elevate bordered padding="$4" marginBottom="$4" backgroundColor="$background">
        <XStack alignItems="center" gap="$2" marginBottom="$4">
          <User size={24} color="#10B981" />
          <H3 color="$color">Account</H3>
        </XStack>

        {isAuthenticated ? (
          <YStack gap="$3">
            <XStack alignItems="center" gap="$2">
              <Cloud size={16} color="#10B981" />
              <Text fontSize="$2" color="#10B981">Cloud sync enabled</Text>
            </XStack>
            <YStack gap="$1">
              <Text fontWeight="500" color="$color">Signed in as</Text>
              <Text fontSize="$3" color="$colorHover">{user?.signInDetails?.loginId || 'User'}</Text>
            </YStack>
            <Separator />
            <Button
              backgroundColor="$background"
              borderWidth={1}
              borderColor="$borderColor"
              icon={authLoading ? undefined : LogOut}
              onPress={handleLogout}
              disabled={authLoading}
            >
              {authLoading ? <Spinner /> : 'Sign Out'}
            </Button>
          </YStack>
        ) : (
          <YStack gap="$3">
            <Text fontSize="$3" color="$colorHover">
              Sign in to sync your data across devices and back up your progress.
            </Text>
            <Button
              backgroundColor="#10B981"
              color="white"
              icon={LogIn}
              onPress={handleLogin}
            >
              Sign In
            </Button>
          </YStack>
        )}
      </Card>

    </ScrollView>
  );
}
