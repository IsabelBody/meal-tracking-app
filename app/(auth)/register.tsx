import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Alert, ScrollView } from 'react-native';
import { useRouter, Link } from 'expo-router';
import {
  YStack,
  XStack,
  Text,
  Input,
  Button,
  H1,
  Paragraph,
  Spinner,
} from 'tamagui';
import { signUp, confirmSignUp } from 'aws-amplify/auth';
import { Mail, Lock, Eye, EyeOff, User } from '@tamagui/lucide-icons';

export default function RegisterScreen() {
  const router = useRouter();
  const [step, setStep] = useState<'register' | 'confirm'>('register');
  
  // Registration fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Confirmation
  const [confirmationCode, setConfirmationCode] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);
    try {
      const result = await signUp({
        username: email.toLowerCase().trim(),
        password,
        options: {
          userAttributes: {
            email: email.toLowerCase().trim(),
          },
        },
      });

      if (result.nextStep.signUpStep === 'CONFIRM_SIGN_UP') {
        setStep('confirm');
        Alert.alert(
          'Check Your Email',
          'We sent a verification code to your email address.'
        );
      }
    } catch (error: any) {
      console.error('Register error:', error);
      Alert.alert(
        'Registration Failed',
        error.message || 'Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!confirmationCode) {
      Alert.alert('Error', 'Please enter the verification code');
      return;
    }

    setIsLoading(true);
    try {
      await confirmSignUp({
        username: email.toLowerCase().trim(),
        confirmationCode,
      });

      Alert.alert(
        'Success',
        'Your account has been verified. You can now sign in.',
        [
          {
            text: 'Sign In',
            onPress: () => router.replace('/(auth)/login'),
          },
        ]
      );
    } catch (error: any) {
      console.error('Confirm error:', error);
      Alert.alert(
        'Verification Failed',
        error.message || 'Please check the code and try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (step === 'confirm') {
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
          <YStack alignItems="center" marginBottom="$6">
            <H1 color="$color">Verify Email</H1>
            <Paragraph color="$colorHover" textAlign="center" marginTop="$2">
              Enter the verification code sent to {email}
            </Paragraph>
          </YStack>

          <YStack gap="$4">
            <YStack gap="$2">
              <Text fontWeight="500" color="$color">Verification Code</Text>
              <Input
                value={confirmationCode}
                onChangeText={setConfirmationCode}
                placeholder="Enter 6-digit code"
                keyboardType="number-pad"
                maxLength={6}
                textAlign="center"
                fontSize="$6"
                letterSpacing={8}
              />
            </YStack>

            <Button
              size="$5"
              backgroundColor="#10B981"
              color="white"
              onPress={handleConfirm}
              disabled={isLoading}
            >
              {isLoading ? <Spinner color="white" /> : 'Verify'}
            </Button>

            <Button
              size="$3"
              backgroundColor="$backgroundHover"
              onPress={() => setStep('register')}
            >
              Back to Registration
            </Button>
          </YStack>
        </YStack>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
        keyboardShouldPersistTaps="handled"
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
              <User size={40} color="white" />
            </YStack>
            <H1 color="$color">Create Account</H1>
            <Paragraph color="$colorHover" textAlign="center">
              Start tracking your nutrition today
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
                  placeholder="Min. 8 characters"
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

            {/* Confirm Password Input */}
            <YStack gap="$2">
              <Text fontWeight="500" color="$color">Confirm Password</Text>
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
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm your password"
                  secureTextEntry={!showPassword}
                  borderWidth={0}
                  backgroundColor="transparent"
                />
              </XStack>
            </YStack>

            {/* Register Button */}
            <Button
              size="$5"
              backgroundColor="#10B981"
              color="white"
              onPress={handleRegister}
              disabled={isLoading}
              marginTop="$2"
            >
              {isLoading ? <Spinner color="white" /> : 'Create Account'}
            </Button>

            {/* Login Link */}
            <XStack justifyContent="center" gap="$2">
              <Text color="$colorHover">Already have an account?</Text>
              <Link href="/(auth)/login" asChild>
                <Text color="#10B981" fontWeight="600">Sign In</Text>
              </Link>
            </XStack>
          </YStack>
        </YStack>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
