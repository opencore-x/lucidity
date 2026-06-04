import * as React from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { useThemeColors } from '@/hooks/useColorScheme';
import { FONTS } from '@/lib/fonts';

interface EmptyStateProps {
  title?: string;
  message?: string;
}

export function EmptyState({
  title = 'No tasks yet',
  message = 'Tap + to add your first task',
}: EmptyStateProps) {
  const colors = useThemeColors();
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>📝</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={[styles.message, { color: colors.mutedForeground }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emoji: { fontSize: 60, marginBottom: 16 },
  title: { fontSize: 20, fontFamily: FONTS.semibold, marginBottom: 8 },
  message: { textAlign: 'center' },
});
