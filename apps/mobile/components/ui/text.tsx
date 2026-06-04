import * as React from 'react';
import { Text as RNText } from 'react-native';

import { useThemeColors } from '@/hooks/useColorScheme';
import { FONTS } from '@/lib/fonts';

/**
 * Base app text: theme foreground color + the active font family. Replaces the
 * former NativeWind/cva variant component — no `variant` was ever used in the app,
 * so the whole class-variance system was dead weight. Pass `style` to override;
 * values there win over the defaults.
 */
function Text({ style, ...props }: React.ComponentProps<typeof RNText>) {
  const colors = useThemeColors();
  return (
    <RNText
      style={[{ color: colors.foreground, fontFamily: FONTS.regular, fontSize: 16 }, style]}
      {...props}
    />
  );
}

export { Text };
