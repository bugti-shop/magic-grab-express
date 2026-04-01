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
    
    // Overlay on both platforms so WebView goes full-screen and
    // env(safe-area-inset-*) works identically to the web.
    await StatusBar.setOverlaysWebView({ overlay: true });
    
    // Set status bar icons to contrast with app background
    await StatusBar.setStyle({
      style: isDarkMode ? Style.Dark : Style.Light,
    });

    // Transparent background on both platforms when overlaying
    if (platform === 'android') {
      await StatusBar.setBackgroundColor({ color: '#00000000' });
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
