const { getDb } = require('../config/database');
const { generateAccountNumber } = require('../utils/helpers');

/**
 * @swagger
 * components:
 *   schemas:
 *     Account:
 *       type: object
 *       required:
 *         - account_number
 *         - user_id
 *         - currency
 *       properties:
 *         id:
 *           type: integer
 *           description: The account ID
 *         account_number:
 *           type: string
 *           description: The unique account number
 *         user_id:
 *           type: integer
 *           description: The user ID who owns this account
 *         balance:
 *           type: number
 *           format: float
 *           description: The account balance
 *         currency:
 *           type: string
 *           description: The currency code (EUR, USD, etc.)
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: The date of account creation
 *         updated_at:
 *           type: string
 *           format: date-time
 *           description: The date of last update
 */

class Account {
  /**
   * Create a new account for a user
   * @param {Object} accountData - Account data
   * @returns {Promise<Object>} - Created account
   */
  static async create(accountData) {
    return new Promise((resolve, reject) => {
      const { user_id, currency } = accountData;
      
      // Generate a unique account number with bank prefix
      const account_number = generateAccountNumber(currency);
      
      const db = getDb();
      const query = `
        INSERT INTO accounts (account_number, user_id, balance, currency)
        VALUES (?, ?, ?, ?)
      `;
      
      // Muuda saldo väärtus 0-st 1000-ks
      db.run(query, [account_number, user_id, 1000, currency], function(err) {
        if (err) {
          return reject(err);
        }
        
        // Get the created account
        db.get('SELECT * FROM accounts WHERE id = ?', [this.lastID], (err, account) => {
          if (err) {
            return reject(err);
          }
          resolve(account);
        });
      });
    });
  }
  
  /**
   * Find an account by ID
   * @param {number} id - Account ID
   * @returns {Promise<Object>} - Account object
   */
  static async findById(id) {
    return new Promise((resolve, reject) => {
      const db = getDb();
      db.get('SELECT * FROM accounts WHERE id = ?', [id], (err, account) => {
        if (err) {
          return reject(err);
        }
        resolve(account);
      });
    });
  }
  
  /**
   * Find an account by account number
   * @param {string} accountNumber - Account number
   * @returns {Promise<Object>} - Account object
   */
  static async findByAccountNumber(accountNumber) {
    return new Promise((resolve, reject) => {
      const db = getDb();
      db.get('SELECT * FROM accounts WHERE account_number = ?', [accountNumber], (err, account) => {
        if (err) {
          return reject(err);
        }
        resolve(account);
      });
    });
  }
  
  /**
   * Find all accounts for a user
   * @param {number} userId - User ID
   * @returns {Promise<Array>} - Array of accounts
   */
  static async findByUserId(userId) {
    return new Promise((resolve, reject) => {
      const db = getDb();
      db.all('SELECT * FROM accounts WHERE user_id = ?', [userId], (err, accounts) => {
        if (err) {
          return reject(err);
        }
        resolve(accounts);
      });
    });
  }
  
  /**
   * Update account balance
   * @param {string} accountNumber - Account number
   * @param {number} amount - Amount to add (positive) or subtract (negative)
   * @returns {Promise<Object>} - Updated account
   */
  static async updateBalance(accountNumber, amount) {
    return new Promise((resolve, reject) => {
      const db = getDb();
      
      // Start a transaction to ensure data consistency
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        // Get the current account
        db.get('SELECT * FROM accounts WHERE account_number = ?', [accountNumber], (err, account) => {
          if (err) {
            db.run('ROLLBACK');
            return reject(err);
          }
          
          if (!account) {
            db.run('ROLLBACK');
            return reject(new Error('Account not found'));
          }
          
          // Calculate new balance
          const newBalance = account.balance + amount;
          
          // Check for negative balance
          if (newBalance < 0) {
            db.run('ROLLBACK');
            return reject(new Error('Insufficient funds'));
          }
          
          // Update the balance
          db.run('UPDATE accounts SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE account_number = ?', 
            [newBalance, accountNumber], function(err) {
              if (err) {
                db.run('ROLLBACK');
                return reject(err);
              }
              
              if (this.changes === 0) {
                db.run('ROLLBACK');
                return reject(new Error('Account update failed'));
              }
              
              // Commit the transaction
              db.run('COMMIT', (err) => {
                if (err) {
                  db.run('ROLLBACK');
                  return reject(err);
                }
                
                // Get the updated account
                db.get('SELECT * FROM accounts WHERE account_number = ?', [accountNumber], (err, updatedAccount) => {
                  if (err) {
                    return reject(err);
                  }
                  resolve(updatedAccount);
                });
              });
            }
          );
        });
      });
    });
  }
}

module.exports = Account;