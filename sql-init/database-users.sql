-- =============================================================================
-- DIGIPANK DATABASE USERS AND PERMISSIONS SETUP
-- =============================================================================
-- This script creates database users with appropriate permissions
-- Run this script as root user after database setup

-- =============================================================================
-- 1. ADMIN USER (Full privileges)
-- =============================================================================
CREATE USER IF NOT EXISTS 'digipank_admin'@'%' IDENTIFIED BY 'admin_secure_password_123!';
GRANT ALL PRIVILEGES ON digipank.* TO 'digipank_admin'@'%';
GRANT GRANT OPTION ON digipank.* TO 'digipank_admin'@'%';

-- Admin can manage users
GRANT CREATE USER ON *.* TO 'digipank_admin'@'%';
GRANT RELOAD ON *.* TO 'digipank_admin'@'%';

-- =============================================================================
-- 2. APPLICATION USER (CRUD operations)
-- =============================================================================
CREATE USER IF NOT EXISTS 'digipank_app'@'%' IDENTIFIED BY 'app_secure_password_456!';

-- Full CRUD on main tables
GRANT SELECT, INSERT, UPDATE, DELETE ON digipank.users TO 'digipank_app'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON digipank.accounts TO 'digipank_app'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON digipank.transactions TO 'digipank_app'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON digipank.sessions TO 'digipank_app'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON digipank.roles TO 'digipank_app'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON digipank.user_roles TO 'digipank_app'@'%';

-- Full access to audit log (insert and read)
GRANT SELECT, INSERT ON digipank.audit_log TO 'digipank_app'@'%';

-- Access to views
GRANT SELECT ON digipank.users_with_roles TO 'digipank_app'@'%';
GRANT SELECT ON digipank.account_summary TO 'digipank_app'@'%';

-- =============================================================================
-- 3. REPORTING USER (Read-only for reports)
-- =============================================================================
CREATE USER IF NOT EXISTS 'digipank_reporter'@'%' IDENTIFIED BY 'report_secure_password_789!';

-- Read-only access to all tables
GRANT SELECT ON mydb.users TO 'digipank_reporter'@'%';
GRANT SELECT ON mydb.accounts TO 'digipank_reporter'@'%';
GRANT SELECT ON mydb.transactions TO 'digipank_reporter'@'%';
GRANT SELECT ON mydb.audit_log TO 'digipank_reporter'@'%';
GRANT SELECT ON mydb.roles TO 'digipank_reporter'@'%';
GRANT SELECT ON mydb.user_roles TO 'digipank_reporter'@'%';

-- Access to views for reporting
GRANT SELECT ON mydb.users_with_roles TO 'digipank_reporter'@'%';
GRANT SELECT ON mydb.account_summary TO 'digipank_reporter'@'%';

-- =============================================================================
-- 4. AUDITOR USER (Read-only for compliance)
-- =============================================================================
CREATE USER IF NOT EXISTS 'digipank_auditor'@'%' IDENTIFIED BY 'audit_secure_password_101!';

-- Limited read access for auditing
GRANT SELECT ON mydb.audit_log TO 'digipank_auditor'@'%';
GRANT SELECT ON mydb.transactions TO 'digipank_auditor'@'%';
GRANT SELECT ON mydb.users TO 'digipank_auditor'@'%';
GRANT SELECT ON mydb.accounts TO 'digipank_auditor'@'%';

-- No access to sessions or roles for security

-- =============================================================================
-- 5. BACKUP USER (For automated backups)
-- =============================================================================
CREATE USER IF NOT EXISTS 'digipank_backup'@'localhost' IDENTIFIED BY 'backup_secure_password_202!';

-- Read access for backup operations
GRANT SELECT, LOCK TABLES ON mydb.* TO 'digipank_backup'@'localhost';
GRANT SHOW VIEW ON mydb.* TO 'digipank_backup'@'localhost';
GRANT TRIGGER ON mydb.* TO 'digipank_backup'@'localhost';

-- =============================================================================
-- 6. MAINTENANCE USER (For cleanup operations)
-- =============================================================================
CREATE USER IF NOT EXISTS 'digipank_maintenance'@'localhost' IDENTIFIED BY 'maintenance_secure_password_303!';

-- Can delete expired sessions and old audit logs
GRANT SELECT, DELETE ON mydb.sessions TO 'digipank_maintenance'@'localhost';
GRANT SELECT, DELETE ON mydb.audit_log TO 'digipank_maintenance'@'localhost';

-- Can update account statuses
GRANT SELECT, UPDATE ON mydb.accounts TO 'digipank_maintenance'@'localhost';
GRANT SELECT, UPDATE ON mydb.users TO 'digipank_maintenance'@'localhost';

-- =============================================================================
-- REFRESH PRIVILEGES
-- =============================================================================
FLUSH PRIVILEGES;

-- =============================================================================
-- SHOW CREATED USERS (for verification)
-- =============================================================================
SELECT 
    User as 'Username',
    Host as 'Host',
    account_locked as 'Locked',
    password_expired as 'Password_Expired'
FROM mysql.user 
WHERE User LIKE 'digipank_%'
ORDER BY User;

-- =============================================================================
-- SHOW USER PRIVILEGES (for verification)
-- =============================================================================
-- Run these commands to verify permissions:
-- SHOW GRANTS FOR 'digipank_admin'@'%';
-- SHOW GRANTS FOR 'digipank_app'@'%';
-- SHOW GRANTS FOR 'digipank_reporter'@'%';
-- SHOW GRANTS FOR 'digipank_auditor'@'%';
-- SHOW GRANTS FOR 'digipank_backup'@'localhost';
-- SHOW GRANTS FOR 'digipank_maintenance'@'localhost';

-- =============================================================================
-- NOTES:
-- =============================================================================
-- 1. Change passwords before production use!
-- 2. Use environment variables for passwords in production
-- 3. Consider using SSL connections for remote users
-- 4. Regularly rotate passwords
-- 5. Monitor user activity through audit logs
