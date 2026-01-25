import { Eye, EyeOff, Lock, Mail } from '@tamagui/lucide-icons';
import { signIn } from 'aws-amplify/auth';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform } from 'react-native';
import {
    Button,
    H1,
    Input,
    Paragraph,
    Spinner,
    Text,
    XStack,
    YStack,
} from 'tamagui';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setIsLoading(true);
    try {
      const result = await signIn({
        username: email.toLowerCase().trim(),
        password,
      });

      if (result.isSignedIn) {
        router.replace('/(tabs)');
      } else if (result.nextStep.signInStep === 'CONFIRM_SIGN_UP') {
        Alert.alert(
          'Verify Email',
          'Please check your email for a verification code.',
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      console.error('Login error:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      
      // Map Amplify v6 error types to user-friendly messages
      // Amplify v6 may store the Cognito error code in various places
      const errorCode = 
        error?.name || 
        error?.code || 
        error?.underlyingError?.name ||
        error?.cause?.name ||
        error?.__type ||
        '';
      
      // Also check the error message for Cognito error indicators
      const errorMsg = error?.message || '';
      
      let userMessage = 'Please check your credentials and try again.';
      
      if (
        errorCode === 'UserNotFoundException' || 
        errorCode === 'UserNotFoundError' ||
        errorMsg.includes('User does not exist')
      ) {
        userMessage = 'No account found with this email. Please sign up first.';
      } else if (
        errorCode === 'NotAuthorizedException' ||
        errorMsg.includes('Incorrect username or password') ||
        errorMsg.includes('password')
      ) {
        userMessage = 'Incorrect password. Please try again.';
      } else if (
        errorCode === 'UserNotConfirmedException' ||
        errorMsg.includes('not confirmed')
      ) {
        userMessage = 'Please verify your email before signing in.';
      } else if (errorCode === 'InvalidParameterException') {
        userMessage = 'Please enter a valid email address.';
      } else if (
        errorCode === 'LimitExceededException' ||
        errorMsg.includes('Attempt limit exceeded')
      ) {
        userMessage = 'Too many attempts. Please try again later.';
      } else if (errorMsg && !errorMsg.includes('Unknown')) {
        // Use the error message if it's meaningful
        userMessage = errorMsg;
      }
      
      Alert.alert('Login Failed', userMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // For development - skip auth
  const handleSkipAuth = () => {
    router.replace('/(tabs)');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <YStack
        flex={1}
        padding="$4"
        justifyContent="center"
        backgroundColor="$background"
      >
        {/* Header */}
        <YStack alignItems="center" marginBottom="$6">
          <YStack
            width={80}
            height={80}
            borderRadius={40}
            backgroundColor="#10B981"
            justifyContent="center"
            alignItems="center"
            marginBottom="$4"
          >
            <Text fontSize="$8" color="white" fontWeight="700">M</Text>
          </YStack>
          <H1 color="$color">Meal Tracker</H1>
          <Paragraph color="$colorHover" textAlign="center">
            Track your nutrition, achieve your goals
          </Paragraph>
        </YStack>

        {/* Form */}
        <YStack gap="$4">
          {/* Email Input */}
          <YStack gap="$2">
            <Text fontWeight="500" color="$color">Email</Text>
            <XStack
              backgroundColor="$backgroundHover"
              borderRadius="$3"
              paddingHorizontal="$3"
              alignItems="center"
              borderWidth={1}
              borderColor="$borderColor"
            >
              <Mail size={20} color="$colorHover" />
              <Input
                flex={1}
                value={email}
                onChangeText={setEmail}
                placeholder="your@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                borderWidth={0}
                backgroundColor="transparent"
              />
            </XStack>
          </YStack>

          {/* Password Input */}
          <YStack gap="$2">
            <Text fontWeight="500" color="$color">Password</Text>
            <XStack
              backgroundColor="$backgroundHover"
              borderRadius="$3"
              paddingHorizontal="$3"
              alignItems="center"
              borderWidth={1}
              borderColor="$borderColor"
            >
              <Lock size={20} color="$colorHover" />
              <Input
                flex={1}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter password"
                secureTextEntry={!showPassword}
                borderWidth={0}
                backgroundColor="transparent"
              />
              <Button
                size="$2"
                chromeless
                icon={showPassword ? EyeOff : Eye}
                onPress={() => setShowPassword(!showPassword)}
              />
            </XStack>
          </YStack>

          {/* Login Button */}
          <Button
            size="$5"
            backgroundColor="#10B981"
            color="white"
            onPress={handleLogin}
            disabled={isLoading}
            marginTop="$2"
          >
            {isLoading ? <Spinner color="white" /> : 'Sign In'}
          </Button>

          {/* Register Link */}
          <XStack justifyContent="center" gap="$2">
            <Text color="$colorHover">Don't have an account?</Text>
            <Link href="/(auth)/register" asChild>
              <Text color="#10B981" fontWeight="600">Sign Up</Text>
            </Link>
          </XStack>

          {/* Dev Skip Button */}
          {__DEV__ && (
            <Button
              size="$3"
              backgroundColor="$backgroundHover"
              marginTop="$4"
              onPress={handleSkipAuth}
            >
              Skip Login (Dev Only)
            </Button>
          )}
        </YStack>

      </YStack>
    </KeyboardAvoidingView>
  );
}
