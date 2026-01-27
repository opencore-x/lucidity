import * as React from 'react';
import { View, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSignIn, useSignUp, useOAuth } from '@clerk/clerk-expo';
import * as WebBrowser from 'expo-web-browser';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// Warm up the browser for OAuth
WebBrowser.maybeCompleteAuthSession();

export function SignInScreen() {
  const { signIn, setActive: setSignInActive, isLoaded: signInLoaded } = useSignIn();
  const { signUp, setActive: setSignUpActive, isLoaded: signUpLoaded } = useSignUp();
  const { startOAuthFlow } = useOAuth({ strategy: 'oauth_google' });

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [isSignUp, setIsSignUp] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const handleEmailAuth = async () => {
    if (!signInLoaded || !signUpLoaded) return;

    try {
      setLoading(true);

      if (isSignUp) {
        // Sign up flow
        const result = await signUp.create({
          emailAddress: email,
          password,
        });

        if (result.status === 'complete') {
          await setSignUpActive({ session: result.createdSessionId });
        } else {
          Alert.alert('Verification Required', 'Please check your email to verify your account.');
        }
      } else {
        // Sign in flow
        const result = await signIn.create({
          identifier: email,
          password,
        });

        if (result.status === 'complete') {
          await setSignInActive({ session: result.createdSessionId });
        }
      }
    } catch (err: any) {
      Alert.alert('Error', err.errors?.[0]?.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      setLoading(true);
      const { createdSessionId, setActive } = await startOAuthFlow();

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 px-6 justify-center">
        {/* Logo/Header */}
        <View className="items-center mb-8">
          <Text className="text-4xl mb-2">✓</Text>
          <Text className="text-3xl font-bold">OpenTask</Text>
          <Text className="text-muted-foreground mt-2">
            {isSignUp ? 'Create an account' : 'Welcome back'}
          </Text>
        </View>

        {/* Google OAuth Button */}
        <Button
          variant="outline"
          className="mb-4 h-12"
          onPress={handleGoogleAuth}
          disabled={loading}
        >
          <Text className="text-base">Continue with Google</Text>
        </Button>

        {/* Divider */}
        <View className="flex-row items-center my-4">
          <View className="flex-1 h-px bg-border" />
          <Text className="mx-4 text-muted-foreground">or</Text>
          <View className="flex-1 h-px bg-border" />
        </View>

        {/* Email/Password Form */}
        <View className="gap-4">
          <Input
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
          <Input
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
          />
        </View>

        {/* Submit Button */}
        <Button
          className="mt-6 h-12"
          onPress={handleEmailAuth}
          disabled={loading || !email || !password}
        >
          {loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Sign In'}
        </Button>

        {/* Toggle Sign In/Sign Up */}
        <View className="flex-row justify-center mt-6">
          <Text className="text-muted-foreground">
            {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
          </Text>
          <Button
            variant="link"
            className="p-0 h-auto"
            onPress={() => setIsSignUp(!isSignUp)}
          >
            <Text className="text-primary font-semibold">
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </Text>
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}
