import { Platform } from 'react-native';

const isIOS26 = Platform.OS === 'ios' && parseInt(Platform.Version as string, 10) >= 26;

export const LARGE_TITLE_SCREEN_OPTIONS = {
  headerLargeTitle: true,
  headerLargeTitleStyle: { fontWeight: 'bold', fontSize: 38 },
  headerTitleStyle: { fontWeight: 'bold', fontSize: 19 },
  headerShadowVisible: false,
  headerLargeTitleShadowVisible: false,
  headerTransparent: Platform.OS === 'ios',
  headerBlurEffect: isIOS26 ? undefined : ('regular' as const),
} as const;
