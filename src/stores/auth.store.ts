import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  signIn,
  signUp,
  signOut,
  confirmSignUp,
  getCurrentUser,
  fetchAuthSession,
  AuthUser,
} from 'aws-amplify/auth';

interface AuthState {
  // State
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  checkAuthState: () => Promise<boolean>;
  login: (email: string, password: string) => Promise<{ success: boolean; needsConfirmation?: boolean }>;
  register: (email: string, password: string) => Promise<{ success: boolean; needsConfirmation?: boolean }>;
  confirmRegistration: (email: string, code: string) => Promise<boolean>;
  logout: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Check current auth state
      checkAuthState: async () => {
        set({ isLoading: true, error: null });
        try {
          const user = await getCurrentUser();
          set({ user, isAuthenticated: true, isLoading: false });
          return true;
        } catch {
          set({ user: null, isAuthenticated: false, isLoading: false });
          return false;
        }
      },

      // Login
      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const result = await signIn({
            username: email.toLowerCase().trim(),
            password,
          });

          if (result.isSignedIn) {
            const user = await getCurrentUser();
            set({ user, isAuthenticated: true, isLoading: false });
            return { success: true };
          } else if (result.nextStep.signInStep === 'CONFIRM_SIGN_UP') {
            set({ isLoading: false });
            return { success: false, needsConfirmation: true };
          }

          set({ isLoading: false });
          return { success: false };
        } catch (error: any) {
          // Extract error code from Amplify v6 error structure
          const errorCode = 
            error?.name || 
            error?.code || 
            error?.underlyingError?.name ||
            error?.cause?.name ||
            '';
          const errorMsg = error?.message || '';
          
          let userMessage = 'Login failed. Please try again.';
          
          if (errorCode === 'UserNotFoundException' || errorMsg.includes('User does not exist')) {
            userMessage = 'No account found with this email.';
          } else if (errorCode === 'NotAuthorizedException' || errorMsg.includes('Incorrect')) {
            userMessage = 'Incorrect password.';
          } else if (errorCode === 'UserNotConfirmedException') {
            userMessage = 'Please verify your email first.';
          } else if (errorCode === 'LimitExceededException') {
            userMessage = 'Too many attempts. Try again later.';
          } else if (errorMsg && !errorMsg.includes('Unknown')) {
            userMessage = errorMsg;
          }
          
          set({ error: userMessage, isLoading: false });
          return { success: false };
        }
      },

      // Register
      register: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const result = await signUp({
            username: email.toLowerCase().trim(),
            password,
            options: {
              userAttributes: {
                email: email.toLowerCase().trim(),
              },
            },
          });

          set({ isLoading: false });

          if (result.isSignUpComplete) {
            return { success: true };
          } else {
            return { success: true, needsConfirmation: true };
          }
        } catch (error: any) {
          set({ error: error.message || 'Registration failed', isLoading: false });
          return { success: false };
        }
      },

      // Confirm registration with code
      confirmRegistration: async (email: string, code: string) => {
        set({ isLoading: true, error: null });
        try {
          await confirmSignUp({
            username: email.toLowerCase().trim(),
            confirmationCode: code,
          });
          set({ isLoading: false });
          return true;
        } catch (error: any) {
          set({ error: error.message || 'Confirmation failed', isLoading: false });
          return false;
        }
      },

      // Logout
      logout: async () => {
        set({ isLoading: true });
        try {
          await signOut();
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          set({ user: null, isAuthenticated: false, isLoading: false, error: null });
        }
      },

      // Get access token for API calls
      getAccessToken: async () => {
        try {
          const session = await fetchAuthSession();
          return session.tokens?.accessToken?.toString() || null;
        } catch {
          return null;
        }
      },

      // Clear error
      clearError: () => set({ error: null }),
    }),
    {
      name: 'meal-tracker-auth',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        // Only persist minimal auth state - actual auth is checked on app start
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
