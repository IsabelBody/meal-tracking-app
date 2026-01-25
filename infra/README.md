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

2. Set FatSecret API credentials as environment variables:
   ```bash
   export FATSECRET_CLIENT_ID=your_client_id
   export FATSECRET_CLIENT_SECRET=your_client_secret
   ```
   
   Or add them to a `.env` file (don't commit this!):
   ```
   FATSECRET_CLIENT_ID=your_client_id
   FATSECRET_CLIENT_SECRET=your_client_secret
   ```

3. Bootstrap CDK (first time only):
   ```bash
   cdk bootstrap --profile personal
   ```

4. Deploy the stack:
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
  - `meal-tracker-fatsecret-proxy`: Proxies requests to FatSecret API
  - `meal-tracker-diary-api`: CRUD operations for diary entries
- **API Gateway**: REST API with endpoints for food search and diary management

## API Endpoints

### Public (no auth required)
- `GET /foods/search?q={query}&page={page}&max_results={max}` - Search foods
- `GET /foods/{id}` - Get food details by ID

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

- The FatSecret Basic tier has a 5,000 API calls/day limit
- FatSecret attribution is required in your app
- For production, change `removalPolicy` from DESTROY to RETAIN
