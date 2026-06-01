import { SocialConnections } from '@/components/social-connections';
import { AuthScreen, PrimaryButton, AuthError } from '@/components/native/AuthForm';
import { useSignUp } from '@clerk/clerk-expo';
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
  listRowSeparator,
} from '@expo/ui/swift-ui/modifiers';

const MUTED_GRAY = '#8E8E93';

export function SignUpForm() {
  const router = useRouter();
  const { signUp, isLoaded } = useSignUp();
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = React.useCallback(async () => {
    if (!isLoaded) return;
    const parts = name.trim().split(/\s+/);
    const firstName = parts[0] || '';
    const lastName = parts.slice(1).join(' ') || undefined;
    try {
      await signUp.create({ emailAddress: email, password, firstName, lastName });
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      router.push(`/(auth)/sign-up/verify-email?email=${email}`);
    } catch (err) {
      // See https://go.clerk.com/mRUDrIe for more info on error handling
      if (err instanceof Error) setError(err.message);
      else console.error(JSON.stringify(err, null, 2));
    }
  }, [isLoaded, signUp, email, password, name, router]);

  return (
    <AuthScreen
      title="Create your account"
      subtitle="Welcome! Please fill in the details to get started.">
      <Section>
        <TextField
          placeholder="Full name"
          onTextChange={setName}
          modifiers={[
            textFieldStyle('plain'),
            textInputAutocapitalization('words'),
            textContentType('name'),
          ]}
        />
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
            textContentType('newPassword'),
            submitLabel('continue'),
            onSubmit(handleSubmit),
          ]}
        />
      </Section>

      <AuthError message={error} />

      <PrimaryButton label="Continue" onPress={handleSubmit} />

      <HStack modifiers={[listRowSeparator('hidden')]}>
        <SocialConnections />
      </HStack>

      <HStack spacing={4} modifiers={[listRowSeparator('hidden')]}>
        <Spacer />
        <UIText modifiers={[foregroundStyle(MUTED_GRAY), font({ size: 13 })]}>
          Already have an account?
        </UIText>
        <Button onPress={() => router.back()} modifiers={[buttonStyle('borderless')]}>
          <UIText modifiers={[font({ size: 13, weight: 'semibold' })]}>Sign in</UIText>
        </Button>
        <Spacer />
      </HStack>
    </AuthScreen>
  );
}
