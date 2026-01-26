# Meal Tracker App

A nutrition tracking app similar to Cronometer/MyFitnessPal, built with React Native (Expo), Tamagui UI, and AWS backend services.

## Features

- **Food Search**: Search USDA FoodData Central database
- **Barcode Scanning**: Scan product barcodes using Open Food Facts (free tier)
- **Food Diary**: Track daily food intake
- **Macro Tracking**: Monitor calories, protein, carbs, and fat
- **Goal Setting**: Set personalized nutrition goals
- **Progress Visualization**: Daily progress rings and summaries
- **Offline Support**: Local caching with Zustand persist

## Tech Stack

### Mobile App
- **Framework**: Expo SDK 54 with React Native
- **UI Library**: Tamagui (cross-platform, optimizing compiler)
- **State Management**: Zustand with persist middleware
- **Navigation**: Expo Router v6 (file-based routing)
- **Forms**: React Hook Form + Zod validation

### Backend (AWS)
- **Authentication**: Cognito User Pools
- **Database**: DynamoDB (diary entries, user goals)
- **API**: API Gateway + Lambda
- **Infrastructure**: AWS CDK

### APIs
- **USDA FoodData Central**: Food nutrition database (free API)
- **Open Food Facts**: Free barcode database

## Project Structure

```
meal-tracking-app/
├── app/                      # Expo Router screens
│   ├── (auth)/              # Auth screens (login, register)
│   ├── (tabs)/              # Main tab screens
│   │   ├── index.tsx        # Dashboard
│   │   ├── search.tsx       # Food search
│   │   ├── scanner.tsx      # Barcode scanner
│   │   └── profile.tsx      # Goals & settings
│   ├── food/[id].tsx        # Food detail
│   └── add-food.tsx         # Add food modal
├── src/
│   ├── components/          # Reusable UI components
│   ├── services/
│   │   ├── api/             # API clients
│   │   └── aws/             # AWS config
│   ├── stores/              # Zustand stores
│   ├── types/               # TypeScript types
│   └── utils/               # Helper functions
├── infra/                   # AWS CDK infrastructure
│   ├── lib/                 # CDK stacks
│   └── lambda/              # Lambda functions
├── tamagui.config.ts        # Tamagui theme config
└── app.json                 # Expo config
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- AWS CLI configured with your profile
- AWS CDK CLI (`npm install -g aws-cdk`)
- USDA API key (optional, get from https://fdc.nal.usda.gov/api-key-signup)

### 1. Install Dependencies

```bash
# Install app dependencies
npm install

# Install infrastructure dependencies
cd infra
npm install
cd ..
```

### 2. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env.local
```

### 3. Deploy AWS Infrastructure

```bash
cd infra

# Bootstrap CDK (first time only)
cdk bootstrap --profile personal

# Deploy
npm run deploy
```

After deployment, note the outputs:
- `UserPoolId`
- `UserPoolClientId`
- `ApiEndpoint`

### 4. Update App Configuration

Update `.env.local` with the CDK outputs:

```
EXPO_PUBLIC_USER_POOL_ID=us-east-1_XXXXXXXXX
EXPO_PUBLIC_USER_POOL_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
EXPO_PUBLIC_API_URL=https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/prod
```

### 5. Run the App

```bash
# Start Expo development server
npm start

# Run on Android
npm run android

# Run on iOS (macOS only)
npm run ios
```

## API Rate Limits

### USDA FoodData Central
- Free API with generous rate limits
- DEMO_KEY: 30 requests/hour, 50 requests/day
- Registered key: 1,000 requests/hour

### Open Food Facts
- Unlimited calls (be respectful)
- Global product database
- Free and open source

## Caching Strategy

- Search results cached for 24 hours
- Food details cached by ID
- Recent foods stored locally
- Offline diary entries sync when online

## Development

### Running Locally

```bash
# Start with cache clear
npx expo start -c

# Run on specific platform
npx expo run:android
npx expo run:ios
```

### Code Structure Guidelines

- **Screens**: `app/` directory using Expo Router
- **Components**: Reusable UI in `src/components/`
- **Business Logic**: Feature-specific hooks in `src/features/`
- **State**: Zustand stores in `src/stores/`
- **Types**: Shared types in `src/types/`

## License

MIT
