const { getDb } = require('../config/database');
const { generateReferenceId } = require('../utils/helpers');

/**
 * @swagger
 * components:
 *   schemas:
 *     Transaction:
 *       type: object
 *       required:
 *         - reference_id
 *         - from_account
 *         - to_account
 *         - amount
 *         - currency
 *         - status
 *         - type
 *       properties:
 *         id:
 *           type: integer
 *           description: The transaction ID
 *         reference_id:
 *           type: string
 *           description: The unique reference ID
 *         from_account:
 *           type: string
 *           description: The source account number
 *         to_account:
 *           type: string
 *           description: The destination account number
 *         amount:
 *           type: number
 *           format: float
 *           description: The transaction amount
 *         currency:
 *           type: string
 *           description: The currency code (EUR, USD, etc.)
 *         status:
 *           type: string
 *           enum: [pending, in_progress, completed, failed]
 *           description: The transaction status
 *         type:
 *           type: string
 *           enum: [internal, external, incoming]
 *           description: The transaction type
 *         description:
 *           type: string
 *           description: The transaction description
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: The date of transaction creation
 *         updated_at:
 *           type: string
 *           format: date-time
 *           description: The date of last update
 */

class Transaction {
  /**
   * Create a new transaction
   * @param {Object} transactionData - Transaction data
   * @returns {Promise<Object>} - Created transaction
   */
  static async create(transactionData) {
    return new Promise((resolve, reject) => {
      const { 
        from_account, 
        to_account, 
        amount, 
        currency, 
        status = 'pending', 
        type, 
        description = null 
      } = transactionData;
      
      // Generate a unique reference ID if not provided
      const reference_id = transactionData.reference_id || generateReferenceId();
      
      const db = getDb();
      const query = `
        INSERT INTO transactions (
          reference_id, from_account, to_account, amount, 
          currency, status, type, description
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      db.run(query, [
        reference_id, from_account, to_account, amount, 
        currency, status, type, description
      ], function(err) {
        if (err) {
          // Check for duplicate reference ID
          if (err.message.includes('UNIQUE constraint failed: transactions.reference_id')) {
            return reject(new Error('Transaction with this reference ID already exists'));
          }
          return reject(err);
        }
        
        // Get the created transaction
        db.get('SELECT * FROM transactions WHERE id = ?', [this.lastID], (err, transaction) => {
          if (err) {
            return reject(err);
          }
          resolve(transaction);
        });
      });
    });
  }
  
  /**
   * Find a transaction by ID
   * @param {number} id - Transaction ID
   * @returns {Promise<Object>} - Transaction object
   */
  static async findById(id) {
    return new Promise((resolve, reject) => {
      const db = getDb();
      db.get('SELECT * FROM transactions WHERE id = ?', [id], (err, transaction) => {
        if (err) {
          return reject(err);
        }
        resolve(transaction);
      });
    });
  }
  
  /**
   * Find a transaction by reference ID
   * @param {string} referenceId - Reference ID
   * @returns {Promise<Object>} - Transaction object
   */
  static async findByReferenceId(referenceId) {
    return new Promise((resolve, reject) => {
      const db = getDb();
      db.get('SELECT * FROM transactions WHERE reference_id = ?', [referenceId], (err, transaction) => {
        if (err) {
          return reject(err);
        }
        resolve(transaction);
      });
    });
  }
  
  /**
   * Find all transactions for an account
   * @param {string} accountNumber - Account number
   * @returns {Promise<Array>} - Array of transactions
   */
  static async findByAccount(accountNumber) {
    return new Promise((resolve, reject) => {
      const db = getDb();
      db.all(
        'SELECT * FROM transactions WHERE from_account = ? OR to_account = ? ORDER BY created_at DESC', 
        [accountNumber, accountNumber], 
        (err, transactions) => {
          if (err) {
            return reject(err);
          }
          resolve(transactions);
        }
      );
    });
  }
  
  /**
   * Update transaction status
   * @param {string} referenceId - Reference ID
   * @param {string} status - New status
   * @returns {Promise<Object>} - Updated transaction
   */
  static async updateStatus(referenceId, status) {
    return new Promise((resolve, reject) => {
      const db = getDb();
      db.run(
        'UPDATE transactions SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE reference_id = ?',
        [status, referenceId],
        function(err) {
          if (err) {
            return reject(err);
          }
          
          if (this.changes === 0) {
            return reject(new Error('Transaction not found'));
          }
          
          // Get the updated transaction
          db.get('SELECT * FROM transactions WHERE reference_id = ?', [referenceId], (err, transaction) => {
            if (err) {
              return reject(err);
            }
            resolve(transaction);
          });
        }
      );
    });
  }
  
  /**
   * Get transactions by user ID
   * @param {number} userId - User ID
   * @returns {Promise<Array>} - Array of transactions
   */
  static async findByUserId(userId) {
    return new Promise((resolve, reject) => {
      const db = getDb();
      
      // First get all accounts for the user
      db.all('SELECT account_number FROM accounts WHERE user_id = ?', [userId], (err, accounts) => {
        if (err) {
          return reject(err);
        }
        
        if (!accounts || accounts.length === 0) {
          return resolve([]);
        }
        
        // Extract account numbers
        const accountNumbers = accounts.map(acc => acc.account_number);
        
        // Create placeholders for SQL query
        const placeholders = accountNumbers.map(() => '?').join(',');
        
        // Get all transactions for these accounts
        const query = `
          SELECT t.* FROM transactions t
          WHERE t.from_account IN (${placeholders})
          OR t.to_account IN (${placeholders})
          ORDER BY t.created_at DESC
        `;
        
        // Combine the parameters array (account numbers twice)
        const params = [...accountNumbers, ...accountNumbers];
        
        db.all(query, params, (err, transactions) => {
          if (err) {
            return reject(err);
          }
          resolve(transactions);
        });
      });
    });
  }
}

module.exports = Transaction;