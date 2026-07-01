import * as React from 'react';
import Constants from 'expo-constants';
import { useAuth } from '@clerk/clerk-expo';
import { useEnvStore } from '@/stores/envStore';
import { LucidRoomClient, roomWsUrl, type RoomStatus } from '@/lib/roomClient';

export interface AskMessage {
  id: string;
  role: 'user' | 'lucid';
  text: string;
  state?: 'streaming' | 'done' | 'error';
}

/** Resolve the REST API base the same way api/client.ts does (env toggle → build config → default). */
function resolveApiUrl(): string {
  return (
    useEnvStore.getState().apiUrl() ||
    (Constants.expoConfig?.extra?.apiUrl as string | undefined) ||
    'http://localhost:3001'
  );
}

/**
 * Drives the "Ask Lucid" screen: holds one {@link LucidRoomClient}, a transcript
 * of user/lucid turns, and the socket status. Each `send` appends the user turn
 * plus a streaming Lucid turn that fills in from delta events.
 */
export function useLucidAsk() {
  const { getToken } = useAuth();
  const getTokenRef = React.useRef(getToken);
  getTokenRef.current = getToken;

  const [messages, setMessages] = React.useState<AskMessage[]>([]);
  const [status, setStatus] = React.useState<RoomStatus>('idle');
  const [closeCode, setCloseCode] = React.useState<number | null>(null);
  const clientRef = React.useRef<LucidRoomClient | null>(null);

  const url = React.useMemo(() => roomWsUrl(resolveApiUrl()), []);

  React.useEffect(() => {
    const client = new LucidRoomClient({
      url,
      getToken: () => getTokenRef.current(),
      onStatus: setStatus,
      onClose: setCloseCode,
    });
    clientRef.current = client;
    void client.connect();
    return () => client.close();
  }, [url]);

  const sending = messages.some((m) => m.role === 'lucid' && m.state === 'streaming');

  const send = React.useCallback((prompt: string) => {
    const client = clientRef.current;
    const trimmed = prompt.trim();
    if (!client || !trimmed) return;

    const userId = `u-${Date.now()}`;
    const lucidId = `l-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: userId, role: 'user', text: trimmed },
      { id: lucidId, role: 'lucid', text: '', state: 'streaming' },
    ]);
    setCloseCode(null);

    const patch = (fn: (m: AskMessage) => AskMessage) =>
      setMessages((prev) => prev.map((m) => (m.id === lucidId ? fn(m) : m)));

    client.ask(trimmed, {
      onDelta: (t) => patch((m) => ({ ...m, text: m.text + t })),
      onDone: (full) => patch((m) => ({ ...m, text: full || m.text, state: 'done' })),
      onError: (msg) => patch((m) => ({ ...m, text: m.text || msg, state: 'error' })),
    });
  }, []);

  const reconnect = React.useCallback(() => {
    setCloseCode(null);
    void clientRef.current?.connect();
  }, []);

  return { messages, status, sending, closeCode, send, reconnect };
}
