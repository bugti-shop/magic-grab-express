import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

/**
 * Configure the Android/iOS status bar to blend seamlessly with the app
 */
export const configureStatusBar = async (isDarkMode: boolean) => {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    const platform = Capacitor.getPlatform();
    
    // iOS: overlay so safe-area CSS works as expected.
    // Android: do NOT overlay — WebView sits between system bars, so
    // env(safe-area-inset-*) stays 0 and the UI matches the web exactly.
    if (platform === 'ios') {
      await StatusBar.setOverlaysWebView({ overlay: true });
    } else {
      await StatusBar.setOverlaysWebView({ overlay: false });
    }
    
    // Set status bar icons to contrast with app background
    await StatusBar.setStyle({
      style: isDarkMode ? Style.Dark : Style.Light,
    });

    // Set background color — transparent on iOS, match theme on Android
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
      style: isDarkMode ? Style.Dark : Style.Light,
    });
    
    // Update Android status bar background color to match theme
    if (Capacitor.getPlatform() === 'android') {
      await StatusBar.setBackgroundColor({ color: isDarkMode ? '#1a1a2e' : '#ffffff' });
    }
  } catch (error) {
    console.warn('[StatusBar] Style update failed:', error);
  }
};
