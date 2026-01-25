import { useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useAuthStore } from '../stores/auth.store';
import { useDiaryStore } from '../stores/diary.store';
import { useGoalsStore } from '../stores/goals.store';

/**
 * Hook to manage automatic data syncing with cloud
 * Syncs when:
 * - User logs in
 * - App comes to foreground
 * - Selected date changes (for diary)
 */
export function useSync() {
  const { isAuthenticated, getAccessToken } = useAuthStore();
  const { selectedDate, syncEntriesForDate, syncUnsyncedEntries, isSyncing: isDiarySyncing } = useDiaryStore();
  const { syncGoals, isSyncing: isGoalsSyncing } = useGoalsStore();
  
  const lastSyncedDate = useRef<string | null>(null);
  const hasInitialSynced = useRef(false);

  // Sync current date's entries
  const syncCurrentDate = useCallback(async () => {
    if (!isAuthenticated) return;
    
    const token = await getAccessToken();
    if (!token) return;

    await syncEntriesForDate(selectedDate, token);
  }, [isAuthenticated, getAccessToken, selectedDate, syncEntriesForDate]);

  // Full sync - goals and diary
  const fullSync = useCallback(async () => {
    if (!isAuthenticated) return;
    
    const token = await getAccessToken();
    if (!token) return;

    // Sync in parallel
    await Promise.all([
      syncGoals(token),
      syncEntriesForDate(selectedDate, token),
    ]);

    // Sync any unsynced local entries
    await syncUnsyncedEntries(token);
  }, [isAuthenticated, getAccessToken, selectedDate, syncGoals, syncEntriesForDate, syncUnsyncedEntries]);

  // Initial sync on auth
  useEffect(() => {
    if (isAuthenticated && !hasInitialSynced.current) {
      hasInitialSynced.current = true;
      fullSync();
    } else if (!isAuthenticated) {
      hasInitialSynced.current = false;
    }
  }, [isAuthenticated, fullSync]);

  // Sync when selected date changes
  useEffect(() => {
    if (selectedDate !== lastSyncedDate.current && isAuthenticated) {
      lastSyncedDate.current = selectedDate;
      syncCurrentDate();
    }
  }, [selectedDate, isAuthenticated, syncCurrentDate]);

  // Sync when app comes to foreground
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && isAuthenticated) {
        syncCurrentDate();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [isAuthenticated, syncCurrentDate]);

  return {
    isSyncing: isDiarySyncing || isGoalsSyncing,
    syncCurrentDate,
    fullSync,
  };
}

/**
 * Hook to get auth token for API calls
 */
export function useAuthToken() {
  const { isAuthenticated, getAccessToken } = useAuthStore();

  const getToken = useCallback(async () => {
    if (!isAuthenticated) return null;
    return getAccessToken();
  }, [isAuthenticated, getAccessToken]);

  return { isAuthenticated, getToken };
}
