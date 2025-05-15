const { getDb } = require('../config/database');
const bcrypt = require('bcrypt');

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - username
 *         - password
 *         - email
 *         - full_name
 *       properties:
 *         id:
 *           type: integer
 *           description: The user ID
 *         username:
 *           type: string
 *           description: The username
 *         email:
 *           type: string
 *           format: email
 *           description: The user email
 *         full_name:
 *           type: string
 *           description: The user's full name
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: The date of user creation
 *         updated_at:
 *           type: string
 *           format: date-time
 *           description: The date of last update
 */

class User {
  /**
   * Create a new user
   * @param {Object} userData - User data
   * @returns {Promise<Object>} - Created user
   */
  static async create(userData) {
    return new Promise((resolve, reject) => {
      const { username, password, email, full_name } = userData;
      
      // Hash the password
      bcrypt.hash(password, 10, (err, hashedPassword) => {
        if (err) {
          return reject(err);
        }
        
        const db = getDb();
        const query = `
          INSERT INTO users (username, password, email, full_name)
          VALUES (?, ?, ?, ?)
        `;
        
        db.run(query, [username, hashedPassword, email, full_name], function(err) {
          if (err) {
            // Check for duplicate username or email
            if (err.message.includes('UNIQUE constraint failed')) {
              if (err.message.includes('username')) {
                return reject(new Error('Username already exists'));
              } else if (err.message.includes('email')) {
                return reject(new Error('Email already exists'));
              }
            }
            return reject(err);
          }
          
          // Get the created user
          db.get('SELECT id, username, email, full_name, created_at, updated_at FROM users WHERE id = ?', [this.lastID], (err, user) => {
            if (err) {
              return reject(err);
            }
            resolve(user);
          });
        });
      });
    });
  }
  
  /**
   * Find a user by username
   * @param {string} username - Username
   * @returns {Promise<Object>} - User object
   */
  static async findByUsername(username) {
    return new Promise((resolve, reject) => {
      const db = getDb();
      db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
        if (err) {
          return reject(err);
        }
        resolve(user);
      });
    });
  }
  
  /**
   * Find a user by ID
   * @param {number} id - User ID
   * @returns {Promise<Object>} - User object
   */
  static async findById(id) {
    return new Promise((resolve, reject) => {
      const db = getDb();
      db.get('SELECT id, username, email, full_name, created_at, updated_at FROM users WHERE id = ?', [id], (err, user) => {
        if (err) {
          return reject(err);
        }
        resolve(user);
      });
    });
  }
  
  /**
   * Validate user password
   * @param {string} password - Plain password
   * @param {string} hashedPassword - Hashed password
   * @returns {Promise<boolean>} - True if password is valid
   */
  static async validatePassword(password, hashedPassword) {
    return bcrypt.compare(password, hashedPassword);
  }
  
  /**
   * Create a session for the user
   * @param {number} userId - User ID
   * @param {string} token - JWT token
   * @param {number} expiresIn - Token expiration time in seconds
   * @returns {Promise<Object>} - Session object
   */
  static async createSession(userId, token, expiresIn = 86400) {
    return new Promise((resolve, reject) => {
      const db = getDb();
      const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
      
      const query = `
        INSERT INTO sessions (user_id, token, expires_at)
        VALUES (?, ?, ?)
      `;
      
      db.run(query, [userId, token, expiresAt], function(err) {
        if (err) {
          return reject(err);
        }
        
        resolve({
          id: this.lastID,
          user_id: userId,
          token,
          expires_at: expiresAt
        });
      });
    });
  }
  
  /**
   * Delete a session
   * @param {string} token - JWT token
   * @returns {Promise<boolean>} - True if session is deleted
   */
  static async deleteSession(token) {
    return new Promise((resolve, reject) => {
      const db = getDb();
      db.run('DELETE FROM sessions WHERE token = ?', [token], function(err) {
        if (err) {
          return reject(err);
        }
        resolve(this.changes > 0);
      });
    });
  }
}

module.exports = User;