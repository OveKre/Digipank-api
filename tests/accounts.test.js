const request = require('supertest');
const app = require('../app');
const { getDb, closeDb } = require('../config/database');
const User = require('../models/User');
const { generateAuthToken } = require('../config/jwt');

// Test user data
const testUser = {
  username: 'testaccounts',
  password: 'Test1234',
  email: 'testaccounts@example.com',
  full_name: 'Test Accounts User'
};

let authToken;
let userId;
let accountId;
let accountNumber;

describe('Accounts', () => {
  beforeAll(async () => {
    // Create test user and get auth token
    const db = getDb();
    
    // Clear any existing test user
    await new Promise((resolve) => {
      db.run('DELETE FROM users WHERE username = ?', [testUser.username], resolve);
    });
    
    // Create user
    const user = await User.create(testUser);
    userId = user.id;
    
    // Generate auth token
    authToken = generateAuthToken(userId);
    
    // Create session
    await User.createSession(userId, authToken);
  });

  afterAll(async () => {
    // Clean up
    const db = getDb();
    await new Promise((resolve) => {
      db.run('DELETE FROM users WHERE username = ?', [testUser.username], resolve);
    });
    closeDb();
  });

  describe('POST /accounts', () => {
    it('should create a new account', async () => {
      const response = await request(app)
        .post('/accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ currency: 'EUR' })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.user_id).toBe(userId);
      expect(response.body.data.currency).toBe('EUR');
      expect(response.body.data.balance).toBe(0);
      
      accountId = response.body.data.id;
      accountNumber = response.body.data.account_number;
    });

    it('should validate currency format', async () => {
      const response = await request(app)
        .post('/accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ currency: 'invalid' })
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });
  });

  describe('GET /accounts', () => {
    it('should get all accounts for the user', async () => {
      const response = await request(app)
        .get('/accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0].user_id).toBe(userId);
    });
  });

  describe('GET /accounts/:id', () => {
    it('should get account by ID', async () => {
      const response = await request(app)
        .get(`/accounts/${accountId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(accountId);
      expect(response.body.data.user_id).toBe(userId);
    });

    it('should return 404 for non-existent account', async () => {
      const response = await request(app)
        .get('/accounts/9999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /accounts/number/:accountNumber', () => {
    it('should get account by account number', async () => {
      const response = await request(app)
        .get(`/accounts/number/${accountNumber}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.account_number).toBe(accountNumber);
      expect(response.body.data.user_id).toBe(userId);
    });

    it('should return 404 for non-existent account number', async () => {
      const response = await request(app)
        .get('/accounts/number/INVALID123456')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /accounts/number/:accountNumber/transactions', () => {
    it('should get transactions for an account', async () => {
      const response = await request(app)
        .get(`/accounts/number/${accountNumber}/transactions`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      // No transactions yet, but should return an empty array
    });
  });
});