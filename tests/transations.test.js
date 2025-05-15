const request = require('supertest');
const app = require('../app');
const { getDb, closeDb } = require('../config/database');
const User = require('../models/User');
const Account = require('../models/Account');
const { generateAuthToken } = require('../config/jwt');

// Test user data
const testUser = {
  username: 'testtransactions',
  password: 'Test1234',
  email: 'testtransactions@example.com',
  full_name: 'Test Transactions User'
};

let authToken;
let userId;
let account1, account2;
let transactionReferenceId;

describe('Transactions', () => {
  beforeAll(async () => {
    // Create test user and accounts
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
    
    // Create two accounts for this user
    account1 = await Account.create({
      user_id: userId,
      currency: 'EUR'
    });
    
    account2 = await Account.create({
      user_id: userId,
      currency: 'EUR'
    });
    
    // Add initial balance to the first account
    await Account.updateBalance(account1.account_number, 1000);
  });

  afterAll(async () => {
    // Clean up
    const db = getDb();
    await new Promise((resolve) => {
      db.run('DELETE FROM users WHERE username = ?', [testUser.username], resolve);
    });
    closeDb();
  });

  describe('POST /transactions/internal', () => {
    it('should create an internal transaction', async () => {
      const transactionData = {
        from_account: account1.account_number,
        to_account: account2.account_number,
        amount: 100,
        currency: 'EUR',
        description: 'Test internal transaction'
      };
      
      const response = await request(app)
        .post('/transactions/internal')
        .set('Authorization', `Bearer ${authToken}`)
        .send(transactionData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('reference_id');
      expect(response.body.data.from_account).toBe(account1.account_number);
      expect(response.body.data.to_account).toBe(account2.account_number);
      expect(response.body.data.amount).toBe(100);
      expect(response.body.data.status).toBe('completed');
      
      transactionReferenceId = response.body.data.reference_id;
      
      // Check updated balances
      const updatedAccount1 = await Account.findByAccountNumber(account1.account_number);
      const updatedAccount2 = await Account.findByAccountNumber(account2.account_number);
      
      expect(updatedAccount1.balance).toBe(900); // 1000 - 100
      expect(updatedAccount2.balance).toBe(100);
    });

    it('should reject transaction with insufficient funds', async () => {
      const transactionData = {
        from_account: account1.account_number,
        to_account: account2.account_number,
        amount: 2000, // More than account1 balance
        currency: 'EUR',
        description: 'Test insufficient funds'
      };
      
      const response = await request(app)
        .post('/transactions/internal')
        .set('Authorization', `Bearer ${authToken}`)
        .send(transactionData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Insufficient funds');
    });

    it('should validate currency match', async () => {
      // Create a USD account
      const usdAccount = await Account.create({
        user_id: userId,
        currency: 'USD'
      });
      
      const transactionData = {
        from_account: account1.account_number, // EUR
        to_account: usdAccount.account_number, // USD
        amount: 100,
        currency: 'EUR',
        description: 'Test currency mismatch'
      };
      
      const response = await request(app)
        .post('/transactions/internal')
        .set('Authorization', `Bearer ${authToken}`)
        .send(transactionData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Currency mismatch');
    });
  });

  describe('GET /transactions/:referenceId', () => {
    it('should get transaction by reference ID', async () => {
      const response = await request(app)
        .get(`/transactions/${transactionReferenceId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.reference_id).toBe(transactionReferenceId);
      expect(response.body.data.from_account).toBe(account1.account_number);
      expect(response.body.data.to_account).toBe(account2.account_number);
    });

    it('should return 404 for non-existent transaction', async () => {
      const response = await request(app)
        .get('/transactions/nonexistent-reference-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /transactions', () => {
    it('should get all transactions for the user', async () => {
      const response = await request(app)
        .get('/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      
      // Check if our transaction is in the list
      const foundTransaction = response.body.data.find(
        t => t.reference_id === transactionReferenceId
      );
      expect(foundTransaction).toBeDefined();
    });
  });

  describe('GET /transactions/jwks', () => {
    it('should return the JWKS', async () => {
      const response = await request(app)
        .get('/transactions/jwks')
        .expect(200);

      // JWKS should be a valid object
      expect(response.body).toHaveProperty('keys');
      expect(Array.isArray(response.body.keys)).toBe(true);
    });
  });
});