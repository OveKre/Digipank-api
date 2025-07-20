-- =============================================================================
-- DIGIPANK DATABASE MAINTENANCE AND DELETE OPERATIONS
-- =============================================================================
-- This file contains examples of DELETE operations and maintenance queries
-- for the Digipank database system

-- =============================================================================
-- 1. SESSION MANAGEMENT (Delete expired sessions)
-- =============================================================================

-- Delete all expired sessions
DELETE FROM sessions 
WHERE expires_at < NOW();

-- Delete sessions older than 30 days (regardless of expiry)
DELETE FROM sessions 
WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY);

-- Delete sessions for inactive users
DELETE s FROM sessions s
JOIN users u ON s.user_id = u.id
WHERE u.is_active = FALSE;

-- =============================================================================
-- 2. AUDIT LOG CLEANUP (Regulatory compliance - keep 7 years)
-- =============================================================================

-- Delete audit logs older than 7 years (regulatory requirement)
DELETE FROM audit_log 
WHERE created_at < DATE_SUB(NOW(), INTERVAL 7 YEAR);

-- Delete audit logs for specific action older than 1 year
DELETE FROM audit_log 
WHERE action = 'LOGIN' 
AND created_at < DATE_SUB(NOW(), INTERVAL 1 YEAR);

-- Count audit logs before cleanup (for reporting)
SELECT 
    COUNT(*) as total_logs,
    COUNT(CASE WHEN created_at < DATE_SUB(NOW(), INTERVAL 7 YEAR) THEN 1 END) as logs_to_delete
FROM audit_log;

-- =============================================================================
-- 3. USER ACCOUNT MANAGEMENT
-- =============================================================================

-- Soft delete inactive user (recommended approach)
UPDATE users 
SET is_active = FALSE, updated_at = NOW() 
WHERE id = ?;

-- Hard delete user and cascade (USE WITH EXTREME CAUTION!)
-- This will also delete related accounts, sessions, roles due to foreign keys
-- DELETE FROM users WHERE id = ? AND is_active = FALSE;

-- Delete users who never activated their account (older than 30 days)
DELETE FROM users 
WHERE is_active = FALSE 
AND created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)
AND id NOT IN (SELECT DISTINCT user_id FROM sessions);

-- =============================================================================
-- 4. ACCOUNT MANAGEMENT
-- =============================================================================

-- Soft delete account (recommended for banking)
UPDATE accounts 
SET is_active = FALSE, updated_at = NOW() 
WHERE id = ? AND balance = 0.00;

-- Close accounts with zero balance and no transactions in last 2 years
UPDATE accounts 
SET is_active = FALSE, updated_at = NOW() 
WHERE balance = 0.00 
AND account_number NOT IN (
    SELECT DISTINCT from_account FROM transactions 
    WHERE created_at > DATE_SUB(NOW(), INTERVAL 2 YEAR)
    UNION
    SELECT DISTINCT to_account FROM transactions 
    WHERE created_at > DATE_SUB(NOW(), INTERVAL 2 YEAR)
);

-- =============================================================================
-- 5. TRANSACTION MANAGEMENT
-- =============================================================================

-- Delete failed transactions older than 90 days
DELETE FROM transactions 
WHERE status = 'failed' 
AND created_at < DATE_SUB(NOW(), INTERVAL 90 DAY);

-- Delete cancelled transactions older than 1 year
DELETE FROM transactions 
WHERE status = 'cancelled' 
AND created_at < DATE_SUB(NOW(), INTERVAL 1 YEAR);

-- Clean up pending transactions older than 24 hours
-- (These should be automatically processed or cancelled)
UPDATE transactions 
SET status = 'failed', 
    status_details = 'Timeout - automatically failed by system'
WHERE status = 'pending' 
AND created_at < DATE_SUB(NOW(), INTERVAL 24 HOUR);

-- =============================================================================
-- 6. ROLE MANAGEMENT
-- =============================================================================

-- Remove expired user roles
DELETE FROM user_roles 
WHERE expires_at IS NOT NULL 
AND expires_at < NOW();

-- Remove inactive role assignments
DELETE FROM user_roles 
WHERE is_active = FALSE 
AND created_at < DATE_SUB(NOW(), INTERVAL 90 DAY);

-- Clean up orphaned role assignments (users no longer exist)
DELETE ur FROM user_roles ur
LEFT JOIN users u ON ur.user_id = u.id
WHERE u.id IS NULL;

-- =============================================================================
-- 7. MAINTENANCE PROCEDURES
-- =============================================================================

-- Procedure to clean up all expired/old data
DELIMITER //
CREATE PROCEDURE CleanupDatabase()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE cleanup_count INT DEFAULT 0;
    
    -- Start transaction for safety
    START TRANSACTION;
    
    -- Clean expired sessions
    DELETE FROM sessions WHERE expires_at < NOW();
    SET cleanup_count = cleanup_count + ROW_COUNT();
    
    -- Clean old audit logs (older than 7 years)
    DELETE FROM audit_log WHERE created_at < DATE_SUB(NOW(), INTERVAL 7 YEAR);
    SET cleanup_count = cleanup_count + ROW_COUNT();
    
    -- Clean failed transactions (older than 90 days)
    DELETE FROM transactions WHERE status = 'failed' AND created_at < DATE_SUB(NOW(), INTERVAL 90 DAY);
    SET cleanup_count = cleanup_count + ROW_COUNT();
    
    -- Clean expired role assignments
    DELETE FROM user_roles WHERE expires_at IS NOT NULL AND expires_at < NOW();
    SET cleanup_count = cleanup_count + ROW_COUNT();
    
    -- Commit changes
    COMMIT;
    
    -- Log cleanup
    INSERT INTO audit_log (action, resource_type, new_values, created_at)
    VALUES ('CLEANUP', 'DATABASE', JSON_OBJECT('records_cleaned', cleanup_count), NOW());
    
    SELECT CONCAT('Cleanup completed. Records removed: ', cleanup_count) as result;
END //
DELIMITER ;

-- =============================================================================
-- 8. SAFE DELETE EXAMPLES WITH VALIDATION
-- =============================================================================

-- Safe user deletion with checks
DELIMITER //
CREATE PROCEDURE SafeDeleteUser(IN user_id INT)
BEGIN
    DECLARE user_exists INT DEFAULT 0;
    DECLARE active_accounts INT DEFAULT 0;
    DECLARE account_balances DECIMAL(15,2) DEFAULT 0;
    
    -- Check if user exists
    SELECT COUNT(*) INTO user_exists FROM users WHERE id = user_id;
    
    IF user_exists = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'User not found';
    END IF;
    
    -- Check for active accounts
    SELECT COUNT(*) INTO active_accounts 
    FROM accounts 
    WHERE user_id = user_id AND is_active = TRUE;
    
    -- Check total balance across all accounts
    SELECT COALESCE(SUM(balance), 0) INTO account_balances
    FROM accounts 
    WHERE user_id = user_id;
    
    IF account_balances > 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot delete user with non-zero account balances';
    END IF;
    
    IF active_accounts > 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot delete user with active accounts. Close accounts first.';
    END IF;
    
    -- Proceed with soft delete
    START TRANSACTION;
    
    UPDATE users SET is_active = FALSE WHERE id = user_id;
    
    -- Log the action
    INSERT INTO audit_log (user_id, action, resource_type, resource_id, created_at)
    VALUES (user_id, 'USER_DEACTIVATED', 'USER', user_id, NOW());
    
    COMMIT;
    
    SELECT 'User successfully deactivated' as result;
END //
DELIMITER ;

-- =============================================================================
-- 9. REPORTING QUERIES (What would be deleted)
-- =============================================================================

-- Show what would be deleted before actual deletion
-- Expired sessions report
SELECT 
    COUNT(*) as expired_sessions,
    MIN(created_at) as oldest_session,
    MAX(expires_at) as latest_expiry
FROM sessions 
WHERE expires_at < NOW();

-- Old audit logs report
SELECT 
    COUNT(*) as old_logs,
    MIN(created_at) as oldest_log,
    action,
    COUNT(*) as count_by_action
FROM audit_log 
WHERE created_at < DATE_SUB(NOW(), INTERVAL 7 YEAR)
GROUP BY action;

-- Failed transactions report
SELECT 
    COUNT(*) as failed_transactions,
    SUM(amount) as total_failed_amount,
    currency,
    COUNT(*) as count_by_currency
FROM transactions 
WHERE status = 'failed' 
AND created_at < DATE_SUB(NOW(), INTERVAL 90 DAY)
GROUP BY currency;

-- =============================================================================
-- 10. EMERGENCY PROCEDURES
-- =============================================================================

-- Emergency: Disable all sessions (force re-login)
UPDATE sessions SET expires_at = NOW() WHERE is_active = TRUE;

-- Emergency: Disable user account
UPDATE users SET is_active = FALSE WHERE username = 'suspicious_user';

-- Emergency: Block all transactions (maintenance mode)
-- (This would require application-level logic)

-- =============================================================================
-- NOTES AND BEST PRACTICES:
-- =============================================================================
-- 1. Always backup before running DELETE operations
-- 2. Use transactions for multiple related operations
-- 3. Test DELETE operations on development environment first
-- 4. Prefer soft deletes (is_active = FALSE) over hard deletes
-- 5. Log all deletion operations in audit_log
-- 6. Consider data retention policies and legal requirements
-- 7. Use stored procedures for complex cleanup operations
-- 8. Schedule regular maintenance using cron jobs
-- 9. Monitor deletion operations for performance impact
-- 10. Keep deletion scripts in version control
