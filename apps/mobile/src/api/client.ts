import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const getApiUrl = () => {
  const baseUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
  // Android emulator uses 10.0.2.2 to access host machine's localhost
  if (Platform.OS === 'android' && baseUrl.includes('localhost')) {
    return baseUrl.replace('localhost', '10.0.2.2');
  }
  return baseUrl;
};

const API_URL = getApiUrl();

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await SecureStore.getItemAsync('__clerk_client_jwt');

  const response = await fetch(`${API_URL}${endpoint}`, {
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
