import { createTamagui } from 'tamagui';
import { createInterFont } from '@tamagui/font-inter';
import { shorthands } from '@tamagui/shorthands';
import { themes, tokens } from '@tamagui/themes';
import { createMedia } from '@tamagui/react-native-media-driver';

// Create fonts
const headingFont = createInterFont({
  size: {
    1: 12,
    2: 14,
    3: 16,
    4: 18,
    5: 20,
    6: 24,
    7: 28,
    8: 32,
    9: 40,
    10: 48,
  },
  weight: {
    4: '400',
    5: '500',
    6: '600',
    7: '700',
  },
});

const bodyFont = createInterFont({
  size: {
    1: 12,
    2: 14,
    3: 16,
    4: 18,
    5: 20,
    6: 24,
  },
  weight: {
    4: '400',
    5: '500',
    6: '600',
  },
});

// Custom app tokens extending defaults
const appTokens = {
  ...tokens,
  color: {
    ...tokens.color,
    // Brand colors
    primary: '#10B981', // Emerald green - health/nutrition theme
    primaryLight: '#34D399',
    primaryDark: '#059669',
    
    // Macro colors
    proteinColor: '#EF4444', // Red
    carbsColor: '#3B82F6', // Blue
    fatColor: '#F59E0B', // Amber
    fiberColor: '#8B5CF6', // Purple
    
    // Semantic colors
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
    
    // Backgrounds
    bgPrimary: '#FFFFFF',
    bgSecondary: '#F9FAFB',
    bgTertiary: '#F3F4F6',
    
    // Text
    textPrimary: '#111827',
    textSecondary: '#6B7280',
    textTertiary: '#9CA3AF',
  },
  space: {
    ...tokens.space,
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    '2xl': 48,
  },
  radius: {
    ...tokens.radius,
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  },
};

// Custom themes
const lightTheme = {
  ...themes.light,
  background: appTokens.color.bgPrimary,
  backgroundHover: appTokens.color.bgSecondary,
  backgroundPress: appTokens.color.bgTertiary,
  backgroundFocus: appTokens.color.bgSecondary,
  color: appTokens.color.textPrimary,
  colorHover: appTokens.color.textPrimary,
  colorPress: appTokens.color.textSecondary,
  colorFocus: appTokens.color.textPrimary,
  borderColor: '#E5E7EB',
  borderColorHover: '#D1D5DB',
  primary: appTokens.color.primary,
  primaryHover: appTokens.color.primaryDark,
};

const darkTheme = {
  ...themes.dark,
  background: '#111827',
  backgroundHover: '#1F2937',
  backgroundPress: '#374151',
  backgroundFocus: '#1F2937',
  color: '#F9FAFB',
  colorHover: '#F9FAFB',
  colorPress: '#D1D5DB',
  colorFocus: '#F9FAFB',
  borderColor: '#374151',
  borderColorHover: '#4B5563',
  primary: appTokens.color.primary,
  primaryHover: appTokens.color.primaryLight,
};

// Media queries
const media = createMedia({
  xs: { maxWidth: 660 },
  sm: { maxWidth: 800 },
  md: { maxWidth: 1020 },
  lg: { maxWidth: 1280 },
  xl: { maxWidth: 1420 },
  xxl: { maxWidth: 1600 },
  gtXs: { minWidth: 660 + 1 },
  gtSm: { minWidth: 800 + 1 },
  gtMd: { minWidth: 1020 + 1 },
  gtLg: { minWidth: 1280 + 1 },
  short: { maxHeight: 820 },
  tall: { minHeight: 820 },
  hoverNone: { hover: 'none' },
  pointerCoarse: { pointer: 'coarse' },
});

// Create Tamagui config
const config = createTamagui({
  defaultTheme: 'light',
  shouldAddPrefersColorThemes: true,
  themeClassNameOnRoot: true,
  shorthands,
  fonts: {
    heading: headingFont,
    body: bodyFont,
  },
  themes: {
    light: lightTheme,
    dark: darkTheme,
  },
  tokens: appTokens,
  media,
});

export type AppConfig = typeof config;

declare module 'tamagui' {
  interface TamaguiCustomConfig extends AppConfig {}
}

export default config;
