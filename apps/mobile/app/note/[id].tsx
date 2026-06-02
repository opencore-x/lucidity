import * as React from 'react';
import {
  ScrollView,
  View,
  ActivityIndicator,
  TextInput,
  Pressable,
  Text,
  KeyboardAvoidingView,
  Platform,
  useColorScheme,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import Markdown from 'react-native-markdown-display';
import { useNote, useWriteNote } from '@/hooks/useNotes';

const ACCENT = '#0A84FF';
const MUTED = '#8E8E93';

export default function NoteScreen() {
  const { id, edit } = useLocalSearchParams<{ id: string; edit?: string }>();
  const path = id ?? '';
  const { data: note, isLoading } = useNote(path);
  const writeNote = useWriteNote();

  const colorScheme = useColorScheme();
  const dark = colorScheme === 'dark';
  const textColor = dark ? '#E5E5E7' : '#1C1C1E';
  const codeBg = dark ? '#2C2C2E' : '#F2F2F7';

  const [editing, setEditing] = React.useState(edit === '1');
  const [draft, setDraft] = React.useState('');
  const initialized = React.useRef(false);

  // Seed the draft once, when the note first loads (works for new notes opened
  // straight into edit mode); after that the draft is user-owned.
  React.useEffect(() => {
    if (note && !initialized.current) {
      setDraft(note.content);
      initialized.current = true;
    }
  }, [note?.content]);

  const save = React.useCallback(async () => {
    try {
      await writeNote.mutateAsync({ path, content: draft, mode: 'overwrite' });
      setEditing(false);
    } catch {
      // keep editing so the user doesn't lose their text
    }
  }, [writeNote, path, draft]);

  const headerRight = React.useCallback(
    () =>
      editing ? (
        <Pressable onPress={save} disabled={writeNote.isPending} hitSlop={8}>
          <Text style={{ color: ACCENT, fontSize: 17, fontWeight: '600' }}>Done</Text>
        </Pressable>
      ) : (
        <Pressable onPress={() => setEditing(true)} hitSlop={8}>
          <Text style={{ color: ACCENT, fontSize: 17 }}>Edit</Text>
        </Pressable>
      ),
    [editing, save, writeNote.isPending]
  );

  return (
    <>
      <Stack.Screen
        options={{ title: note?.title ?? 'Note', headerBackTitle: 'Notes', headerRight }}
      />
      <View className="bg-background flex-1">
        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" />
          </View>
        ) : editing ? (
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              multiline
              autoFocus
              placeholder={'# Title\n\nStart writing…'}
              placeholderTextColor={MUTED}
              style={{
                flex: 1,
                padding: 16,
                fontSize: 15,
                lineHeight: 22,
                color: textColor,
                fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                textAlignVertical: 'top',
              }}
            />
          </KeyboardAvoidingView>
        ) : (
          <ScrollView
            contentInsetAdjustmentBehavior="automatic"
            contentContainerStyle={{ padding: 16 }}>
            <Markdown
              style={{
                body: { color: textColor, fontSize: 16, lineHeight: 24 },
                // color the actual text spans, not just the wrapper (fixes dark mode)
                text: { color: textColor },
                heading1: { color: textColor, fontSize: 28, lineHeight: 36, fontWeight: '700', marginTop: 8, marginBottom: 8 },
                heading2: { color: textColor, fontSize: 22, lineHeight: 30, fontWeight: '700', marginTop: 8, marginBottom: 6 },
                heading3: { color: textColor, fontSize: 18, lineHeight: 26, fontWeight: '600', marginTop: 6, marginBottom: 4 },
                link: { color: ACCENT },
                code_inline: { color: textColor, backgroundColor: codeBg, borderRadius: 4, paddingHorizontal: 4 },
                fence: { color: textColor, backgroundColor: codeBg, borderRadius: 8, padding: 12 },
                code_block: { color: textColor, backgroundColor: codeBg, borderRadius: 8, padding: 12 },
                blockquote: { backgroundColor: codeBg, borderColor: MUTED, borderLeftWidth: 3, paddingHorizontal: 12 },
              }}>
              {note?.body ?? ''}
            </Markdown>
          </ScrollView>
        )}
      </View>
    </>
  );
}
