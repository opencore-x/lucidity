import * as React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Stack, useRouter, type Href } from 'expo-router';
import { Host, List, Text as UIText } from '@expo/ui/swift-ui';
import {
  listStyle,
  refreshable,
  frame,
  foregroundStyle,
  padding,
} from '@expo/ui/swift-ui/modifiers';
import { useColorScheme } from 'nativewind';
import { UserMenu } from '@/components/user-menu';
import { NoteRow } from '@/components/native/NoteRow';
import { useNotes } from '@/hooks/useNotes';

const MUTED_GRAY = '#8E8E93';

export default function NotesScreen() {
  const { colorScheme } = useColorScheme();
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';
  const router = useRouter();

  const { data: notes = [], isLoading, refetch } = useNotes();

  const headerRight = React.useCallback(() => <UserMenu />, []);
  const onRefresh = React.useCallback(async () => {
    await refetch();
  }, [refetch]);
  const openNote = React.useCallback(
    // The /note/[id] route is real; expo-router regenerates typed-route defs on dev start.
    (path: string) =>
      router.push({ pathname: '/note/[id]', params: { id: path } } as unknown as Href),
    [router]
  );

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Notes', headerRight }} />
        <View className="bg-background flex-1 items-center justify-center">
          <ActivityIndicator size="large" />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Notes', headerRight }} />
      <View className="bg-background flex-1">
        <Host style={{ flex: 1 }} colorScheme={scheme}>
          <List modifiers={[listStyle('insetGrouped'), refreshable(onRefresh)]}>
            {notes.length === 0 ? (
              <UIText
                modifiers={[
                  foregroundStyle(MUTED_GRAY),
                  frame({ maxWidth: Infinity, alignment: 'center' }),
                  padding({ vertical: 56 }),
                ]}>
                No notes yet.
              </UIText>
            ) : (
              notes.map((note) => (
                <NoteRow key={note.path} note={note} onOpen={() => openNote(note.path)} />
              ))
            )}
          </List>
        </Host>
      </View>
    </>
  );
}
