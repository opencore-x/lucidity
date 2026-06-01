import { AuthScreen, PrimaryButton, AuthError } from '@/components/native/AuthForm';
import { useSignIn } from '@clerk/clerk-expo';
import * as React from 'react';
import { Section, TextField, SecureField } from '@expo/ui/swift-ui';
import {
  textFieldStyle,
  keyboardType,
  autocorrectionDisabled,
  textContentType,
  submitLabel,
  onSubmit,
} from '@expo/ui/swift-ui/modifiers';

export function ResetPasswordForm() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const [password, setPassword] = React.useState('');
  const [code, setCode] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = React.useCallback(async () => {
    if (!isLoaded) return;
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code,
        password,
      });
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        return;
      }
      console.error(JSON.stringify(result, null, 2));
    } catch (err) {
      // See https://go.clerk.com/mRUDrIe for more info on error handling
      if (err instanceof Error) setError(err.message);
      else console.error(JSON.stringify(err, null, 2));
    }
  }, [isLoaded, signIn, setActive, code, password]);

  return (
    <AuthScreen
      title="Reset password"
      subtitle="Enter the code sent to your email and set a new password">
      <Section>
        <SecureField
          placeholder="New password"
          onTextChange={setPassword}
          modifiers={[textContentType('newPassword')]}
        />
        <TextField
          placeholder="Verification code"
          onTextChange={setCode}
          modifiers={[
            textFieldStyle('plain'),
            keyboardType('numeric'),
            autocorrectionDisabled(true),
            textContentType('oneTimeCode'),
            submitLabel('continue'),
            onSubmit(handleSubmit),
          ]}
        />
      </Section>

      <AuthError message={error} />

      <PrimaryButton label="Reset password" onPress={handleSubmit} />
    </AuthScreen>
  );
}
