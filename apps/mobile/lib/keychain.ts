import * as Keychain from 'react-native-keychain';
import { Platform } from 'react-native';

const APP_GROUP = 'group.com.lucidity.app';
const API_KEY_SERVICE = 'com.lucidity.api-key';

/**
 * Save API key to iOS Keychain with App Group access.
 * Note: iOS Shortcuts cannot read Keychain, so use manual shortcut with copied API key.
 */
export async function saveApiKeyToKeychain(apiKey: string): Promise<boolean> {
  if (Platform.OS !== 'ios') {
    console.warn('Keychain API key storage is only supported on iOS');
    return false;
  }

  try {
    // Try with App Group first (for future native App Intent)
    await Keychain.setGenericPassword('api-key', apiKey, {
      service: API_KEY_SERVICE,
      accessGroup: APP_GROUP,
      accessible: Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK,
    });
    console.log('✅ API key saved to Keychain with App Group access');
    return true;
  } catch (error) {
    console.warn('⚠️ App Group access failed, trying without App Group...');

    // Fallback: save without App Group
    try {
      await Keychain.setGenericPassword('api-key', apiKey, {
        service: API_KEY_SERVICE,
        accessible: Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK,
      });
      console.log('✅ API key saved to Keychain (App Group pending)');
      return true;
    } catch (fallbackError) {
      console.error('❌ Failed to save API key to Keychain:', fallbackError);
      return false;
    }
  }
}

/**
 * Retrieve API key from iOS Keychain.
 * Used by the app to verify what's stored in Keychain.
 */
export async function getApiKeyFromKeychain(): Promise<string | null> {
  if (Platform.OS !== 'ios') {
    return null;
  }

  try {
    // Try with App Group first
    const credentials = await Keychain.getGenericPassword({
      service: API_KEY_SERVICE,
      accessGroup: APP_GROUP,
    });

    if (credentials && credentials.password) {
      return credentials.password;
    }
  } catch (error) {
    // Fallback: try without App Group
    try {
      const credentials = await Keychain.getGenericPassword({
        service: API_KEY_SERVICE,
      });

      if (credentials && credentials.password) {
        return credentials.password;
      }
    } catch (fallbackError) {
      console.warn('Failed to retrieve API key from Keychain:', fallbackError);
    }
  }

  return null;
}

/**
 * Remove API key from iOS Keychain.
 * Called when the key is revoked.
 */
export async function removeApiKeyFromKeychain(): Promise<boolean> {
  if (Platform.OS !== 'ios') {
    return false;
  }

  let removed = false;

  // Try to remove from App Group storage
  try {
    await Keychain.resetGenericPassword({
      service: API_KEY_SERVICE,
      accessGroup: APP_GROUP,
    });
    removed = true;
  } catch (error) {
    // Ignore, try fallback
  }

  // Also try to remove from non-App Group storage (fallback)
  try {
    await Keychain.resetGenericPassword({
      service: API_KEY_SERVICE,
    });
    removed = true;
  } catch (error) {
    // Ignore
  }

  return removed;
}
