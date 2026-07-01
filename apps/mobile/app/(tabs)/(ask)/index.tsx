import * as React from 'react';
import {
  View,
  ScrollView,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Stack } from 'expo-router';
import Markdown from 'react-native-markdown-display';
import { ArrowUp } from 'lucide-react-native';
import { useColorScheme, useThemeColors } from '@/hooks/useColorScheme';
import { layout } from '@/lib/layout';
import { useLucidAsk, type AskMessage } from '@/hooks/useLucidAsk';

const ACCENT = '#0A84FF';
const MUTED = '#8E8E93';

function markdownStyles(textColor: string, codeBg: string) {
  return {
    body: { color: textColor, fontSize: 16, lineHeight: 24 },
    text: { color: textColor },
    heading1: { color: textColor, fontSize: 22, lineHeight: 30, fontWeight: '700' as const, marginTop: 6, marginBottom: 6 },
    heading2: { color: textColor, fontSize: 19, lineHeight: 26, fontWeight: '700' as const, marginTop: 6, marginBottom: 4 },
    heading3: { color: textColor, fontSize: 17, lineHeight: 24, fontWeight: '600' as const, marginTop: 4, marginBottom: 4 },
    link: { color: ACCENT },
    code_inline: { color: textColor, backgroundColor: codeBg, borderRadius: 4, paddingHorizontal: 4 },
    fence: { color: textColor, backgroundColor: codeBg, borderRadius: 8, padding: 12 },
    code_block: { color: textColor, backgroundColor: codeBg, borderRadius: 8, padding: 12 },
    blockquote: { backgroundColor: codeBg, borderColor: MUTED, borderLeftWidth: 3, paddingHorizontal: 12 },
  };
}

function UserBubble({ text }: { text: string }) {
  return (
    <View style={{ alignSelf: 'flex-end', maxWidth: '85%', backgroundColor: ACCENT, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 9, marginVertical: 4 }}>
      <Text style={{ color: '#FFFFFF', fontSize: 16, lineHeight: 22 }}>{text}</Text>
    </View>
  );
}

function LucidBubble({ msg, mdStyle }: { msg: AskMessage; mdStyle: ReturnType<typeof markdownStyles> }) {
  return (
    <View style={{ alignSelf: 'flex-start', maxWidth: '92%', marginVertical: 4, paddingHorizontal: 2 }}>
      {msg.state === 'streaming' && !msg.text ? (
        <View style={[layout.row, { paddingVertical: 6 }]}>
          <ActivityIndicator size="small" color={MUTED} />
          <Text style={{ color: MUTED, fontSize: 15 }}>Lucid is thinking…</Text>
        </View>
      ) : msg.state === 'error' ? (
        <Text style={{ color: '#FF6B6B', fontSize: 15, lineHeight: 21 }}>{msg.text}</Text>
      ) : (
        <Markdown style={mdStyle}>{msg.text}</Markdown>
      )}
    </View>
  );
}

function StatusBanner({
  status,
  closeCode,
  onReconnect,
  bg,
  border,
}: {
  status: string;
  closeCode: number | null;
  onReconnect: () => void;
  bg: string;
  border: string;
}) {
  if (status === 'open') return null;
  let label = 'Connecting to Lucid…';
  let showRetry = false;
  if (status === 'closed') {
    label = closeCode === 4401 ? 'Not authorized — try signing in again.' : 'Disconnected from Lucid.';
    showRetry = true;
  }
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: bg, borderBottomWidth: 1, borderBottomColor: border }}>
      {status === 'connecting' ? <ActivityIndicator size="small" color={MUTED} /> : null}
      <Text style={{ color: MUTED, fontSize: 13 }}>{label}</Text>
      {showRetry ? (
        <Pressable onPress={onReconnect} hitSlop={8}>
          <Text style={{ color: ACCENT, fontSize: 13, fontWeight: '600' }}>Reconnect</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export default function AskLucidScreen() {
  const { colorScheme } = useColorScheme();
  const colors = useThemeColors();
  const dark = colorScheme === 'dark';
  const textColor = dark ? '#E5E5E7' : '#1C1C1E';
  const codeBg = dark ? '#2C2C2E' : '#F2F2F7';
  const inputBg = dark ? '#1C1C1E' : '#F2F2F7';

  const { messages, status, sending, closeCode, send, reconnect } = useLucidAsk();
  const [draft, setDraft] = React.useState('');
  const scrollRef = React.useRef<ScrollView>(null);
  const mdStyle = React.useMemo(() => markdownStyles(textColor, codeBg), [textColor, codeBg]);

  const onSend = () => {
    const t = draft.trim();
    if (!t || sending) return;
    send(t);
    setDraft('');
  };

  const canSend = draft.trim().length > 0 && !sending;

  return (
    <>
      <Stack.Screen options={{ title: 'Lucid' }} />
      <View style={[layout.flex1, { backgroundColor: colors.background }]}>
        <StatusBanner status={status} closeCode={closeCode} onReconnect={reconnect} bg={colors.card} border={colors.border} />
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            ref={scrollRef}
            contentInsetAdjustmentBehavior="automatic"
            contentContainerStyle={{ padding: 16, flexGrow: 1 }}
            keyboardDismissMode="interactive"
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}>
            {messages.length === 0 ? (
              <View style={[layout.center, { paddingVertical: 80 }]}>
                <Text style={{ color: MUTED, fontSize: 16, textAlign: 'center', paddingHorizontal: 24 }}>
                  Ask Lucid about your day — your tasks, what to focus on, or a quick briefing.
                </Text>
              </View>
            ) : (
              messages.map((m) =>
                m.role === 'user' ? (
                  <UserBubble key={m.id} text={m.text} />
                ) : (
                  <LucidBubble key={m.id} msg={m} mdStyle={mdStyle} />
                ),
              )
            )}
          </ScrollView>

          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 12, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background }}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Ask Lucid…"
              placeholderTextColor={MUTED}
              multiline
              style={{ flex: 1, maxHeight: 120, minHeight: 40, backgroundColor: inputBg, borderRadius: 20, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 10, fontSize: 16, color: textColor }}
            />
            <Pressable
              onPress={onSend}
              disabled={!canSend}
              style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: canSend ? ACCENT : colors.border }}>
              <ArrowUp size={22} color="#FFFFFF" />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </View>
    </>
  );
}
