import { AuthScreen, PrimaryButton, AuthError } from '@/components/native/AuthForm';
import { useSignIn } from '@clerk/clerk-expo';
import { router, useLocalSearchParams } from 'expo-router';
import * as React from 'react';
import { Section, TextField, useNativeState } from '@expo/ui/swift-ui';
import {
  textFieldStyle,
  keyboardType,
  textInputAutocapitalization,
  autocorrectionDisabled,
  textContentType,
  submitLabel,
  onSubmit,
} from '@expo/ui/swift-ui/modifiers';

export function ForgotPasswordForm() {
  const { email: emailParam = '' } = useLocalSearchParams<{ email?: string }>();
  // Native field state, prefilled from the route param (carried over from sign-in).
  const emailState = useNativeState(emailParam);
  const { signIn, isLoaded } = useSignIn();
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = React.useCallback(async () => {
    const email = emailState.value.trim();
    if (!email) {
      setError('Email is required');
      return;
    }
    if (!isLoaded) return;
    try {
      await signIn.create({ strategy: 'reset_password_email_code', identifier: email });
      router.push(`/(auth)/reset-password?email=${email}`);
    } catch (err) {
      // See https://go.clerk.com/mRUDrIe for more info on error handling
      if (err instanceof Error) setError(err.message);
      else console.error(JSON.stringify(err, null, 2));
    }
  }, [emailState, isLoaded, signIn]);

  return (
    <AuthScreen title="Forgot password?" subtitle="Enter your email to reset your password">
      <Section>
        <TextField
          text={emailState}
          placeholder="Email"
          modifiers={[
            textFieldStyle('plain'),
            keyboardType('email-address'),
            textInputAutocapitalization('never'),
            autocorrectionDisabled(true),
            textContentType('emailAddress'),
            submitLabel('continue'),
            onSubmit(handleSubmit),
          ]}
        />
      </Section>

      <AuthError message={error} />

      <PrimaryButton label="Reset your password" onPress={handleSubmit} />
    </AuthScreen>
  );
}
