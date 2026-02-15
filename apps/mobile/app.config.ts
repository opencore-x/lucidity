import { ExpoConfig, ConfigContext } from "expo/config";
import * as dotenv from "dotenv";
import * as path from "path";

const APP_ENV = process.env.APP_ENV || "development";

const envFile = APP_ENV === "production" ? ".env.production" : ".env";
dotenv.config({ path: path.resolve(__dirname, "../..", envFile), override: true });

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Lucidity",
  slug: "lucidity",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "lucidity",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  splash: {
    image: "./assets/images/splash.png",
    resizeMode: "contain",
    backgroundColor: "#000000",
  },
  assetBundlePatterns: ["**/*"],
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.lucidity.app",
  },
  android: {
    edgeToEdgeEnabled: true,
    adaptiveIcon: {
      foregroundImage: "./assets/images/adaptive-icon.png",
      backgroundColor: "#000000",
    },
    package: "com.lucidity.app",
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    "expo-web-browser",
    "@react-native-community/datetimepicker",
    "expo-notifications",
    "expo-quick-actions",
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    APP_ENV,
    clerkPublishableKey: process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY,
    apiUrl: process.env.EXPO_PUBLIC_API_URL,
  },
});
