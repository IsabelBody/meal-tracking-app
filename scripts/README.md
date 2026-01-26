# EAS Environment Variables Setup

This directory contains scripts for managing EAS (Expo Application Services) environment variables.

## Setup EAS Environment Variables

To set up EAS environment variables from your `.env` file, run:

```bash
npm run setup:secrets
```

Or directly:

```bash
node scripts/setup-eas-secrets.js
```

You can also specify an environment:

```bash
node scripts/setup-eas-secrets.js production
node scripts/setup-eas-secrets.js preview
```

## How It Works

1. The script reads your `.env` file
2. Extracts the following environment variables:
   - `EXPO_PUBLIC_USER_POOL_ID`
   - `EXPO_PUBLIC_USER_POOL_CLIENT_ID`
   - `EXPO_PUBLIC_API_URL`
   - `EXPO_PUBLIC_AWS_REGION`
   - `EXPO_PUBLIC_USDA_API_KEY`
3. Sets them as EAS environment variables for the specified environment (default: production)
4. These variables are automatically available during builds for that environment

## Production Builds

Production builds in `eas.json` don't have hardcoded environment variables. Instead, EAS automatically injects environment variables that match the variable names. This keeps your credentials secure.

## Verify Environment Variables

To see your configured environment variables:

```bash
eas env:list --environment production
eas env:list --environment preview
```

## Requirements

- EAS CLI installed: `npm install -g eas-cli`
- Logged in to Expo: `expo login`
- `.env` file in the project root with your AWS configuration
