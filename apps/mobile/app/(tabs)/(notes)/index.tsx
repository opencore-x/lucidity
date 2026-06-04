import * as React from 'react';
import { View, ActivityIndicator, Alert } from 'react-native';
import { Stack, useRouter, type Href } from 'expo-router';
import { Host, List, Text as UIText } from '@expo/ui/swift-ui';
import {
  listStyle,
  refreshable,
  frame,
  foregroundStyle,
  padding,
} from '@expo/ui/swift-ui/modifiers';
import { useColorScheme } from '@/hooks/useColorScheme';
import { layout } from '@/lib/layout';
import { COLORS } from '@/lib/theme';
import { UserMenu } from '@/components/user-menu';
import { HeaderGlassButton } from '@/components/native/HeaderGlassButton';
import { NoteRow } from '@/components/native/NoteRow';
import { useNotes, useWriteNote } from '@/hooks/useNotes';

const MUTED_GRAY = '#8E8E93';

export default function NotesScreen() {
  const { colorScheme } = useColorScheme();
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';
  const router = useRouter();

  const { data: notes = [], isLoading, refetch } = useNotes();
  const writeNote = useWriteNote();

  const onRefresh = React.useCallback(async () => {
    await refetch();
  }, [refetch]);

  const openNote = React.useCallback(
    // The /note/[id] route is real; expo-router regenerates typed-route defs on dev start.
    (path: string) => router.push({ pathname: '/note/[id]', params: { id: path } } as unknown as Href),
    [router]
  );

  const handleCreate = React.useCallback(() => {
    Alert.prompt('New note', 'File name', async (name) => {
      const trimmed = (name ?? '').trim();
      if (!trimmed) return;
      const fileName = trimmed.toLowerCase().endsWith('.md') ? trimmed : `${trimmed}.md`;
      const title = fileName.replace(/\.md$/i, '');
      try {
        await writeNote.mutateAsync({ path: fileName, content: `# ${title}\n\n`, mode: 'create' });
        router.push({ pathname: '/note/[id]', params: { id: fileName, edit: '1' } } as unknown as Href);
      } catch (e) {
        Alert.alert('Could not create note', e instanceof Error ? e.message : String(e));
      }
    });
  }, [writeNote, router]);

  const headerRight = React.useCallback(
    () => (
      <View style={layout.row}>
        <HeaderGlassButton systemImage="plus" onPress={handleCreate} />
        <UserMenu />
      </View>
    ),
    [handleCreate]
  );

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Notes', headerRight }} />
        <View style={[layout.center, { backgroundColor: COLORS[scheme].background }]}>
          <ActivityIndicator size="large" />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Notes', headerRight }} />
      <View style={[layout.flex1, { backgroundColor: COLORS[scheme].background }]}>
        <Host style={{ flex: 1 }} colorScheme={scheme}>
          <List modifiers={[listStyle('insetGrouped'), refreshable(onRefresh)]}>
            {notes.length === 0 ? (
              <UIText
                modifiers={[
                  foregroundStyle(MUTED_GRAY),
                  frame({ maxWidth: Infinity, alignment: 'center' }),
                  padding({ vertical: 56 }),
                ]}>
                No notes yet — tap + to create one.
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
