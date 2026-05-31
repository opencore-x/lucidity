import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { useEnvStore } from '@/stores/envStore';

// Resolved per-request (not cached at module load) so the in-app environment toggle
// takes effect immediately. Falls back to the build-time config if the store is empty.
const getApiUrl = () => {
  const baseUrl =
    useEnvStore.getState().apiUrl() ||
    Constants.expoConfig?.extra?.apiUrl ||
    'http://localhost:3000';
  // Android emulator uses 10.0.2.2 to access host machine's localhost
  if (Platform.OS === 'android' && baseUrl.includes('localhost')) {
    return baseUrl.replace('localhost', '10.0.2.2');
  }
  return baseUrl;
};

export type TokenGetter = () => Promise<string | null>;

let tokenGetter: TokenGetter | null = null;

export function setTokenGetter(getter: TokenGetter) {
  tokenGetter = getter;
}

export async function apiClient<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = tokenGetter ? await tokenGetter() : null;

  const response = await fetch(`${getApiUrl()}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `API Error: ${response.status}`);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}
