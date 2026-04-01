import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

/**
 * Configure the Android/iOS status bar to blend seamlessly with the app.
 *
 * Capacitor Style enum:
 *   Style.Dark  → dark (black) icons — use on LIGHT backgrounds
 *   Style.Light → light (white) icons — use on DARK backgrounds
 */
export const configureStatusBar = async (isDarkMode: boolean) => {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    const platform = Capacitor.getPlatform();

    // iOS uses overlay so safe-area works normally.
    // Android should not overlay so the layout matches the web exactly.
    await StatusBar.setOverlaysWebView({ overlay: platform === 'ios' });

    // White icons on dark bg, dark icons on light bg
    await StatusBar.setStyle({
      style: isDarkMode ? Style.Light : Style.Dark,
    });

    // Android status bar background should blend with the app
    if (platform === 'android') {
      await StatusBar.setBackgroundColor({ color: isDarkMode ? '#1a1a2e' : '#ffffff' });
    }

    console.log('[StatusBar] Configured successfully for', isDarkMode ? 'dark' : 'light', 'mode');
  } catch (error) {
    console.warn('[StatusBar] Configuration failed:', error);
  }
};

/**
 * Update status bar style when theme changes
 */
export const updateStatusBarStyle = async (isDarkMode: boolean) => {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    await StatusBar.setStyle({
      style: isDarkMode ? Style.Light : Style.Dark,
    });

    if (Capacitor.getPlatform() === 'android') {
      await StatusBar.setBackgroundColor({ color: isDarkMode ? '#1a1a2e' : '#ffffff' });
    }
  } catch (error) {
    console.warn('[StatusBar] Style update failed:', error);
  }
};
