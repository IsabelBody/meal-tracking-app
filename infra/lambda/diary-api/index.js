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
const WEIGHT_TABLE = process.env.WEIGHT_TABLE_NAME;
const FASTING_TABLE = process.env.FASTING_TABLE_NAME;
const MEALS_TABLE = process.env.MEALS_TABLE_NAME;
const FAVORITES_TABLE = process.env.FAVORITES_TABLE_NAME;

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
 * Update a diary entry (serving amount, unit, description, nutrition)
 */
async function updateDiaryEntry(userId, entryKey, updates) {
  const timestamp = new Date().toISOString();
  const sets = ['updatedAt = :updatedAt'];
  const names = { '#updatedAt': 'updatedAt' };
  const values = { ':updatedAt': timestamp };

  if (updates.servingId !== undefined) {
    sets.push('servingId = :servingId');
    names['#servingId'] = 'servingId';
    values[':servingId'] = updates.servingId;
  }
  if (updates.servingAmount !== undefined) {
    sets.push('servingAmount = :servingAmount');
    names['#servingAmount'] = 'servingAmount';
    values[':servingAmount'] = updates.servingAmount;
  }
  if (updates.servingUnit !== undefined) {
    sets.push('servingUnit = :servingUnit');
    names['#servingUnit'] = 'servingUnit';
    values[':servingUnit'] = updates.servingUnit;
  }
  if (updates.servingDescription !== undefined) {
    sets.push('servingDescription = :servingDescription');
    names['#servingDescription'] = 'servingDescription';
    values[':servingDescription'] = updates.servingDescription;
  }
  if (updates.nutrition !== undefined) {
    sets.push('nutrition = :nutrition');
    names['#nutrition'] = 'nutrition';
    values[':nutrition'] = updates.nutrition;
  }
  if (sets.length === 1) return;

  const command = new UpdateCommand({
    TableName: DIARY_TABLE,
    Key: { userId, entryKey },
    UpdateExpression: 'SET ' + sets.join(', '),
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
    ReturnValues: 'ALL_NEW',
  });

  await docClient.send(command);
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

const DEFAULT_GOALS = {
  calories: 2000,
  protein: 150,
  carbs: 250,
  fat: 65,
  fiber: 25,
};

const DEFAULT_PROFILE = {
  unitSystem: 'metric',
  height: 169.5,
  age: 22,
  activityLevel: 'sedentary',
};

/**
 * Get user goals, profile, and avoided ingredients
 */
async function getGoals(userId) {
  const command = new GetCommand({
    TableName: GOALS_TABLE,
    Key: { userId },
  });

  const result = await docClient.send(command);
  const item = result.Item;
  if (!item) {
    return {
      goals: DEFAULT_GOALS,
      profile: DEFAULT_PROFILE,
      avoidedIngredients: [],
    };
  }

  const legacy = item.calories != null || item.protein != null;
  const goals = legacy
    ? {
        calories: item.calories ?? DEFAULT_GOALS.calories,
        protein: item.protein ?? DEFAULT_GOALS.protein,
        carbs: item.carbs ?? DEFAULT_GOALS.carbs,
        fat: item.fat ?? DEFAULT_GOALS.fat,
        fiber: item.fiber ?? DEFAULT_GOALS.fiber,
        sugar: item.sugar,
        sodium: item.sodium,
      }
    : { ...DEFAULT_GOALS, ...item.goals };
  const profile = item.profile ? { ...DEFAULT_PROFILE, ...item.profile } : DEFAULT_PROFILE;
  const avoidedIngredients = Array.isArray(item.avoidedIngredients) ? item.avoidedIngredients : [];

  return { goals, profile, avoidedIngredients };
}

/**
 * Update user goals, profile, and/or avoided ingredients (merge with existing)
 */
async function updateGoals(userId, payload) {
  const timestamp = new Date().toISOString();
  const existing = await getGoals(userId);

  const goals = payload.goals ? { ...existing.goals, ...payload.goals } : existing.goals;
  const profile = payload.profile ? { ...existing.profile, ...payload.profile } : existing.profile;
  const avoidedIngredients = payload.avoidedIngredients !== undefined
    ? payload.avoidedIngredients
    : existing.avoidedIngredients;

  const item = {
    userId,
    ...goals,
    profile,
    avoidedIngredients,
    updatedAt: timestamp,
  };

  const command = new PutCommand({
    TableName: GOALS_TABLE,
    Item: item,
  });

  await docClient.send(command);
  return { goals, profile, avoidedIngredients, updatedAt: timestamp };
}

function parsePath(raw) {
  return (raw || '').replace(/^\/(prod|dev|stage)(\/|$)/i, '/') || '/';
}

async function listWeight(userId, from, to) {
  const params = {
    TableName: WEIGHT_TABLE,
    KeyConditionExpression: from && to
      ? 'userId = :uid AND #d BETWEEN :from AND :to'
      : 'userId = :uid',
    ExpressionAttributeValues: from && to
      ? { ':uid': userId, ':from': from, ':to': to }
      : { ':uid': userId },
  };
  if (from && to) params.ExpressionAttributeNames = { '#d': 'date' };
  const res = await docClient.send(new QueryCommand(params));
  return (res.Items || []).map((i) => ({
    id: i.id,
    date: i.date,
    weight: i.weight,
    unit: i.unit,
    notes: i.notes,
    createdAt: i.createdAt,
    updatedAt: i.updatedAt,
  }));
}

async function upsertWeight(userId, body) {
  const ts = new Date().toISOString();
  const item = {
    userId,
    date: body.date,
    id: body.id || `w-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    weight: body.weight,
    unit: body.unit || 'kg',
    notes: body.notes || null,
    createdAt: body.createdAt || ts,
    updatedAt: ts,
  };
  await docClient.send(new PutCommand({ TableName: WEIGHT_TABLE, Item: item }));
  return item;
}

async function deleteWeight(userId, date) {
  await docClient.send(new DeleteCommand({
    TableName: WEIGHT_TABLE,
    Key: { userId, date },
  }));
}

async function listFasting(userId, dateFilter) {
  const params = {
    TableName: FASTING_TABLE,
    KeyConditionExpression: 'userId = :uid',
    ExpressionAttributeValues: { ':uid': userId },
  };
  if (dateFilter) {
    params.FilterExpression = '#d = :d';
    params.ExpressionAttributeNames = { '#d': 'date' };
    params.ExpressionAttributeValues = { ':uid': userId, ':d': dateFilter };
  }
  const res = await docClient.send(new QueryCommand(params));
  return (res.Items || []).map((i) => ({
    id: i.sessionId,
    sessionId: i.sessionId,
    startTime: i.startTime,
    endTime: i.endTime,
    goalDuration: i.goalDuration,
    date: i.date,
  }));
}

async function createFasting(userId, body) {
  const id = body.id || body.sessionId || `f-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const item = {
    userId,
    sessionId: id,
    startTime: body.startTime,
    endTime: body.endTime ?? null,
    goalDuration: body.goalDuration ?? 23 * 60 * 60 * 1000,
    date: body.date,
  };
  await docClient.send(new PutCommand({ TableName: FASTING_TABLE, Item: item }));
  return { ...item, id };
}

async function updateFasting(userId, sessionId, body) {
  const key = { userId, sessionId };
  const get = await docClient.send(new GetCommand({ TableName: FASTING_TABLE, Key: key }));
  const existing = get.Item;
  if (!existing) return null;
  const merged = {
    ...existing,
    startTime: body.startTime ?? existing.startTime,
    endTime: body.endTime !== undefined ? body.endTime : existing.endTime,
    goalDuration: body.goalDuration ?? existing.goalDuration,
  };
  await docClient.send(new PutCommand({ TableName: FASTING_TABLE, Item: merged }));
  return merged;
}

async function deleteFasting(userId, sessionId) {
  await docClient.send(new DeleteCommand({
    TableName: FASTING_TABLE,
    Key: { userId, sessionId },
  }));
}

async function listMeals(userId) {
  const res = await docClient.send(new QueryCommand({
    TableName: MEALS_TABLE,
    KeyConditionExpression: 'userId = :uid',
    ExpressionAttributeValues: { ':uid': userId },
  }));
  return (res.Items || []).map((i) => ({
    id: i.mealId,
    name: i.name,
    items: i.items || [],
    totalNutrition: i.totalNutrition || {},
    createdAt: i.createdAt,
    updatedAt: i.updatedAt,
  }));
}

async function createMeal(userId, body) {
  const id = body.id || `m-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const ts = new Date().toISOString();
  const item = {
    userId,
    mealId: id,
    name: body.name || '',
    items: body.items || [],
    totalNutrition: body.totalNutrition || {},
    createdAt: ts,
    updatedAt: ts,
  };
  await docClient.send(new PutCommand({ TableName: MEALS_TABLE, Item: item }));
  return { ...item, id };
}

async function updateMeal(userId, mealId, body) {
  const key = { userId, mealId };
  const get = await docClient.send(new GetCommand({ TableName: MEALS_TABLE, Key: key }));
  if (!get.Item) return null;
  const ts = new Date().toISOString();
  const item = {
    ...get.Item,
    name: body.name !== undefined ? body.name : get.Item.name,
    items: body.items !== undefined ? body.items : get.Item.items,
    totalNutrition: body.totalNutrition !== undefined ? body.totalNutrition : get.Item.totalNutrition,
    updatedAt: ts,
  };
  await docClient.send(new PutCommand({ TableName: MEALS_TABLE, Item: item }));
  return item;
}

async function deleteMeal(userId, mealId) {
  await docClient.send(new DeleteCommand({ TableName: MEALS_TABLE, Key: { userId, mealId } }));
}

async function listFavorites(userId) {
  const res = await docClient.send(new QueryCommand({
    TableName: FAVORITES_TABLE,
    KeyConditionExpression: 'userId = :uid',
    ExpressionAttributeValues: { ':uid': userId },
  }));
  return (res.Items || []).map((i) => i.data || i);
}

async function addFavorite(userId, body) {
  const foodId = body.food_id || body.foodId;
  if (!foodId) throw new Error('food_id required');
  const item = { userId, foodId, data: body };
  await docClient.send(new PutCommand({ TableName: FAVORITES_TABLE, Item: item }));
  return item;
}

async function removeFavorite(userId, foodId) {
  await docClient.send(new DeleteCommand({
    TableName: FAVORITES_TABLE,
    Key: { userId, foodId },
  }));
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

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const userId = getUserId(event);
    const path = parsePath(event.path || event.rawPath);
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

    // PUT /diary/{entryKey} - update entry
    const diaryEntryMatch = path.match(/^\/diary\/(.+)$/);
    if (diaryEntryMatch) {
      const entryKey = decodeURIComponent(diaryEntryMatch[1]);
      if (method === 'PUT') {
        const body = JSON.parse(event.body || '{}');
        const updates = {
          servingId: body.servingId,
          servingAmount: body.servingAmount,
          servingUnit: body.servingUnit,
          servingDescription: body.servingDescription,
          nutrition: body.nutrition,
        };
        Object.keys(updates).forEach((k) => updates[k] === undefined && delete updates[k]);
        await updateDiaryEntry(userId, entryKey, updates);
        const date = entryKey.split('#')[0];
        const entries = await getDiaryEntries(userId, date);
        const updated = entries.find((e) => e.entryKey === entryKey);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(updated || { entryKey }),
        };
      }
      if (method === 'DELETE') {
        await deleteDiaryEntry(userId, entryKey);
        return {
          statusCode: 204,
          headers,
          body: '',
        };
      }
    }

    // ========== GOALS ENDPOINTS ==========

    // GET /goals
    if (path === '/goals' && method === 'GET') {
      const data = await getGoals(userId);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(data),
      };
    }

    // PUT /goals
    if (path === '/goals' && method === 'PUT') {
      const body = JSON.parse(event.body || '{}');
      const hasNewShape = body.goals != null || body.profile != null || body.avoidedIngredients != null;
      const payload = hasNewShape ? body : { goals: body };
      const data = await updateGoals(userId, payload);
      return { statusCode: 200, headers, body: JSON.stringify(data) };
    }

    // ---------- WEIGHT ----------
    if (path === '/weight' && method === 'GET') {
      const from = queryParams.from;
      const to = queryParams.to;
      const items = await listWeight(userId, from, to);
      return { statusCode: 200, headers, body: JSON.stringify({ entries: items }) };
    }
    if (path === '/weight' && method === 'PUT') {
      const body = JSON.parse(event.body || '{}');
      if (!body.date) return { statusCode: 400, headers, body: JSON.stringify({ error: 'date required' }) };
      const item = await upsertWeight(userId, body);
      return { statusCode: 200, headers, body: JSON.stringify(item) };
    }
    const weightDateMatch = path.match(/^\/weight\/(.+)$/);
    if (weightDateMatch && method === 'DELETE') {
      const date = decodeURIComponent(weightDateMatch[1]);
      await deleteWeight(userId, date);
      return { statusCode: 204, headers, body: '' };
    }

    // ---------- FASTING ----------
    if (path === '/fasting' && method === 'GET') {
      const date = queryParams.date;
      const items = await listFasting(userId, date);
      return { statusCode: 200, headers, body: JSON.stringify({ sessions: items }) };
    }
    if (path === '/fasting' && method === 'POST') {
      const body = JSON.parse(event.body || '{}');
      if (!body.date || !body.startTime) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'date and startTime required' }) };
      }
      const item = await createFasting(userId, body);
      return { statusCode: 201, headers, body: JSON.stringify(item) };
    }
    const fastingIdMatch = path.match(/^\/fasting\/(.+)$/);
    if (fastingIdMatch) {
      const sessionId = decodeURIComponent(fastingIdMatch[1]);
      if (method === 'PUT') {
        const body = JSON.parse(event.body || '{}');
        const updated = await updateFasting(userId, sessionId, body);
        if (!updated) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Not found' }) };
        return { statusCode: 200, headers, body: JSON.stringify(updated) };
      }
      if (method === 'DELETE') {
        await deleteFasting(userId, sessionId);
        return { statusCode: 204, headers, body: '' };
      }
    }

    // ---------- MEALS ----------
    if (path === '/meals' && method === 'GET') {
      const items = await listMeals(userId);
      return { statusCode: 200, headers, body: JSON.stringify({ meals: items }) };
    }
    if (path === '/meals' && method === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const item = await createMeal(userId, body);
      return { statusCode: 201, headers, body: JSON.stringify(item) };
    }
    const mealIdMatch = path.match(/^\/meals\/(.+)$/);
    if (mealIdMatch) {
      const mealId = decodeURIComponent(mealIdMatch[1]);
      if (method === 'PUT') {
        const body = JSON.parse(event.body || '{}');
        const updated = await updateMeal(userId, mealId, body);
        if (!updated) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Not found' }) };
        return { statusCode: 200, headers, body: JSON.stringify(updated) };
      }
      if (method === 'DELETE') {
        await deleteMeal(userId, mealId);
        return { statusCode: 204, headers, body: '' };
      }
    }

    // ---------- FAVORITES ----------
    if (path === '/favorites' && method === 'GET') {
      const items = await listFavorites(userId);
      return { statusCode: 200, headers, body: JSON.stringify({ favorites: items }) };
    }
    if (path === '/favorites' && method === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const item = await addFavorite(userId, body);
      return { statusCode: 201, headers, body: JSON.stringify(item) };
    }
    const favIdMatch = path.match(/^\/favorites\/(.+)$/);
    if (favIdMatch && method === 'DELETE') {
      const foodId = decodeURIComponent(favIdMatch[1]);
      await removeFavorite(userId, foodId);
      return { statusCode: 204, headers, body: '' };
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
