import { AuthScreen, PrimaryButton, AuthError } from '@/components/native/AuthForm';
import { useSignUp } from '@clerk/clerk-expo';
import { router, useLocalSearchParams } from 'expo-router';
import * as React from 'react';
import { Section, Button, TextField, Text as UIText } from '@expo/ui/swift-ui';
import {
  textFieldStyle,
  keyboardType,
  autocorrectionDisabled,
  textContentType,
  submitLabel,
  onSubmit,
  foregroundStyle,
  font,
  buttonStyle,
  frame,
  listRowSeparator,
  disabled,
} from '@expo/ui/swift-ui/modifiers';

const MUTED_GRAY = '#8E8E93';
const RESEND_CODE_INTERVAL_SECONDS = 30;

export function VerifyEmailForm() {
  const { signUp, setActive, isLoaded } = useSignUp();
  const { email = '' } = useLocalSearchParams<{ email?: string }>();
  const [code, setCode] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const { countdown, restartCountdown } = useCountdown(RESEND_CODE_INTERVAL_SECONDS);

  const handleSubmit = React.useCallback(async () => {
    if (!isLoaded) return;
    try {
      const attempt = await signUp.attemptEmailAddressVerification({ code });
      if (attempt.status === 'complete') {
        await setActive({ session: attempt.createdSessionId });
        return;
      }
      console.error(JSON.stringify(attempt, null, 2));
    } catch (err) {
      // See https://go.clerk.com/mRUDrIe for more info on error handling
      if (err instanceof Error) setError(err.message);
      else console.error(JSON.stringify(err, null, 2));
    }
  }, [isLoaded, signUp, setActive, code]);

  const onResend = React.useCallback(async () => {
    if (!isLoaded) return;
    try {
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      restartCountdown();
    } catch (err) {
      if (err instanceof Error) setError(err.message);
      else console.error(JSON.stringify(err, null, 2));
    }
  }, [isLoaded, signUp, restartCountdown]);

  return (
    <AuthScreen
      title="Verify your email"
      subtitle={`Enter the verification code sent to ${email || 'your email'}`}>
      <Section>
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

      <PrimaryButton label="Continue" onPress={handleSubmit} />

      <Button
        onPress={onResend}
        modifiers={[
          listRowSeparator('hidden'),
          buttonStyle('borderless'),
          frame({ maxWidth: Infinity }),
          ...(countdown > 0 ? [disabled(true)] : []),
        ]}>
        <UIText modifiers={[foregroundStyle(MUTED_GRAY), font({ size: 13 })]}>
          {countdown > 0 ? `Resend code (${countdown})` : "Didn't receive the code? Resend"}
        </UIText>
      </Button>

      <Button
        onPress={() => router.back()}
        modifiers={[
          listRowSeparator('hidden'),
          buttonStyle('borderless'),
          frame({ maxWidth: Infinity }),
        ]}>
        <UIText modifiers={[font({ size: 14 })]}>Cancel</UIText>
      </Button>
    </AuthScreen>
  );
}

function useCountdown(seconds = 30) {
  const [countdown, setCountdown] = React.useState(seconds);
  const intervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  // Starts ticking; the interval's setState is async (not flagged), so the mount
  // effect can call this without a synchronous setState-in-effect.
  const tick = React.useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const restartCountdown = React.useCallback(() => {
    setCountdown(seconds);
    tick();
  }, [seconds, tick]);

  React.useEffect(() => {
    tick();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [tick]);

  return { countdown, restartCountdown };
}
