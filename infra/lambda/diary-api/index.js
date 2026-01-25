/**
 * Diary API Lambda
 * 
 * Handles CRUD operations for meal diary entries and user goals.
 * Protected by Cognito authentication.
 * 
 * Endpoints:
 * - GET /diary?date={date}
 * - POST /diary
 * - DELETE /diary/{entryId}
 * - GET /goals
 * - PUT /goals
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { 
  DynamoDBDocumentClient, 
  PutCommand, 
  QueryCommand, 
  DeleteCommand,
  GetCommand,
  UpdateCommand,
} = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const DIARY_TABLE = process.env.DIARY_TABLE_NAME;
const GOALS_TABLE = process.env.GOALS_TABLE_NAME;

/**
 * Get user ID from Cognito authorizer claims
 */
function getUserId(event) {
  // From API Gateway Cognito authorizer
  const claims = event.requestContext?.authorizer?.claims;
  if (claims?.sub) return claims.sub;
  
  // Fallback for testing
  return event.headers?.['x-user-id'] || 'test-user';
}

/**
 * Get diary entries for a date
 */
async function getDiaryEntries(userId, date) {
  const command = new QueryCommand({
    TableName: DIARY_TABLE,
    KeyConditionExpression: 'userId = :userId AND begins_with(entryKey, :datePrefix)',
    ExpressionAttributeValues: {
      ':userId': userId,
      ':datePrefix': `${date}#`,
    },
  });

  const result = await docClient.send(command);
  return result.Items || [];
}

/**
 * Create a diary entry
 */
async function createDiaryEntry(userId, entry) {
  const entryId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const entryKey = `${entry.date}#${entry.mealType}#${entryId}`;
  const timestamp = new Date().toISOString();

  const item = {
    userId,
    entryKey,
    entryId,
    date: entry.date,
    mealType: entry.mealType,
    foodId: entry.foodId,
    foodName: entry.foodName,
    brandName: entry.brandName || null,
    servingId: entry.servingId,
    servingAmount: entry.servingAmount,
    servingUnit: entry.servingUnit,
    servingDescription: entry.servingDescription,
    nutrition: entry.nutrition,
    source: entry.source,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const command = new PutCommand({
    TableName: DIARY_TABLE,
    Item: item,
  });

  await docClient.send(command);
  return item;
}

/**
 * Delete a diary entry
 */
async function deleteDiaryEntry(userId, entryKey) {
  const command = new DeleteCommand({
    TableName: DIARY_TABLE,
    Key: {
      userId,
      entryKey,
    },
  });

  await docClient.send(command);
}

/**
 * Get user goals
 */
async function getGoals(userId) {
  const command = new GetCommand({
    TableName: GOALS_TABLE,
    Key: { userId },
  });

  const result = await docClient.send(command);
  return result.Item || {
    calories: 2000,
    protein: 150,
    carbs: 250,
    fat: 65,
    fiber: 25,
  };
}

/**
 * Update user goals
 */
async function updateGoals(userId, goals) {
  const timestamp = new Date().toISOString();

  const command = new PutCommand({
    TableName: GOALS_TABLE,
    Item: {
      userId,
      ...goals,
      updatedAt: timestamp,
    },
  });

  await docClient.send(command);
  return { userId, ...goals, updatedAt: timestamp };
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
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  };

  // Handle OPTIONS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const userId = getUserId(event);
    const path = event.path || event.rawPath || '';
    const method = event.httpMethod;
    const queryParams = event.queryStringParameters || {};

    // ========== DIARY ENDPOINTS ==========

    // GET /diary?date=YYYY-MM-DD
    if (path === '/diary' && method === 'GET') {
      const date = queryParams.date;
      if (!date) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Date parameter is required' }),
        };
      }

      const entries = await getDiaryEntries(userId, date);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ entries }),
      };
    }

    // POST /diary
    if (path === '/diary' && method === 'POST') {
      const body = JSON.parse(event.body || '{}');
      
      if (!body.date || !body.mealType || !body.foodId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Missing required fields: date, mealType, foodId' }),
        };
      }

      const entry = await createDiaryEntry(userId, body);
      return {
        statusCode: 201,
        headers,
        body: JSON.stringify(entry),
      };
    }

    // DELETE /diary/{entryKey}
    const diaryDeleteMatch = path.match(/\/diary\/(.+)/);
    if (diaryDeleteMatch && method === 'DELETE') {
      const entryKey = decodeURIComponent(diaryDeleteMatch[1]);
      await deleteDiaryEntry(userId, entryKey);
      return {
        statusCode: 204,
        headers,
        body: '',
      };
    }

    // ========== GOALS ENDPOINTS ==========

    // GET /goals
    if (path === '/goals' && method === 'GET') {
      const goals = await getGoals(userId);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(goals),
      };
    }

    // PUT /goals
    if (path === '/goals' && method === 'PUT') {
      const body = JSON.parse(event.body || '{}');
      const goals = await updateGoals(userId, body);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(goals),
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
