import { SocialConnections } from '@/components/social-connections';
import { AuthScreen, PrimaryButton, AuthError } from '@/components/native/AuthForm';
import { useSignIn } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import * as React from 'react';
import {
  Section,
  HStack,
  Spacer,
  Button,
  TextField,
  SecureField,
  Text as UIText,
} from '@expo/ui/swift-ui';
import {
  textFieldStyle,
  keyboardType,
  textInputAutocapitalization,
  autocorrectionDisabled,
  textContentType,
  submitLabel,
  onSubmit,
  foregroundStyle,
  font,
  buttonStyle,
  frame,
  listRowSeparator,
} from '@expo/ui/swift-ui/modifiers';

const MUTED_GRAY = '#8E8E93';

export function SignInForm() {
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
    <AuthScreen title="Sign in" subtitle="Welcome back! Please sign in to continue">
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
          modifiers={[textContentType('password'), submitLabel('continue'), onSubmit(handleSubmit)]}
        />
      </Section>

      <AuthError message={error} />

      <PrimaryButton label="Continue" onPress={handleSubmit} />

      <Button
        onPress={() => router.push(`/(auth)/forgot-password?email=${email}`)}
        modifiers={[
          listRowSeparator('hidden'),
          buttonStyle('borderless'),
          frame({ maxWidth: Infinity }),
        ]}>
        <UIText modifiers={[font({ size: 14 })]}>Forgot your password?</UIText>
      </Button>

      <HStack modifiers={[listRowSeparator('hidden')]}>
        <SocialConnections />
      </HStack>

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
    </AuthScreen>
  );
}
