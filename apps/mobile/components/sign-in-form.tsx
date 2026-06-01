import { SocialConnections } from '@/components/social-connections';
import { useSignIn } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';
import * as React from 'react';
import { View } from 'react-native';
import {
  Host,
  List,
  Section,
  VStack,
  HStack,
  Spacer,
  Button,
  TextField,
  SecureField,
  Text as UIText,
} from '@expo/ui/swift-ui';
import {
  listStyle,
  listSectionSpacing,
  listRowSeparator,
  frame,
  foregroundStyle,
  font,
  padding,
  buttonStyle,
  controlSize,
  textFieldStyle,
  keyboardType,
  textInputAutocapitalization,
  autocorrectionDisabled,
  textContentType,
  submitLabel,
  onSubmit,
} from '@expo/ui/swift-ui/modifiers';

const MUTED_GRAY = '#8E8E93';
const DESTRUCTIVE_RED = '#FF3B30';

export function SignInForm() {
  const { colorScheme } = useColorScheme();
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';
  const router = useRouter();
  const { signIn, setActive, isLoaded } = useSignIn();

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = React.useCallback(async () => {
    if (!isLoaded) return;
    try {
      const attempt = await signIn.create({ identifier: email, password });
      if (attempt.status === 'complete') {
        setError(null);
        await setActive({ session: attempt.createdSessionId });
        return;
      }
      console.error(JSON.stringify(attempt, null, 2));
    } catch (err) {
      // See https://go.clerk.com/mRUDrIe for more info on error handling
      if (err instanceof Error) setError(err.message);
      else console.error(JSON.stringify(err, null, 2));
    }
  }, [isLoaded, signIn, setActive, email, password]);

  return (
    <View className="bg-background flex-1">
      <Host style={{ flex: 1 }} colorScheme={scheme}>
        <List modifiers={[listStyle('insetGrouped'), listSectionSpacing('compact')]}>
          {/* Title */}
          <VStack
            spacing={4}
            alignment="leading"
            modifiers={[listRowSeparator('hidden'), padding({ top: 8 })]}>
            <UIText modifiers={[font({ size: 28, weight: 'bold' })]}>Sign in</UIText>
            <UIText modifiers={[foregroundStyle(MUTED_GRAY), font({ size: 15 })]}>
              Welcome back! Please sign in to continue
            </UIText>
          </VStack>

          {/* Credentials */}
          <Section>
            <TextField
              placeholder="Email"
              onTextChange={setEmail}
              modifiers={[
                textFieldStyle('plain'),
                keyboardType('email-address'),
                textInputAutocapitalization('never'),
                autocorrectionDisabled(true),
                textContentType('emailAddress'),
              ]}
            />
            <SecureField
              placeholder="Password"
              onTextChange={setPassword}
              modifiers={[
                textContentType('password'),
                submitLabel('continue'),
                onSubmit(handleSubmit),
              ]}
            />
          </Section>

          {error ? (
            <UIText
              modifiers={[
                listRowSeparator('hidden'),
                foregroundStyle(DESTRUCTIVE_RED),
                font({ size: 13 }),
              ]}>
              {error}
            </UIText>
          ) : null}

          <Button
            onPress={handleSubmit}
            modifiers={[
              listRowSeparator('hidden'),
              buttonStyle('glassProminent'),
              controlSize('large'),
            ]}>
            {/* frame on the label (not the button) so the prominent button fills the width */}
            <UIText modifiers={[frame({ maxWidth: Infinity }), font({ weight: 'semibold' })]}>
              Continue
            </UIText>
          </Button>

          <Button
            label="Forgot your password?"
            onPress={() => router.push(`/(auth)/forgot-password?email=${email}`)}
            modifiers={[
              listRowSeparator('hidden'),
              buttonStyle('borderless'),
              frame({ maxWidth: Infinity }),
            ]}
          />

          {/* Social */}
          <HStack modifiers={[listRowSeparator('hidden')]}>
            <SocialConnections />
          </HStack>

          {/* Sign up */}
          <HStack spacing={4} modifiers={[listRowSeparator('hidden')]}>
            <Spacer />
            <UIText modifiers={[foregroundStyle(MUTED_GRAY), font({ size: 13 })]}>
              Don&apos;t have an account?
            </UIText>
            <Button
              onPress={() => router.push('/(auth)/sign-up')}
              modifiers={[buttonStyle('borderless')]}>
              <UIText modifiers={[font({ size: 13, weight: 'semibold' })]}>Sign up</UIText>
            </Button>
            <Spacer />
          </HStack>
        </List>
      </Host>
    </View>
  );
}
