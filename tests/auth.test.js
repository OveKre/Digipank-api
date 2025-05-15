const request = require('supertest');
const app = require('../app');
const { getDb, closeDb } = require('../config/database');
const { generateAuthToken } = require('../config/jwt');
const User = require('../models/User');

// Test user data
const testUser = {
  username: 'testauth',
  password: 'Test1234',
  email: 'testauth@example.com',
  full_name: 'Test Auth User'
};

let authToken;
let userId;

describe('Authentication', () => {
  beforeAll(async () => {
    // Clear test data before starting
    const db = getDb();
    await new Promise((resolve) => {
      db.run('DELETE FROM users WHERE username = ?', [testUser.username], resolve);
    });
  });

  afterAll(async () => {
    // Clean up
    const db = getDb();
    await new Promise((resolve) => {
      db.run('DELETE FROM users WHERE username = ?', [testUser.username], resolve);
    });
    closeDb();
  });

  describe('POST /auth/register', () => {
    it('should register a new user', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send(testUser)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.username).toBe(testUser.username);
      expect(response.body.data.email).toBe(testUser.email);
      expect(response.body.data.full_name).toBe(testUser.full_name);

      userId = response.body.data.id;
    });

    it('should return error for duplicate username', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send(testUser)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          username: 'incomplete'
        })
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });
  });

  describe('POST /auth/login', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          username: testUser.username,
          password: testUser.password
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user.username).toBe(testUser.username);

      authToken = response.body.data.token;
    });

    it('should return error for invalid credentials', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          username: testUser.username,
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid credentials');
    });
  });

  describe('GET /auth/profile', () => {
    it('should return user profile for authenticated user', async () => {
      const response = await request(app)
        .get('/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(userId);
      expect(response.body.data.username).toBe(testUser.username);
    });

    it('should return error for unauthenticated request', async () => {
      const response = await request(app)
        .get('/auth/profile')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout the user', async () => {
      const response = await request(app)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Logged out');
    });

    it('should reject accessing protected routes after logout', async () => {
      const response = await request(app)
        .get('/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });
});