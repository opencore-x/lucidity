import { useSSO, type StartSSOFlowParams } from '@clerk/clerk-expo';
import { Asset } from 'expo-asset';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { useColorScheme } from '@/hooks/useColorScheme';
import * as React from 'react';
import { Platform } from 'react-native';
import { HStack, Button, Image, Spacer } from '@expo/ui/swift-ui';
import { buttonStyle, controlSize, frame, resizable } from '@expo/ui/swift-ui/modifiers';

WebBrowser.maybeCompleteAuthSession();

type SocialConnectionStrategy = Extract<
  StartSSOFlowParams['strategy'],
  'oauth_google' | 'oauth_github' | 'oauth_apple'
>;

// The native @expo/ui Image renders SF Symbols (tint to the foreground) or a LOCAL
// file URI (uiImage). So: Apple = the apple.logo symbol (auto white/black); GitHub =
// bundled black/white marks swapped by theme; Google = the full-colour logo downloaded
// once (Asset.fromURI → localUri, same as the Claude comment avatar in the task sheet).
const googleAsset = Asset.fromURI('https://img.clerk.com/static/google.png?width=160');
const githubLight = Asset.fromModule(require('@/assets/images/github-mark.png'));
const githubDark = Asset.fromModule(require('@/assets/images/github-mark-white.png'));

function useAssetUri(asset: Asset): string | null {
  const [uri, setUri] = React.useState<string | null>(asset.localUri ?? null);
  React.useEffect(() => {
    if (uri) return;
    let active = true;
    asset
      .downloadAsync()
      .then((a) => {
        if (active) setUri(a.localUri ?? a.uri);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [asset, uri]);
  return uri;
}

const LOGO = [resizable(), frame({ width: 18, height: 18 })];

function GoogleLogo() {
  const uri = useAssetUri(googleAsset);
  return uri ? <Image uiImage={uri} modifiers={LOGO} /> : null;
}

function GithubLogo() {
  const { colorScheme } = useColorScheme();
  const uri = useAssetUri(colorScheme === 'dark' ? githubDark : githubLight);
  return uri ? <Image uiImage={uri} modifiers={LOGO} /> : null;
}

/** A glass social button with its logo centered; stretches to an equal share of the row. */
function SocialButton({ onPress, children }: { onPress: () => void; children: React.ReactNode }) {
  return (
    <Button onPress={onPress} modifiers={[buttonStyle('glass'), controlSize('large')]}>
      {/* frame on the label (not the button) so glass buttons stretch to equal width */}
      <HStack modifiers={[frame({ maxWidth: Infinity })]}>
        <Spacer />
        {children}
        <Spacer />
      </HStack>
    </Button>
  );
}

/**
 * OAuth provider buttons (Apple / Google / GitHub) as a row of native glass buttons
 * with the real provider logos. The Clerk SSO flow is unchanged — only the rendering
 * is native @expo/ui. Must be rendered inside a `Host` (no Host of its own).
 */
export function SocialConnections() {
  useWarmUpBrowser();
  const { startSSOFlow } = useSSO();

  function onSocialLoginPress(strategy: SocialConnectionStrategy) {
    return async () => {
      try {
        const { createdSessionId, setActive } = await startSSOFlow({
          strategy,
          redirectUrl: AuthSession.makeRedirectUri(),
        });

        if (createdSessionId && setActive) {
          setActive({ session: createdSessionId });
          return;
        }
        // TODO: Handle other statuses (missing requirements such as MFA).
      } catch (err) {
        // See https://go.clerk.com/mRUDrIe for more info on error handling
        console.error(JSON.stringify(err, null, 2));
      }
    };
  }

  return (
    <HStack spacing={10} modifiers={[frame({ maxWidth: Infinity })]}>
      <SocialButton onPress={onSocialLoginPress('oauth_apple')}>
        <Image systemName="apple.logo" size={18} />
      </SocialButton>
      <SocialButton onPress={onSocialLoginPress('oauth_google')}>
        <GoogleLogo />
      </SocialButton>
      <SocialButton onPress={onSocialLoginPress('oauth_github')}>
        <GithubLogo />
      </SocialButton>
    </HStack>
  );
}

function useWarmUpBrowser() {
  React.useEffect(() => {
    if (Platform.OS === 'web') return;
    // Preloads the browser (Android) to reduce authentication load time.
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);
}
