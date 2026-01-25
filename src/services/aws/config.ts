/**
 * AWS Amplify Configuration
 * 
 * These values are loaded from environment variables.
 * See .env file for the deployed values.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Amplify, ResourcesConfig } from 'aws-amplify';
import { cognitoUserPoolsTokenProvider } from 'aws-amplify/auth/cognito';

// Configure token storage for React Native - this enables persistent login
// Tokens are stored in AsyncStorage and persist across app restarts
cognitoUserPoolsTokenProvider.setKeyValueStorage(AsyncStorage);

// Extract region from User Pool ID (format: region_poolId)
const userPoolId = process.env.EXPO_PUBLIC_USER_POOL_ID || '';
const extractedRegion = userPoolId.split('_')[0] || 'us-east-1';
const awsRegion = process.env.EXPO_PUBLIC_AWS_REGION || extractedRegion;

// Configuration values from environment using Amplify v6 ResourcesConfig format
const awsConfig: ResourcesConfig = {
  Auth: {
    Cognito: {
      userPoolId: userPoolId,
      userPoolClientId: process.env.EXPO_PUBLIC_USER_POOL_CLIENT_ID || '',
      signUpVerificationMethod: 'code',
      loginWith: {
        email: true,
      },
    },
  },
};

// API endpoint from environment
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || '';

/**
 * Initialize AWS Amplify
 * Call this in your app's entry point
 */
export function configureAWS() {
  try {
    const poolId = awsConfig.Auth?.Cognito?.userPoolId;
    const clientId = awsConfig.Auth?.Cognito?.userPoolClientId;
    
    // Only configure if we have the required values
    if (poolId && clientId) {
      Amplify.configure(awsConfig);
      console.log('AWS Amplify configured successfully');
      console.log('Region:', awsRegion);
      console.log('User Pool ID:', poolId.substring(0, 15) + '...');
    } else {
      console.warn('AWS configuration missing - auth features will be disabled');
      console.warn('User Pool ID:', poolId ? 'set' : 'missing');
      console.warn('Client ID:', clientId ? 'set' : 'missing');
    }
  } catch (error) {
    console.error('Failed to configure AWS Amplify:', error);
  }
}

export default awsConfig;
