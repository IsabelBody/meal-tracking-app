import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { DEFAULT_FAST_GOAL, FastingSession } from '../types/fasting';
import { formatDateKey, getISOTimestamp, getTodayKey } from '../utils/date';

interface FastingState {
  // Data
  sessions: Record<string, FastingSession[]>; // Keyed by date (YYYY-MM-DD)
  activeFastId: string | null;
  selectedDate: string;

  // Actions
  setSelectedDate: (date: string | Date) => void;
  startFast: (customStartTime?: string) => FastingSession;
  endFast: (endTime?: string) => void;
  deleteFast: (sessionId: string) => void;
  updateFastGoal: (sessionId: string, goalDuration: number) => void;
  getSessionForDate: (date: string) => FastingSession | undefined;
  getActiveFast: () => FastingSession | null;
}

export const useFastingStore = create<FastingState>()(
  persist(
    (set, get) => ({
      // Initial state
      sessions: {},
      activeFastId: null,
      selectedDate: getTodayKey(),

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
    }),
    {
      name: 'meal-tracker-fasting',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        sessions: state.sessions,
        activeFastId: state.activeFastId,
        selectedDate: state.selectedDate,
      }),
    }
  )
);

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
