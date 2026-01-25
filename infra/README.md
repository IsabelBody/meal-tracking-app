# Meal Tracker Infrastructure

AWS CDK infrastructure for the Meal Tracker app.

## Prerequisites

1. AWS CLI configured with your `personal` profile
2. Node.js 18+ installed
3. AWS CDK CLI installed (`npm install -g aws-cdk`)

## Setup

1. Install dependencies:
   ```bash
   cd infra
   npm install
   ```

2. Bootstrap CDK (first time only):
   ```bash
   cdk bootstrap --profile personal
   ```

3. Deploy the stack:
   ```bash
   npm run deploy
   # or
   cdk deploy --profile personal
   ```

## Resources Created

- **Cognito User Pool**: User authentication with email/password
- **DynamoDB Tables**:
  - `meal-tracker-diary`: Food diary entries
  - `meal-tracker-goals`: User nutrition goals
- **Lambda Functions**:
  - `meal-tracker-diary-api`: CRUD operations for diary entries
- **API Gateway**: REST API with endpoints for diary management

## API Endpoints

### Protected (Cognito auth required)
- `GET /diary?date={YYYY-MM-DD}` - Get diary entries for a date
- `POST /diary` - Create a diary entry
- `DELETE /diary/{entryKey}` - Delete a diary entry
- `GET /goals` - Get user's nutrition goals
- `PUT /goals` - Update user's nutrition goals

## Outputs

After deployment, the following values will be output:
- `UserPoolId` - Cognito User Pool ID
- `UserPoolClientId` - Cognito User Pool Client ID
- `ApiEndpoint` - API Gateway base URL

Use these values to configure the mobile app.

## Cleanup

To destroy all resources:
```bash
npm run destroy
# or
cdk destroy --profile personal
```

## Important Notes

- For production, change `removalPolicy` from DESTROY to RETAIN
