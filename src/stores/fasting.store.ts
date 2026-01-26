import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { getFastingSessions } from '../services/api/user-data';
import { DEFAULT_FAST_GOAL, FastingSession } from '../types/fasting';
import { formatDateKey, getISOTimestamp, getTodayKey } from '../utils/date';

interface FastingState {
  sessions: Record<string, FastingSession[]>;
  activeFastId: string | null;
  selectedDate: string;
  _hasHydrated: boolean;

  setSelectedDate: (date: string | Date) => void;
  startFast: (customStartTime?: string) => FastingSession;
  endFast: (endTime?: string) => void;
  deleteFast: (sessionId: string) => void;
  updateFastGoal: (sessionId: string, goalDuration: number) => void;
  updateFastTimes: (sessionId: string, startTime?: string, endTime?: string) => void;
  getSessionForDate: (date: string) => FastingSession | undefined;
  getActiveFast: () => FastingSession | null;
  setHasHydrated: (state: boolean) => void;
  syncFasting: (token: string) => Promise<void>;
}

export const useFastingStore = create<FastingState>()(
  persist(
    (set, get) => ({
      // Initial state
      sessions: {},
      activeFastId: null,
      selectedDate: getTodayKey(),
      _hasHydrated: false,
      
      setHasHydrated: (state) => {
        set({ _hasHydrated: state });
      },

      // Actions
      setSelectedDate: (date) => {
        const dateKey = typeof date === 'string' ? date : formatDateKey(date);
        set({ selectedDate: dateKey });
      },

      startFast: (customStartTime) => {
        const id = uuidv4();
        const startTime = customStartTime || getISOTimestamp();
        const today = getTodayKey();

        const newSession: FastingSession = {
          id,
          startTime,
          endTime: null,
          goalDuration: DEFAULT_FAST_GOAL,
          date: today,
        };

        set((state) => {
          const dateSessions = state.sessions[today] || [];
          return {
            sessions: {
              ...state.sessions,
              [today]: [...dateSessions, newSession],
            },
            activeFastId: id,
          };
        });

        return newSession;
      },

      endFast: (endTime) => {
        const { activeFastId, sessions } = get();
        if (!activeFastId) return;

        const timestamp = endTime || getISOTimestamp();

        set((state) => {
          const newSessions = { ...state.sessions };

          for (const date in newSessions) {
            const index = newSessions[date].findIndex((s) => s.id === activeFastId);
            if (index !== -1) {
              newSessions[date] = [...newSessions[date]];
              newSessions[date][index] = {
                ...newSessions[date][index],
                endTime: timestamp,
              };
              break;
            }
          }

          return {
            sessions: newSessions,
            activeFastId: null,
          };
        });
      },

      deleteFast: (sessionId) => {
        const { activeFastId } = get();

        set((state) => {
          const newSessions = { ...state.sessions };

          for (const date in newSessions) {
            const index = newSessions[date].findIndex((s) => s.id === sessionId);
            if (index !== -1) {
              newSessions[date] = newSessions[date].filter((s) => s.id !== sessionId);
              // Clean up empty date entries
              if (newSessions[date].length === 0) {
                delete newSessions[date];
              }
              break;
            }
          }

          return {
            sessions: newSessions,
            // Clear activeFastId if we deleted the active fast
            activeFastId: activeFastId === sessionId ? null : activeFastId,
          };
        });
      },

      updateFastGoal: (sessionId, goalDuration) => {
        set((state) => {
          const newSessions = { ...state.sessions };

          for (const date in newSessions) {
            const index = newSessions[date].findIndex((s) => s.id === sessionId);
            if (index !== -1) {
              newSessions[date] = [...newSessions[date]];
              newSessions[date][index] = {
                ...newSessions[date][index],
                goalDuration,
              };
              break;
            }
          }

          return { sessions: newSessions };
        });
      },

      updateFastTimes: (sessionId, startTime, endTime) => {
        const { activeFastId } = get();
        
        // Prevent updating times of an active fast
        if (activeFastId === sessionId) {
          console.warn('Cannot update times of an active fast. End the fast first.');
          return;
        }

        set((state) => {
          const newSessions = { ...state.sessions };

          for (const date in newSessions) {
            const index = newSessions[date].findIndex((s) => s.id === sessionId);
            if (index !== -1) {
              const session = newSessions[date][index];
              
              // Only allow updating completed fasts
              if (!session.endTime) {
                console.warn('Cannot update times of an incomplete fast.');
                return state;
              }

              newSessions[date] = [...newSessions[date]];
              const updates: Partial<FastingSession> = {};
              
              if (startTime !== undefined) {
                // Validate start time is before end time
                const newStartTime = new Date(startTime).getTime();
                const currentEndTime = new Date(session.endTime).getTime();
                if (newStartTime >= currentEndTime) {
                  console.warn('Start time must be before end time.');
                  return state;
                }
                updates.startTime = startTime;
              }
              
              if (endTime !== undefined) {
                // Validate end time is after start time
                const currentStartTime = new Date(session.startTime).getTime();
                const newEndTime = new Date(endTime).getTime();
                if (newEndTime <= currentStartTime) {
                  console.warn('End time must be after start time.');
                  return state;
                }
                updates.endTime = endTime;
              }
              
              newSessions[date][index] = {
                ...session,
                ...updates,
              };
              break;
            }
          }

          return { sessions: newSessions };
        });
      },

      getSessionForDate: (date) => {
        const sessions = get().sessions[date] || [];
        // Return the most recent session for this date
        return sessions[sessions.length - 1];
      },

      getActiveFast: () => {
        const { activeFastId, sessions } = get();
        if (!activeFastId) return null;

        for (const date in sessions) {
          const session = sessions[date].find((s) => s.id === activeFastId);
          if (session) return session;
        }
        return null;
      },

      syncFasting: async (token) => {
        const res = await getFastingSessions(token);
        if (res.error || !res.data) return;
        const byDate: Record<string, FastingSession[]> = {};
        for (const s of res.data.sessions) {
          const d = s.date;
          if (!byDate[d]) byDate[d] = [];
          byDate[d].push(s);
        }
        set((state) => ({ sessions: { ...state.sessions, ...byDate } }));
      },
    }),
    {
      name: 'meal-tracker-fasting',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        sessions: state.sessions,
        activeFastId: state.activeFastId,
        selectedDate: state.selectedDate,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

// Helper hook to check if hydration is complete
export function useFastingHydrated() {
  return useFastingStore((state) => state._hasHydrated);
}

// Helper hook to get the active fast
export function useActiveFast() {
  return useFastingStore((state) => {
    if (!state.activeFastId) return null;
    for (const date in state.sessions) {
      const session = state.sessions[date].find((s) => s.id === state.activeFastId);
      if (session) return session;
    }
    return null;
  });
}

// Stable empty array for when no sessions exist
const EMPTY_SESSIONS: FastingSession[] = [];

// Helper hook to get all sessions for selected date
export function useSelectedDateSessions() {
  return useFastingStore((state) => {
    return state.sessions[state.selectedDate] || EMPTY_SESSIONS;
  });
}

// Helper hook to get sessions for a specific date
export function useDateSessions(date: string) {
  return useFastingStore((state) => {
    return state.sessions[date] || EMPTY_SESSIONS;
  });
}

// Helper hook to calculate fasting progress
export function useFastingProgress(session: FastingSession | null, currentTime: number) {
  return useMemo(() => {
    if (!session) {
      return { elapsed: 0, progress: 0, isComplete: false };
    }

    const startTime = new Date(session.startTime).getTime();
    const endTime = session.endTime ? new Date(session.endTime).getTime() : currentTime;
    // Ensure elapsed is never negative
    const elapsed = Math.max(0, endTime - startTime);
    const progress = Math.min(100, (elapsed / session.goalDuration) * 100);
    const isComplete = elapsed >= session.goalDuration;

    return { elapsed, progress, isComplete };
  }, [session, currentTime]);
}
