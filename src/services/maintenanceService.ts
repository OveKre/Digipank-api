import { DatabaseManager } from '../database/databaseManager';
import { Logger } from '../utils/logger';

/**
 * Database Maintenance Service
 * Handles cleanup operations and DELETE examples
 */
export class MaintenanceService {
  private logger = new Logger();

  constructor() {}

  /**
   * Clean expired sessions
   */
  async cleanExpiredSessions(): Promise<number> {
    try {
      const databaseManager = DatabaseManager.getInstance();
      const db = databaseManager.getDatabase();

      const result = await db.query(
        'DELETE FROM sessions WHERE expires_at < NOW()'
      );

      const deletedCount = result.affectedRows || 0;
      this.logger.info(`Cleaned ${deletedCount} expired sessions`);
      
      return deletedCount;
    } catch (error) {
      this.logger.error('Error cleaning expired sessions:', error);
      throw error;
    }
  }

  /**
   * Clean old audit logs (older than specified days)
   */
  async cleanOldAuditLogs(daysToKeep: number = 2555): Promise<number> { // ~7 years default
    try {
      const databaseManager = DatabaseManager.getInstance();
      const db = databaseManager.getDatabase();

      const result = await db.query(
        'DELETE FROM audit_log WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)',
        [daysToKeep]
      );

      const deletedCount = result.affectedRows || 0;
      this.logger.info(`Cleaned ${deletedCount} old audit logs (older than ${daysToKeep} days)`);
      
      return deletedCount;
    } catch (error) {
      this.logger.error('Error cleaning old audit logs:', error);
      throw error;
    }
  }

  /**
   * Clean failed transactions older than specified days
   */
  async cleanFailedTransactions(daysToKeep: number = 90): Promise<number> {
    try {
      const databaseManager = DatabaseManager.getInstance();
      const db = databaseManager.getDatabase();

      const result = await db.query(
        'DELETE FROM transactions WHERE status = ? AND created_at < DATE_SUB(NOW(), INTERVAL ? DAY)',
        ['failed', daysToKeep]
      );

      const deletedCount = result.affectedRows || 0;
      this.logger.info(`Cleaned ${deletedCount} failed transactions (older than ${daysToKeep} days)`);
      
      return deletedCount;
    } catch (error) {
      this.logger.error('Error cleaning failed transactions:', error);
      throw error;
    }
  }

  /**
   * Clean expired role assignments
   */
  async cleanExpiredRoles(): Promise<number> {
    try {
      const databaseManager = DatabaseManager.getInstance();
      const db = databaseManager.getDatabase();

      const result = await db.query(
        'DELETE FROM user_roles WHERE expires_at IS NOT NULL AND expires_at < NOW()'
      );

      const deletedCount = result.affectedRows || 0;
      this.logger.info(`Cleaned ${deletedCount} expired role assignments`);
      
      return deletedCount;
    } catch (error) {
      this.logger.error('Error cleaning expired roles:', error);
      throw error;
    }
  }

  /**
   * Deactivate user account (soft delete)
   */
  async deactivateUser(userId: number, reason?: string): Promise<boolean> {
    try {
      const databaseManager = DatabaseManager.getInstance();
      const db = databaseManager.getDatabase();

      // Check if user exists and is active
      const users = await db.query(
        'SELECT id, username FROM users WHERE id = ? AND is_active = TRUE',
        [userId]
      );

      if (!users || users.length === 0) {
        throw new Error(`User ${userId} not found or already inactive`);
      }

      const user = users[0];

      // Check for account balances
      const balances = await db.query(
        'SELECT SUM(balance) as total_balance FROM accounts WHERE user_id = ? AND is_active = TRUE',
        [userId]
      );

      const totalBalance = balances[0]?.total_balance || 0;
      if (totalBalance > 0) {
        throw new Error(`Cannot deactivate user ${userId}: non-zero account balance (${totalBalance})`);
      }

      // Deactivate user
      await db.query(
        'UPDATE users SET is_active = FALSE, updated_at = NOW() WHERE id = ?',
        [userId]
      );

      // Log the action
      await db.query(
        `INSERT INTO audit_log (user_id, action, resource_type, resource_id, new_values, created_at) 
         VALUES (?, 'USER_DEACTIVATED', 'USER', ?, ?, NOW())`,
        [userId, userId.toString(), JSON.stringify({ reason: reason || 'Manual deactivation' })]
      );

      this.logger.info(`User ${user.username} (ID: ${userId}) deactivated`);
      return true;
    } catch (error) {
      this.logger.error('Error deactivating user:', error);
      throw error;
    }
  }

  /**
   * Close account (soft delete)
   */
  async closeAccount(accountId: number, reason?: string): Promise<boolean> {
    try {
      const databaseManager = DatabaseManager.getInstance();
      const db = databaseManager.getDatabase();

      // Check account exists and has zero balance
      const accounts = await db.query(
        'SELECT id, account_number, balance, user_id FROM accounts WHERE id = ? AND is_active = TRUE',
        [accountId]
      );

      if (!accounts || accounts.length === 0) {
        throw new Error(`Account ${accountId} not found or already closed`);
      }

      const account = accounts[0];

      if (account.balance !== 0) {
        throw new Error(`Cannot close account ${account.account_number}: non-zero balance (${account.balance})`);
      }

      // Close account
      await db.query(
        'UPDATE accounts SET is_active = FALSE, updated_at = NOW() WHERE id = ?',
        [accountId]
      );

      // Log the action
      await db.query(
        `INSERT INTO audit_log (user_id, action, resource_type, resource_id, new_values, created_at) 
         VALUES (?, 'ACCOUNT_CLOSED', 'ACCOUNT', ?, ?, NOW())`,
        [account.user_id, accountId.toString(), JSON.stringify({ 
          account_number: account.account_number,
          reason: reason || 'Manual closure' 
        })]
      );

      this.logger.info(`Account ${account.account_number} (ID: ${accountId}) closed`);
      return true;
    } catch (error) {
      this.logger.error('Error closing account:', error);
      throw error;
    }
  }

  /**
   * Force expire all active sessions (emergency logout)
   */
  async forceLogoutAll(reason?: string): Promise<number> {
    try {
      const databaseManager = DatabaseManager.getInstance();
      const db = databaseManager.getDatabase();

      const result = await db.query(
        'UPDATE sessions SET expires_at = NOW(), is_active = FALSE WHERE is_active = TRUE'
      );

      const affectedCount = result.affectedRows || 0;

      // Log the action
      await db.query(
        `INSERT INTO audit_log (action, resource_type, new_values, created_at) 
         VALUES ('FORCE_LOGOUT_ALL', 'SESSIONS', ?, NOW())`,
        [JSON.stringify({ 
          sessions_expired: affectedCount,
          reason: reason || 'Emergency logout procedure' 
        })]
      );

      this.logger.warn(`Force logged out ${affectedCount} active sessions. Reason: ${reason}`);
      return affectedCount;
    } catch (error) {
      this.logger.error('Error forcing logout all sessions:', error);
      throw error;
    }
  }

  /**
   * Full maintenance cleanup
   */
  async runFullCleanup(): Promise<{
    expiredSessions: number;
    oldAuditLogs: number;
    failedTransactions: number;
    expiredRoles: number;
  }> {
    this.logger.info('Starting full database cleanup...');

    const results = {
      expiredSessions: await this.cleanExpiredSessions(),
      oldAuditLogs: await this.cleanOldAuditLogs(),
      failedTransactions: await this.cleanFailedTransactions(),
      expiredRoles: await this.cleanExpiredRoles()
    };

    // Log cleanup summary
    const databaseManager = DatabaseManager.getInstance();
    const db = databaseManager.getDatabase();
    
    await db.query(
      `INSERT INTO audit_log (action, resource_type, new_values, created_at) 
       VALUES ('FULL_CLEANUP', 'DATABASE', ?, NOW())`,
      [JSON.stringify(results)]
    );

    this.logger.info('Full database cleanup completed:', results);
    return results;
  }

  /**
   * Get cleanup statistics (what would be deleted)
   */
  async getCleanupStats(): Promise<{
    expiredSessions: number;
    oldAuditLogs: number;
    failedTransactions: number;
    expiredRoles: number;
  }> {
    try {
      const databaseManager = DatabaseManager.getInstance();
      const db = databaseManager.getDatabase();

      // Count expired sessions
      const expiredSessionsResult = await db.query(
        'SELECT COUNT(*) as count FROM sessions WHERE expires_at < NOW()'
      );

      // Count old audit logs (older than 7 years)
      const oldAuditLogsResult = await db.query(
        'SELECT COUNT(*) as count FROM audit_log WHERE created_at < DATE_SUB(NOW(), INTERVAL 2555 DAY)'
      );

      // Count failed transactions (older than 90 days)
      const failedTransactionsResult = await db.query(
        'SELECT COUNT(*) as count FROM transactions WHERE status = ? AND created_at < DATE_SUB(NOW(), INTERVAL 90 DAY)',
        ['failed']
      );

      // Count expired roles
      const expiredRolesResult = await db.query(
        'SELECT COUNT(*) as count FROM user_roles WHERE expires_at IS NOT NULL AND expires_at < NOW()'
      );

      return {
        expiredSessions: expiredSessionsResult[0]?.count || 0,
        oldAuditLogs: oldAuditLogsResult[0]?.count || 0,
        failedTransactions: failedTransactionsResult[0]?.count || 0,
        expiredRoles: expiredRolesResult[0]?.count || 0
      };
    } catch (error) {
      this.logger.error('Error getting cleanup stats:', error);
      throw error;
    }
  }
}
