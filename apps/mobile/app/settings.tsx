import * as React from 'react';
import { Alert } from 'react-native';
import {
  Host,
  List,
  Section,
  Text,
  Button,
  Picker,
  ProgressView,
  VStack,
  HStack,
  Spacer,
} from '@expo/ui/swift-ui';
import {
  listStyle,
  scrollDismissesKeyboard,
  font,
  foregroundStyle,
  textSelection,
  tag,
  pickerStyle,
  textFieldStyle,
  keyboardType,
  autocorrectionDisabled,
  textInputAutocapitalization,
} from '@expo/ui/swift-ui/modifiers';
import { useColorScheme } from 'nativewind';
import * as Clipboard from 'expo-clipboard';
import { useApiKey, useCreateApiKey, useRevokeApiKey } from '@/hooks/useApiKey';
import { useEnvStore } from '@/stores/envStore';
import { useQueryClient } from '@tanstack/react-query';
import { EditableField } from '@/components/native/EditableField';
import {
  saveApiKeyToKeychain,
  removeApiKeyFromKeychain,
  getApiKeyFromKeychain,
} from '@/lib/keychain';

const MUTED_GRAY = '#8E8E93';
const DESTRUCTIVE_RED = '#FF3B30';
const AMBER = '#F59E0B';

const API_KEY_FOOTER =
  'Connect AI assistants (Claude Desktop, Cursor) and enable ultra-fast task capture from your iPhone Lock Screen via iOS Shortcuts.';
const ENV_FOOTER =
  'Choose which backend the app talks to. Production is api.lucidity.my; Development points at a local server.';

/**
 * Settings — native @expo/ui grouped `List` (the iOS Settings idiom): an API Key
 * section (generate / copy / revoke, with Keychain wiring for iOS Shortcuts) and an
 * API Environment section (segmented Development/Production picker + an editable dev
 * URL). Replaces the old @rn-primitives Card/Button/Input layout. All handlers and
 * the env/cache behaviour are unchanged.
 */
export default function SettingsScreen() {
  const { colorScheme } = useColorScheme();
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';

  const { data: apiKeyData, isLoading } = useApiKey();
  const createApiKey = useCreateApiKey();
  const revokeApiKey = useRevokeApiKey();
  const [newlyCreatedKey, setNewlyCreatedKey] = React.useState<string | null>(null);
  const [isInKeychain, setIsInKeychain] = React.useState(false);

  const env = useEnvStore((s) => s.env);
  const devUrl = useEnvStore((s) => s.devUrl);
  const setEnv = useEnvStore((s) => s.setEnv);
  const setDevUrl = useEnvStore((s) => s.setDevUrl);
  const queryClient = useQueryClient();

  // Check whether the existing API key is in the Keychain (for Shortcuts support).
  React.useEffect(() => {
    if (apiKeyData?.exists && !newlyCreatedKey) {
      getApiKeyFromKeychain()
        .then((key) => setIsInKeychain(!!key))
        .catch((error) => {
          // Keychain access may fail if the App Group isn't provisioned yet.
          console.log('Keychain check skipped:', error.message);
          setIsInKeychain(false);
        });
    }
  }, [apiKeyData, newlyCreatedKey]);

  function switchEnv(next: 'production' | 'development') {
    if (next === env) return;
    setEnv(next);
    queryClient.clear(); // drop cached data so it refetches from the new backend
  }

  function commitDevUrl(value: string) {
    if (value && value !== devUrl) {
      setDevUrl(value);
      queryClient.clear();
    }
  }

  function handleGenerate() {
    if (apiKeyData?.exists) {
      Alert.alert(
        'Replace API Key',
        'This will revoke your existing key. Any MCP clients using it will stop working.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Replace', style: 'destructive', onPress: () => doGenerate() },
        ]
      );
    } else {
      doGenerate();
    }
  }

  function doGenerate() {
    createApiKey.mutate(undefined, {
      onSuccess: async (data) => {
        setNewlyCreatedKey(data.key);
        const saved = await saveApiKeyToKeychain(data.key); // for iOS Shortcuts access
        if (!saved) {
          console.warn('API key created but not saved to Keychain');
        }
      },
    });
  }

  function handleCopy() {
    if (newlyCreatedKey) {
      Clipboard.setStringAsync(newlyCreatedKey);
      Alert.alert('Copied', 'API key copied to clipboard.');
    }
  }

  function handleRevoke() {
    Alert.alert('Revoke API Key', 'Any MCP clients using this key will stop working immediately.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Revoke',
        style: 'destructive',
        onPress: () => {
          revokeApiKey.mutate(undefined, {
            onSuccess: async () => {
              setNewlyCreatedKey(null);
              await removeApiKeyFromKeychain();
            },
          });
        },
      },
    ]);
  }

  return (
    <Host style={{ flex: 1 }} colorScheme={scheme}>
      <List modifiers={[listStyle('insetGrouped'), scrollDismissesKeyboard('interactively')]}>
        <Section title="API Key" footer={<Text>{API_KEY_FOOTER}</Text>}>
          {isLoading ? (
            <HStack>
              <Spacer />
              <ProgressView />
              <Spacer />
            </HStack>
          ) : newlyCreatedKey ? (
            <>
              <Text modifiers={[font({ design: 'monospaced', size: 13 }), textSelection(true)]}>
                {newlyCreatedKey}
              </Text>
              <Text modifiers={[foregroundStyle(DESTRUCTIVE_RED), font({ size: 13 })]}>
                Copy this key now — you won&apos;t be able to see it again.
              </Text>
              <Button label="Copy Key" systemImage="doc.on.doc" onPress={handleCopy} />
              <Button label="Done" onPress={() => setNewlyCreatedKey(null)} />
            </>
          ) : apiKeyData?.exists ? (
            <>
              <VStack alignment="leading" spacing={2}>
                <Text modifiers={[font({ design: 'monospaced', size: 13 }), textSelection(true)]}>
                  {`${apiKeyData.prefix}••••••••`}
                </Text>
                <Text modifiers={[foregroundStyle(MUTED_GRAY), font({ size: 12 })]}>
                  {`Created ${apiKeyData.createdAt ? new Date(apiKeyData.createdAt).toLocaleDateString() : 'unknown'}`}
                </Text>
                {apiKeyData.lastUsedAt ? (
                  <Text modifiers={[foregroundStyle(MUTED_GRAY), font({ size: 12 })]}>
                    {`Last used ${new Date(apiKeyData.lastUsedAt).toLocaleDateString()}`}
                  </Text>
                ) : null}
              </VStack>
              {!isInKeychain ? (
                <Text modifiers={[foregroundStyle(AMBER), font({ size: 12 })]}>
                  💡 Regenerate this key to enable iOS Shortcuts support
                </Text>
              ) : null}
              <Button
                label={isInKeychain ? 'Regenerate' : 'Enable Shortcuts'}
                systemImage="key.fill"
                onPress={handleGenerate}
              />
              <Button label="Revoke" systemImage="trash" role="destructive" onPress={handleRevoke} />
            </>
          ) : (
            <>
              <Text modifiers={[foregroundStyle(MUTED_GRAY), font({ size: 13 })]}>
                No API key yet. Generate one to connect MCP clients.
              </Text>
              <Button
                label={createApiKey.isPending ? 'Generating…' : 'Generate API Key'}
                systemImage="key.fill"
                onPress={handleGenerate}
              />
            </>
          )}
        </Section>

        <Section title="API Environment" footer={<Text>{ENV_FOOTER}</Text>}>
          <Picker
            selection={env}
            onSelectionChange={(v) => switchEnv(v as 'production' | 'development')}
            modifiers={[pickerStyle('segmented')]}>
            <Text modifiers={[tag('development')]}>Development</Text>
            <Text modifiers={[tag('production')]}>Production</Text>
          </Picker>

          {env === 'development' ? (
            <EditableField
              value={devUrl}
              onCommit={commitDevUrl}
              placeholder="http://192.168.1.7:3000"
              modifiers={[
                textFieldStyle('roundedBorder'),
                keyboardType('url'),
                autocorrectionDisabled(true),
                textInputAutocapitalization('never'),
              ]}
            />
          ) : (
            <Text modifiers={[foregroundStyle(MUTED_GRAY), font({ size: 13 })]}>
              Currently using https://api.lucidity.my
            </Text>
          )}
        </Section>
      </List>
    </Host>
  );
}
