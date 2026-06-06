import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

export const PROD_API_URL = 'https://api.lucidity.my';
const DEFAULT_DEV_URL = 'http://localhost:3001';

export type ApiEnv = 'production' | 'development';

// Seed defaults from the build so existing dev/prod builds behave unchanged until
// the user overrides them: a production build (extra.apiUrl === PROD) defaults to
// Production; any other build (a local dev build) defaults to Development and seeds
// the dev URL from the build's .env. Persisted choices win after hydration.
const buildUrl = Constants.expoConfig?.extra?.apiUrl as string | undefined;
const isProdBuild = buildUrl === PROD_API_URL;

interface EnvState {
  env: ApiEnv;
  devUrl: string;
  /** Gates the developer-only Settings (API environment switch). */
  developerMode: boolean;
  setEnv: (env: ApiEnv) => void;
  setDevUrl: (devUrl: string) => void;
  setDeveloperMode: (developerMode: boolean) => void;
  /** The active base URL for the API client. */
  apiUrl: () => string;
}

// expo-secure-store adapter for zustand's persist middleware (async getItem/setItem).
const secureStorage = {
  getItem: (name: string) => SecureStore.getItemAsync(name),
  setItem: (name: string, value: string) => SecureStore.setItemAsync(name, value),
  removeItem: (name: string) => SecureStore.deleteItemAsync(name),
};

export const useEnvStore = create<EnvState>()(
  persist(
    (set, get) => ({
      env: isProdBuild ? 'production' : 'development',
      devUrl: isProdBuild ? DEFAULT_DEV_URL : (buildUrl ?? DEFAULT_DEV_URL),
      // Dev builds default to developer mode on (dogfooding); prod builds off until
      // the user opts in. Persisted, so the choice sticks after first launch.
      developerMode: !isProdBuild,
      setEnv: (env) => set({ env }),
      setDevUrl: (devUrl) => set({ devUrl }),
      setDeveloperMode: (developerMode) => set({ developerMode }),
      apiUrl: () => (get().env === 'production' ? PROD_API_URL : get().devUrl),
    }),
    {
      name: 'lucidity-env',
      storage: createJSONStorage(() => secureStorage),
      // Persist only the user's choices (not the computed getter / actions).
      partialize: (state) => ({
        env: state.env,
        devUrl: state.devUrl,
        developerMode: state.developerMode,
      }),
    }
  )
);
