import { Stack } from 'expo-router';
import { Platform } from 'react-native';

const isIOS26 = Platform.OS === 'ios' && parseInt(Platform.Version as string, 10) >= 26;

export default function ProjectsLayout() {
  return (
    <Stack
      screenOptions={{
        headerLargeTitle: true,
        headerLargeTitleStyle: { fontWeight: 'bold', fontSize: 38 },
        headerTitleStyle: { fontWeight: 'bold', fontSize: 19 },
        headerShadowVisible: false,
        headerLargeTitleShadowVisible: false,
        headerTransparent: Platform.OS === 'ios',
        headerBlurEffect: isIOS26 ? undefined : 'regular',
      }}
    />
  );
}
