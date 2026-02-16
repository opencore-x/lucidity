import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { useApiKey, useCreateApiKey, useRevokeApiKey } from '@/hooks/useApiKey';
import { KeyRoundIcon, CopyIcon, TrashIcon, Loader2Icon } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import * as React from 'react';
import { View, ScrollView, Alert } from 'react-native';
import {
  saveApiKeyToKeychain,
  removeApiKeyFromKeychain,
  getApiKeyFromKeychain,
} from '@/lib/keychain';

export default function SettingsScreen() {
  const { data: apiKeyData, isLoading } = useApiKey();
  const createApiKey = useCreateApiKey();
  const revokeApiKey = useRevokeApiKey();
  const [newlyCreatedKey, setNewlyCreatedKey] = React.useState<string | null>(
    null,
  );
  const [isInKeychain, setIsInKeychain] = React.useState<boolean>(false);

  // Check if existing API key is in Keychain (for Shortcuts support)
  React.useEffect(() => {
    if (apiKeyData?.exists && !newlyCreatedKey) {
      getApiKeyFromKeychain()
        .then((key) => setIsInKeychain(!!key))
        .catch((error) => {
          // Keychain access may fail if App Group isn't provisioned yet
          console.log('Keychain check skipped:', error.message);
          setIsInKeychain(false);
        });
    }
  }, [apiKeyData, newlyCreatedKey]);

  function handleGenerate() {
    if (apiKeyData?.exists) {
      Alert.alert(
        'Replace API Key',
        'This will revoke your existing key. Any MCP clients using it will stop working.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Replace',
            style: 'destructive',
            onPress: () => doGenerate(),
          },
        ],
      );
    } else {
      doGenerate();
    }
  }

  function doGenerate() {
    createApiKey.mutate(undefined, {
      onSuccess: async (data) => {
        setNewlyCreatedKey(data.key);
        // Save to Keychain for iOS Shortcuts access
        const saved = await saveApiKeyToKeychain(data.key);
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
    Alert.alert(
      'Revoke API Key',
      'Any MCP clients using this key will stop working immediately.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: () => {
            revokeApiKey.mutate(undefined, {
              onSuccess: async () => {
                setNewlyCreatedKey(null);
                // Remove from Keychain
                await removeApiKeyFromKeychain();
              },
            });
          },
        },
      ],
    );
  }

  return (
    <ScrollView className="flex-1 p-4" contentInsetAdjustmentBehavior="automatic">
      <Card>
          <CardHeader>
            <View className="flex-row items-center gap-2">
              <Icon as={KeyRoundIcon} className="size-5 text-foreground" />
              <CardTitle>API Key</CardTitle>
            </View>
            <CardDescription>
              Connect AI assistants (Claude Desktop, Cursor) and enable ultra-fast
              task capture from your iPhone Lock Screen via iOS Shortcuts.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {isLoading ? (
              <View className="items-center py-4">
                <Icon
                  as={Loader2Icon}
                  className="size-5 text-muted-foreground animate-spin"
                />
              </View>
            ) : newlyCreatedKey ? (
              <View className="gap-3">
                <View className="rounded-lg border border-border bg-muted/50 p-3">
                  <Text className="font-mono text-sm" selectable>
                    {newlyCreatedKey}
                  </Text>
                </View>
                <Text className="text-sm text-destructive">
                  Copy this key now — you won't be able to see it again.
                </Text>
                <View className="flex-row gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    className="flex-1"
                    onPress={handleCopy}>
                    <Icon as={CopyIcon} className="size-4" />
                    <Text>Copy Key</Text>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onPress={() => setNewlyCreatedKey(null)}>
                    <Text>Done</Text>
                  </Button>
                </View>
              </View>
            ) : apiKeyData?.exists ? (
              <View className="gap-3">
                <View className="flex-row items-center justify-between">
                  <View>
                    <Text className="font-mono text-sm">
                      {apiKeyData.prefix}••••••••
                    </Text>
                    <Text className="text-xs text-muted-foreground mt-1">
                      Created{' '}
                      {apiKeyData.createdAt
                        ? new Date(apiKeyData.createdAt).toLocaleDateString()
                        : 'unknown'}
                    </Text>
                    {apiKeyData.lastUsedAt && (
                      <Text className="text-xs text-muted-foreground">
                        Last used{' '}
                        {new Date(apiKeyData.lastUsedAt).toLocaleDateString()}
                      </Text>
                    )}
                  </View>
                </View>
                {!isInKeychain && (
                  <View className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-3">
                    <Text className="text-xs text-amber-600 dark:text-amber-400">
                      💡 Regenerate this key to enable iOS Shortcuts support
                    </Text>
                  </View>
                )}
                <View className="flex-row gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onPress={handleGenerate}>
                    <Icon as={KeyRoundIcon} className="size-4" />
                    <Text>{isInKeychain ? 'Regenerate' : 'Enable Shortcuts'}</Text>
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onPress={handleRevoke}>
                    <Icon as={TrashIcon} className="size-4" />
                    <Text>Revoke</Text>
                  </Button>
                </View>
              </View>
            ) : (
              <View className="gap-3">
                <Text className="text-sm text-muted-foreground">
                  No API key yet. Generate one to connect MCP clients.
                </Text>
                <Button
                  variant="default"
                  size="sm"
                  onPress={handleGenerate}
                  disabled={createApiKey.isPending}>
                  <Icon as={KeyRoundIcon} className="size-4" />
                  <Text>
                    {createApiKey.isPending ? 'Generating...' : 'Generate API Key'}
                  </Text>
                </Button>
              </View>
            )}
          </CardContent>
      </Card>
    </ScrollView>
  );
}
