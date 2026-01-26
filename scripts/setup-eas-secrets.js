#!/usr/bin/env node

/**
 * Script to set up EAS secrets from .env file
 * 
 * This script reads environment variables from .env and sets them as EAS secrets.
 * Run with: node scripts/setup-eas-secrets.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Load .env file
function loadEnvFile() {
  const envPath = path.join(__dirname, '..', '.env');
  
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env file not found!');
    console.error('Please create a .env file with your AWS configuration.');
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, 'utf-8');
  const envVars = {};

  envContent.split('\n').forEach((line) => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim();
        // Remove quotes if present
        envVars[key.trim()] = value.replace(/^["']|["']$/g, '');
      }
    }
  });

  return envVars;
}

// Set EAS environment variable (using new eas env:create command)
function setEASSecret(name, value, environment = 'production') {
  try {
    console.log(`Setting environment variable: ${name} for ${environment}...`);
    
    // Escape value for shell (handle quotes and special chars)
    const escapedValue = value.replace(/"/g, '\\"');
    
    // Determine visibility: EXPO_PUBLIC_* vars are plaintext (public anyway), others are sensitive
    const visibility = name.startsWith('EXPO_PUBLIC_') ? 'plaintext' : 'sensitive';
    
    // Use the new eas env:create command (replaces deprecated secret:create)
    // --force flag updates if exists
    const command = `eas env:create --name ${name} --value "${escapedValue}" --environment ${environment} --visibility ${visibility} --force --non-interactive`;
    
    try {
      execSync(command, {
        stdio: 'inherit',
        cwd: path.join(__dirname, '..'),
        shell: true,
      });
      console.log(`✅ Successfully set ${name} for ${environment}`);
      return true;
    } catch (createError) {
      // Try without --force first, then with it
      console.log(`  Attempting to update existing variable...`);
      try {
        // Try to delete first if it exists
        try {
          execSync(`eas env:delete --name ${name} --environment ${environment} --non-interactive`, {
            stdio: 'ignore',
            cwd: path.join(__dirname, '..'),
            shell: true,
          });
        } catch (deleteError) {
          // Ignore delete errors (variable might not exist)
        }
        
        // Create again
        execSync(command, {
          stdio: 'inherit',
          cwd: path.join(__dirname, '..'),
          shell: true,
        });
        console.log(`✅ Successfully set ${name} for ${environment}`);
        return true;
      } catch (retryError) {
        throw retryError;
      }
    }
  } catch (error) {
    console.error(`❌ Failed to set ${name}:`, error.message);
    return false;
  }
}

// Main function
function main() {
  console.log('🔐 Setting up EAS secrets from .env file...\n');

  const envVars = loadEnvFile();

  // List of secrets to set (only EXPO_PUBLIC_* vars that are needed for builds)
  const secretsToSet = [
    'EXPO_PUBLIC_USER_POOL_ID',
    'EXPO_PUBLIC_USER_POOL_CLIENT_ID',
    'EXPO_PUBLIC_API_URL',
    'EXPO_PUBLIC_AWS_REGION',
    'EXPO_PUBLIC_USDA_API_KEY', // Optional but good to have
  ];

  let successCount = 0;
  let failCount = 0;

  // Set secrets for production environment
  const environment = process.argv[2] || 'production';
  console.log(`Setting environment variables for: ${environment}\n`);

  secretsToSet.forEach((secretName) => {
    const value = envVars[secretName];
    
    if (!value) {
      console.warn(`⚠️  ${secretName} not found in .env, skipping...`);
      return;
    }

    if (setEASSecret(secretName, value, environment)) {
      successCount++;
    } else {
      failCount++;
    }
  });

  console.log('\n📊 Summary:');
  console.log(`✅ Successfully set: ${successCount}`);
  if (failCount > 0) {
    console.log(`❌ Failed: ${failCount}`);
  }
  console.log('\n✨ Done! Your EAS environment variables are now configured.');
  console.log(`You can verify them with: eas env:list --environment ${environment}`);
}

// Check if EAS CLI is installed
try {
  execSync('eas --version', { stdio: 'ignore' });
} catch (error) {
  console.error('❌ EAS CLI not found!');
  console.error('Please install it with: npm install -g eas-cli');
  process.exit(1);
}

main();
