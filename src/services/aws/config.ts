/**
 * AWS Amplify Configuration
 * 
 * After deploying the CDK stack, update these values with the outputs.
 * 
 * Run: cd infra && npm run deploy
 * Then copy the output values here.
 */

import { Amplify } from 'aws-amplify';

// Configuration values - update these after CDK deployment
const awsConfig = {
  // Cognito User Pool
  Auth: {
    Cognito: {
      userPoolId: process.env.EXPO_PUBLIC_USER_POOL_ID || 'us-east-1_XXXXXXXXX',
      userPoolClientId: process.env.EXPO_PUBLIC_USER_POOL_CLIENT_ID || 'xxxxxxxxxxxxxxxxxxxxxxxxxx',
      loginWith: {
        email: true,
      },
    },
  },
};

// API endpoint - update after CDK deployment
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/prod';

/**
 * Initialize AWS Amplify
 * Call this in your app's entry point
 */
export function configureAWS() {
  try {
    Amplify.configure(awsConfig);
    console.log('AWS Amplify configured successfully');
  } catch (error) {
    console.error('Failed to configure AWS Amplify:', error);
  }
}

export default awsConfig;
