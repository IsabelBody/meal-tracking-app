import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
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
      // Token validity configuration for "stay logged in" experience
      accessTokenValidity: cdk.Duration.hours(1),
      idTokenValidity: cdk.Duration.hours(1),
      refreshTokenValidity: cdk.Duration.days(365), // 1 year - max is 10 years (3650 days)
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
      pointInTimeRecovery: true,
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

    const weightTable = new dynamodb.Table(this, 'MealTrackerWeightTable', {
      tableName: 'meal-tracker-weight',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'date', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const fastingTable = new dynamodb.Table(this, 'MealTrackerFastingTable', {
      tableName: 'meal-tracker-fasting',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sessionId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const mealsTable = new dynamodb.Table(this, 'MealTrackerMealsTable', {
      tableName: 'meal-tracker-meals',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'mealId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const favoritesTable = new dynamodb.Table(this, 'MealTrackerFavoritesTable', {
      tableName: 'meal-tracker-favorites',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'foodId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // ==================== LAMBDA FUNCTIONS ====================

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
        WEIGHT_TABLE_NAME: weightTable.tableName,
        FASTING_TABLE_NAME: fastingTable.tableName,
        MEALS_TABLE_NAME: mealsTable.tableName,
        FAVORITES_TABLE_NAME: favoritesTable.tableName,
      },
    });

    diaryTable.grantReadWriteData(diaryApiLambda);
    goalsTable.grantReadWriteData(diaryApiLambda);
    weightTable.grantReadWriteData(diaryApiLambda);
    fastingTable.grantReadWriteData(diaryApiLambda);
    mealsTable.grantReadWriteData(diaryApiLambda);
    favoritesTable.grantReadWriteData(diaryApiLambda);

    // ==================== API GATEWAY ====================

    const api = new apigateway.RestApi(this, 'MealTrackerApi', {
      restApiName: 'Meal Tracker API',
      description: 'API for Meal Tracker app - diary management',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization', 'X-Amz-Date', 'X-Api-Key'],
      },
    });

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

    // GET not used; PUT = update, DELETE = delete
    const diaryEntryResource = diaryResource.addResource('{entryId}');
    diaryEntryResource.addMethod('PUT', new apigateway.LambdaIntegration(diaryApiLambda), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });
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

    const weightResource = api.root.addResource('weight');
    weightResource.addMethod('GET', new apigateway.LambdaIntegration(diaryApiLambda), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });
    weightResource.addMethod('PUT', new apigateway.LambdaIntegration(diaryApiLambda), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });
    const weightDateResource = weightResource.addResource('{date}');
    weightDateResource.addMethod('DELETE', new apigateway.LambdaIntegration(diaryApiLambda), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    const fastingResource = api.root.addResource('fasting');
    fastingResource.addMethod('GET', new apigateway.LambdaIntegration(diaryApiLambda), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });
    fastingResource.addMethod('POST', new apigateway.LambdaIntegration(diaryApiLambda), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });
    const fastingIdResource = fastingResource.addResource('{sessionId}');
    fastingIdResource.addMethod('PUT', new apigateway.LambdaIntegration(diaryApiLambda), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });
    fastingIdResource.addMethod('DELETE', new apigateway.LambdaIntegration(diaryApiLambda), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    const mealsResource = api.root.addResource('meals');
    mealsResource.addMethod('GET', new apigateway.LambdaIntegration(diaryApiLambda), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });
    mealsResource.addMethod('POST', new apigateway.LambdaIntegration(diaryApiLambda), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });
    const mealIdResource = mealsResource.addResource('{mealId}');
    mealIdResource.addMethod('PUT', new apigateway.LambdaIntegration(diaryApiLambda), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });
    mealIdResource.addMethod('DELETE', new apigateway.LambdaIntegration(diaryApiLambda), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    const favoritesResource = api.root.addResource('favorites');
    favoritesResource.addMethod('GET', new apigateway.LambdaIntegration(diaryApiLambda), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });
    favoritesResource.addMethod('POST', new apigateway.LambdaIntegration(diaryApiLambda), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });
    const favoriteIdResource = favoritesResource.addResource('{foodId}');
    favoriteIdResource.addMethod('DELETE', new apigateway.LambdaIntegration(diaryApiLambda), {
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
