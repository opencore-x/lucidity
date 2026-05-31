import * as React from 'react';
import { Host, Menu, Section, Button, Image, Text, ZStack } from '@expo/ui/swift-ui';
import { frame, glassEffect, resizable, clipShape } from '@expo/ui/swift-ui/modifiers';
import { Asset } from 'expo-asset';
import { useEnvStore } from '@/stores/envStore';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';

const AVATAR_SIZE = 36;

/**
 * Download a remote image (the Clerk avatar URL) to a local cache file so the
 * native @expo/ui Image can show it via `uiImage` — it can't load remote URLs.
 * Returns null until ready / if there's no image, so the caller falls back to
 * initials.
 */
function useDownloadedImageUri(remoteUrl: string | undefined): string | null {
  const [uri, setUri] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (!remoteUrl) {
      setUri(null);
      return;
    }
    let active = true;
    Asset.fromURI(remoteUrl)
      .downloadAsync()
      .then((a) => {
        if (active) setUri(a.localUri ?? null);
      })
      .catch(() => {
        if (active) setUri(null);
      });
    return () => {
      active = false;
    };
  }, [remoteUrl]);
  return uri;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

/**
 * The header account menu — a native @expo/ui `Menu` whose trigger is the user's
 * avatar (the downloaded Clerk photo, or a glass circle of initials while it loads /
 * if none). Replaces the old @rn-primitives popover, so it adapts to dark mode and
 * sits as a native sibling to the header glass buttons.
 */
export function UserMenu() {
  const { user } = useUser();
  const { signOut } = useAuth();
  const router = useRouter();
  const { colorScheme, setColorScheme } = useColorScheme();
  const env = useEnvStore((s) => s.env);
  const setEnv = useEnvStore((s) => s.setEnv);
  const queryClient = useQueryClient();

  const dark = colorScheme === 'dark';
  const email = user?.emailAddresses[0]?.emailAddress ?? '';
  const displayName = user?.fullName || email || 'Account';
  // A UIMenu section header is text-only (no avatar block), so fold the email onto
  // the name line when there's a distinct name to show.
  const headerTitle = email && email !== displayName ? `${displayName} · ${email}` : displayName;
  const avatarUri = useDownloadedImageUri(user?.imageUrl);

  const onToggleTheme = () => setColorScheme(dark ? 'light' : 'dark');
  const onToggleEnv = () => {
    setEnv(env === 'production' ? 'development' : 'production');
    queryClient.clear(); // refetch from the newly selected backend
  };
  const onApiKeys = () => router.push('/settings');
  const onSignOut = () => {
    void signOut();
  };

  const avatarLabel = avatarUri ? (
    <Image
      uiImage={avatarUri}
      modifiers={[
        resizable(),
        frame({ width: AVATAR_SIZE, height: AVATAR_SIZE }),
        clipShape('circle'),
      ]}
    />
  ) : (
    <ZStack
      modifiers={[
        frame({ width: AVATAR_SIZE, height: AVATAR_SIZE }),
        glassEffect({ glass: { variant: 'regular', interactive: true }, shape: 'circle' }),
      ]}>
      <Text>{getInitials(displayName)}</Text>
    </ZStack>
  );

  return (
    <Host matchContents colorScheme={dark ? 'dark' : 'light'}>
      <Menu label={avatarLabel}>
        <Section title={headerTitle}>
          <Button
            label={dark ? 'Dark Mode' : 'Light Mode'}
            systemImage={dark ? 'moon.fill' : 'sun.max.fill'}
            onPress={onToggleTheme}
          />
          <Button
            label={`API: ${env === 'production' ? 'Production' : 'Development'}`}
            systemImage="server.rack"
            onPress={onToggleEnv}
          />
          <Button label="API Keys" systemImage="key.fill" onPress={onApiKeys} />
        </Section>
        <Button
          label="Sign Out"
          systemImage="rectangle.portrait.and.arrow.right"
          role="destructive"
          onPress={onSignOut}
        />
      </Menu>
    </Host>
  );
}
