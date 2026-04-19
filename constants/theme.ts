import { Platform } from 'react-native';

// Light theme — red, black, white
export const Colors = {
  background: '#FFFFFF',
  surface: '#F5F5F5',
  surfaceElevated: '#FFFFFF',
  border: '#E0E0E0',

  // Red accent
  accent: '#E53935',
  accentDark: '#B71C1C',
  accentLight: '#EF5350',

  // Text
  textPrimary: '#000000',
  textSecondary: '#444444',
  textMuted: '#888888',

  // Status
  success: '#22C55E',

  // Tab bar
  tabBar: '#FFFFFF',
  tabIconDefault: '#888888',
  tabIconSelected: '#E53935',

  // Legacy shape required by expo-router (light/dark keys)
  light: {
    text: '#000000',
    background: '#FFFFFF',
    tint: '#E53935',
    icon: '#444444',
    tabIconDefault: '#888888',
    tabIconSelected: '#E53935',
  },
  dark: {
    text: '#000000',
    background: '#FFFFFF',
    tint: '#E53935',
    icon: '#444444',
    tabIconDefault: '#888888',
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
