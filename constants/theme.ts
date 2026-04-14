import { Platform } from 'react-native';

// Dark theme only — forced app-wide
export const Colors = {
  background: '#1a1a1a',
  surface: '#242424',
  surfaceElevated: '#2e2e2e',
  border: '#333333',

  // Red accent
  accent: '#E53935',
  accentDark: '#B71C1C',
  accentLight: '#EF5350',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',

  // Status
  success: '#22C55E',

  // Tab bar
  tabBar: '#111111',
  tabIconDefault: '#6B7280',
  tabIconSelected: '#E53935',

  // Legacy shape required by expo-router (light/dark keys)
  light: {
    text: '#FFFFFF',
    background: '#1a1a1a',
    tint: '#E53935',
    icon: '#9CA3AF',
    tabIconDefault: '#6B7280',
    tabIconSelected: '#E53935',
  },
  dark: {
    text: '#FFFFFF',
    background: '#1a1a1a',
    tint: '#E53935',
    icon: '#9CA3AF',
    tabIconDefault: '#6B7280',
    tabIconSelected: '#E53935',
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
