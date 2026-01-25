/**
 * FatSecret API Proxy Lambda
 * 
 * This Lambda function proxies requests to the FatSecret Platform API,
 * keeping OAuth credentials secure on the server side.
 * 
 * Endpoints:
 * - GET /foods/search?q={query}&page={page}&max_results={max}
 * - GET /foods/{id}
 */

const https = require('https');
const crypto = require('crypto');

const FATSECRET_CLIENT_ID = process.env.FATSECRET_CLIENT_ID;
const FATSECRET_CLIENT_SECRET = process.env.FATSECRET_CLIENT_SECRET;
const FATSECRET_API_URL = 'https://platform.fatsecret.com/rest/server.api';
const FATSECRET_TOKEN_URL = 'https://oauth.fatsecret.com/connect/token';

// Token cache (in-memory, refreshes on cold start)
let cachedToken = null;
let tokenExpiry = 0;

/**
 * Get OAuth 2.0 access token from FatSecret
 */
async function getAccessToken() {
  // Return cached token if still valid
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  const credentials = Buffer.from(`${FATSECRET_CLIENT_ID}:${FATSECRET_CLIENT_SECRET}`).toString('base64');

  return new Promise((resolve, reject) => {
    const postData = 'grant_type=client_credentials&scope=basic';
    
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`,
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const req = https.request(FATSECRET_TOKEN_URL, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.access_token) {
            cachedToken = parsed.access_token;
            // Set expiry 5 minutes before actual expiry for safety
            tokenExpiry = Date.now() + (parsed.expires_in - 300) * 1000;
            resolve(cachedToken);
          } else {
            reject(new Error('No access token in response'));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

/**
 * Make authenticated request to FatSecret API
 */
async function fatSecretRequest(method, params = {}) {
  const token = await getAccessToken();
  
  const queryParams = new URLSearchParams({
    method,
    format: 'json',
    ...params,
  });

  return new Promise((resolve, reject) => {
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Bearer ${token}`,
      },
    };

    const req = https.request(FATSECRET_API_URL, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(queryParams.toString());
    req.end();
  });
}

/**
 * Search foods
 */
async function searchFoods(query, page = 0, maxResults = 20) {
  const result = await fatSecretRequest('foods.search', {
    search_expression: query,
    page_number: String(page),
    max_results: String(maxResults),
  });

  return result;
}

/**
 * Get food by ID
 */
async function getFoodById(foodId) {
  const result = await fatSecretRequest('food.get.v4', {
    food_id: foodId,
  });

  return result;
}

/**
 * Lambda handler
 */
exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event));

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
  };

  // Handle OPTIONS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const path = event.path || event.rawPath || '';
    const queryParams = event.queryStringParameters || {};

    // GET /foods/search?q=query
    if (path.includes('/foods/search') && event.httpMethod === 'GET') {
      const query = queryParams.q || queryParams.query || '';
      const page = parseInt(queryParams.page || '0', 10);
      const maxResults = parseInt(queryParams.max_results || '20', 10);

      if (!query) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Query parameter "q" is required' }),
        };
      }

      const result = await searchFoods(query, page, maxResults);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result),
      };
    }

    // GET /foods/{id}
    const foodIdMatch = path.match(/\/foods\/(\d+)/);
    if (foodIdMatch && event.httpMethod === 'GET') {
      const foodId = foodIdMatch[1];
      const result = await getFoodById(foodId);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result),
      };
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Not found' }),
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error', message: error.message }),
    };
  }
};
