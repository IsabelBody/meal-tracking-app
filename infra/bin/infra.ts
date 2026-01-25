#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { MealTrackerStack } from '../lib/meal-tracker-stack';

const app = new cdk.App();

new MealTrackerStack(app, 'MealTrackerStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  description: 'Meal Tracker App Infrastructure - Cognito, DynamoDB, API Gateway, Lambda',
});
