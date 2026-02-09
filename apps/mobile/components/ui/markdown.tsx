import * as React from 'react';
import { Platform } from 'react-native';
import Markdown, { type MarkdownIt } from 'react-native-markdown-display';
import { useColorScheme } from 'nativewind';
import { THEME } from '@/lib/theme';

interface MarkdownTextProps {
  children: string;
  muted?: boolean;
}

function MarkdownText({ children, muted }: MarkdownTextProps) {
  const { colorScheme } = useColorScheme();
  const theme = THEME[colorScheme ?? 'light'];

  const textColor = muted ? theme.mutedForeground : theme.foreground;

  const styles = React.useMemo(
    () => ({
      body: {
        color: textColor,
        fontSize: 14,
        lineHeight: 20,
        fontFamily: Platform.select({ ios: 'System', android: 'sans-serif' }),
      },
      paragraph: {
        marginTop: 0,
        marginBottom: 4,
      },
      strong: {
        fontWeight: '700' as const,
      },
      em: {
        fontStyle: 'italic' as const,
      },
      heading1: {
        fontSize: 22,
        fontWeight: '700' as const,
        marginTop: 8,
        marginBottom: 4,
        color: muted ? theme.mutedForeground : theme.foreground,
      },
      heading2: {
        fontSize: 20,
        fontWeight: '600' as const,
        marginTop: 8,
        marginBottom: 4,
        color: muted ? theme.mutedForeground : theme.foreground,
      },
      heading3: {
        fontSize: 18,
        fontWeight: '600' as const,
        marginTop: 6,
        marginBottom: 4,
        color: muted ? theme.mutedForeground : theme.foreground,
      },
      code_inline: {
        backgroundColor: theme.muted,
        color: muted ? theme.mutedForeground : theme.foreground,
        borderRadius: 4,
        paddingHorizontal: 4,
        paddingVertical: 1,
        fontSize: 13,
        fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
      },
      fence: {
        backgroundColor: theme.muted,
        borderColor: theme.border,
        borderWidth: 1,
        borderRadius: 6,
        padding: 10,
        marginVertical: 6,
      },
      code_block: {
        backgroundColor: theme.muted,
        borderColor: theme.border,
        borderWidth: 1,
        borderRadius: 6,
        padding: 10,
        marginVertical: 6,
        fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
        fontSize: 13,
        color: muted ? theme.mutedForeground : theme.foreground,
      },
      blockquote: {
        backgroundColor: 'transparent',
        borderLeftWidth: 3,
        borderLeftColor: theme.border,
        paddingLeft: 10,
        marginVertical: 4,
      },
      link: {
        color: 'hsl(217 91% 60%)',
        textDecorationLine: 'none' as const,
      },
      list_item: {
        marginVertical: 2,
      },
      bullet_list: {
        marginVertical: 4,
      },
      ordered_list: {
        marginVertical: 4,
      },
      hr: {
        backgroundColor: theme.border,
        height: 1,
        marginVertical: 8,
      },
    }),
    [textColor, muted, theme]
  );

  return <Markdown style={styles}>{children}</Markdown>;
}

export { MarkdownText };
