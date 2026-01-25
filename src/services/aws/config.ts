/**
 * AWS Amplify Configuration
 * 
 * These values are loaded from environment variables.
 * See .env file for the deployed values.
 */

import { Amplify } from 'aws-amplify';

// Configuration values from environment
const awsConfig = {
  // Cognito User Pool
  Auth: {
    Cognito: {
      userPoolId: process.env.EXPO_PUBLIC_USER_POOL_ID || '',
      userPoolClientId: process.env.EXPO_PUBLIC_USER_POOL_CLIENT_ID || '',
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
    // Only configure if we have the required values
    if (awsConfig.Auth.Cognito.userPoolId && awsConfig.Auth.Cognito.userPoolClientId) {
      Amplify.configure(awsConfig);
      console.log('AWS Amplify configured successfully');
    } else {
      console.warn('AWS configuration missing - auth features will be disabled');
    }
  } catch (error) {
    console.error('Failed to configure AWS Amplify:', error);
  }
}

export default awsConfig;
