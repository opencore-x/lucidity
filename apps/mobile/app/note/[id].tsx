import * as React from 'react';
import { ScrollView, View, ActivityIndicator } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import Markdown from 'react-native-markdown-display';
import { useColorScheme } from 'nativewind';
import { useNote } from '@/hooks/useNotes';

export default function NoteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const path = id ?? '';
  const { data: note, isLoading } = useNote(path);

  const { colorScheme } = useColorScheme();
  const dark = colorScheme === 'dark';
  const textColor = dark ? '#E5E5E7' : '#1C1C1E';

  return (
    <>
      <Stack.Screen options={{ title: note?.title ?? 'Note', headerBackTitle: 'Notes' }} />
      <View className="bg-background flex-1">
        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" />
          </View>
        ) : (
          <ScrollView
            contentInsetAdjustmentBehavior="automatic"
            contentContainerStyle={{ padding: 16 }}>
            <Markdown
              style={{
                body: { color: textColor, fontSize: 16, lineHeight: 24 },
                heading1: { color: textColor, fontWeight: '700' },
                heading2: { color: textColor, fontWeight: '700' },
                code_inline: { color: textColor },
                fence: { color: textColor },
              }}>
              {note?.body ?? ''}
            </Markdown>
          </ScrollView>
        )}
      </View>
    </>
  );
}
