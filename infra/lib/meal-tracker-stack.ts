import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import * as path from 'path';

export class MealTrackerStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ==================== COGNITO USER POOL ====================
    const userPool = new cognito.UserPool(this, 'MealTrackerUserPool', {
      userPoolName: 'meal-tracker-users',
      selfSignUpEnabled: true,
      signInAliases: {
        email: true,
      },
      autoVerify: {
        email: true,
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For development - change in production
    });

    const userPoolClient = new cognito.UserPoolClient(this, 'MealTrackerUserPoolClient', {
      userPool,
      userPoolClientName: 'meal-tracker-app-client',
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
      preventUserExistenceErrors: true,
    });

    // ==================== DYNAMODB TABLES ====================
    
    // Diary entries table
    const diaryTable = new dynamodb.Table(this, 'MealTrackerDiaryTable', {
      tableName: 'meal-tracker-diary',
      partitionKey: {
        name: 'userId',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'entryKey', // Format: date#mealType#entryId
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For development
      pointInTimeRecoveryEnabled: true,
    });

    // Add GSI for querying by date
    diaryTable.addGlobalSecondaryIndex({
      indexName: 'DateIndex',
      partitionKey: {
        name: 'userId',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'date',
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // User goals/settings table
    const goalsTable = new dynamodb.Table(this, 'MealTrackerGoalsTable', {
      tableName: 'meal-tracker-goals',
      partitionKey: {
        name: 'userId',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // ==================== LAMBDA FUNCTIONS ====================

    // FatSecret API Proxy Lambda
    const fatSecretProxyLambda = new lambda.Function(this, 'FatSecretProxyLambda', {
      functionName: 'meal-tracker-fatsecret-proxy',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/fatsecret-proxy')),
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: {
        FATSECRET_CLIENT_ID: process.env.FATSECRET_CLIENT_ID || 'YOUR_CLIENT_ID',
        FATSECRET_CLIENT_SECRET: process.env.FATSECRET_CLIENT_SECRET || 'YOUR_CLIENT_SECRET',
      },
    });

    // Diary API Lambda
    const diaryApiLambda = new lambda.Function(this, 'DiaryApiLambda', {
      functionName: 'meal-tracker-diary-api',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/diary-api')),
      timeout: cdk.Duration.seconds(10),
      memorySize: 256,
      environment: {
        DIARY_TABLE_NAME: diaryTable.tableName,
        GOALS_TABLE_NAME: goalsTable.tableName,
      },
    });

    // Grant DynamoDB permissions to diary lambda
    diaryTable.grantReadWriteData(diaryApiLambda);
    goalsTable.grantReadWriteData(diaryApiLambda);

    // ==================== API GATEWAY ====================

    const api = new apigateway.RestApi(this, 'MealTrackerApi', {
      restApiName: 'Meal Tracker API',
      description: 'API for Meal Tracker app - FatSecret proxy and diary management',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization', 'X-Amz-Date', 'X-Api-Key'],
      },
    });

    // FatSecret endpoints
    const foodsResource = api.root.addResource('foods');
    
    // GET /foods/search?q=query
    const searchResource = foodsResource.addResource('search');
    searchResource.addMethod('GET', new apigateway.LambdaIntegration(fatSecretProxyLambda));

    // GET /foods/{id}
    const foodByIdResource = foodsResource.addResource('{id}');
    foodByIdResource.addMethod('GET', new apigateway.LambdaIntegration(fatSecretProxyLambda));

    // Diary endpoints (protected by Cognito)
    const cognitoAuthorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'CognitoAuthorizer', {
      cognitoUserPools: [userPool],
    });

    const diaryResource = api.root.addResource('diary');
    
    // GET /diary?date=YYYY-MM-DD
    diaryResource.addMethod('GET', new apigateway.LambdaIntegration(diaryApiLambda), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // POST /diary
    diaryResource.addMethod('POST', new apigateway.LambdaIntegration(diaryApiLambda), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // DELETE /diary/{entryId}
    const diaryEntryResource = diaryResource.addResource('{entryId}');
    diaryEntryResource.addMethod('DELETE', new apigateway.LambdaIntegration(diaryApiLambda), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // Goals endpoints
    const goalsResource = api.root.addResource('goals');
    
    goalsResource.addMethod('GET', new apigateway.LambdaIntegration(diaryApiLambda), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    goalsResource.addMethod('PUT', new apigateway.LambdaIntegration(diaryApiLambda), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // ==================== OUTPUTS ====================

    new cdk.CfnOutput(this, 'UserPoolId', {
      value: userPool.userPoolId,
      description: 'Cognito User Pool ID',
      exportName: 'MealTrackerUserPoolId',
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
      exportName: 'MealTrackerUserPoolClientId',
    });

    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: api.url,
      description: 'API Gateway endpoint URL',
      exportName: 'MealTrackerApiEndpoint',
    });

    new cdk.CfnOutput(this, 'DiaryTableName', {
      value: diaryTable.tableName,
      description: 'DynamoDB Diary Table Name',
      exportName: 'MealTrackerDiaryTableName',
    });

    new cdk.CfnOutput(this, 'GoalsTableName', {
      value: goalsTable.tableName,
      description: 'DynamoDB Goals Table Name',
      exportName: 'MealTrackerGoalsTableName',
    });
  }
}
