import { UserService } from '../src/services/userService';
import { Database } from '../src/database/database';
import { CryptoUtils } from '../src/utils/crypto';

describe('UserService', () => {
  let userService: UserService;
  let database: Database;

  beforeEach(async () => {
    database = new Database();
    await database.initialize();
    userService = new UserService();
  });

  afterEach(async () => {
    if (database) {
      await database.close();
    }
  });

  describe('createUser', () => {
    it('should create a new user with default account', async () => {
      const userData = {
        name: 'Test User',
        username: 'testuser',
        password: 'password123'
      };

      const user = await userService.createUser(userData);

      expect(user.id).toBeDefined();
      expect(user.name).toBe(userData.name);
      expect(user.username).toBe(userData.username);
      expect(user.password_hash).toBeUndefined(); // Should not be in response
      expect(user.accounts).toBeDefined();
      expect(user.accounts?.length).toBe(1);
      expect(user.accounts?.[0].name).toBe('Main Account');
      expect(user.accounts?.[0].currency).toBe('EUR');
    });

    it('should not create user with duplicate username', async () => {
      const userData = {
        name: 'Test User',
        username: 'testuser',
        password: 'password123'
      };

      await userService.createUser(userData);

      await expect(userService.createUser(userData)).rejects.toThrow();
    });
  });

  describe('getUserByUsername', () => {
    it('should retrieve user by username', async () => {
      const userData = {
        name: 'Test User',
        username: 'testuser',
        password: 'password123'
      };

      await userService.createUser(userData);
      const user = await userService.getUserByUsername(userData.username);

      expect(user).toBeDefined();
      expect(user?.username).toBe(userData.username);
    });

    it('should return null for non-existent user', async () => {
      const user = await userService.getUserByUsername('nonexistent');
      expect(user).toBeNull();
    });
  });

  describe('validatePassword', () => {
    it('should validate correct password', async () => {
      const userData = {
        name: 'Test User',
        username: 'testuser',
        password: 'password123'
      };

      await userService.createUser(userData);
      const user = await userService.validatePassword(userData.username, userData.password);

      expect(user).toBeDefined();
      expect(user?.username).toBe(userData.username);
    });

    it('should reject incorrect password', async () => {
      const userData = {
        name: 'Test User',
        username: 'testuser',
        password: 'password123'
      };

      await userService.createUser(userData);
      const user = await userService.validatePassword(userData.username, 'wrongpassword');

      expect(user).toBeNull();
    });
  });
});
