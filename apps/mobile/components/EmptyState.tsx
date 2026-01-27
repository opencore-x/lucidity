import * as React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';

interface EmptyStateProps {
  title?: string;
  message?: string;
}

export function EmptyState({
  title = 'No tasks yet',
  message = 'Tap + to add your first task',
}: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center p-8">
      <Text className="text-6xl mb-4">📝</Text>
      <Text className="text-xl font-semibold text-foreground mb-2">
        {title}
      </Text>
      <Text className="text-muted-foreground text-center">{message}</Text>
    </View>
  );
}
