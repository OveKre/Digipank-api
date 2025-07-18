const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path
const dbPath = path.join(__dirname, 'bank.db');

console.log('🔄 Starting migration from cents to euros...');
console.log(`📁 Database path: ${dbPath}`);

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Error opening database:', err.message);
        process.exit(1);
    }
    console.log('✅ Connected to SQLite database');
});

async function runMigration() {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            console.log('\n📊 Checking current data...');
            
            // Check current accounts
            db.all('SELECT number, balance FROM accounts LIMIT 5', (err, accounts) => {
                if (err) {
                    console.error('❌ Error reading accounts:', err);
                    reject(err);
                    return;
                }
                
                console.log('\n💰 Current account balances (in cents):');
                accounts.forEach(account => {
                    console.log(`   ${account.number}: ${account.balance} cents (${(account.balance / 100).toFixed(2)} EUR)`);
                });
            });
            
            // Check current transactions
            db.all('SELECT id, amount FROM transactions LIMIT 5', (err, transactions) => {
                if (err) {
                    console.error('❌ Error reading transactions:', err);
                    reject(err);
                    return;
                }
                
                console.log('\n💸 Current transaction amounts (in cents):');
                transactions.forEach(transaction => {
                    console.log(`   ${transaction.id}: ${transaction.amount} cents (${(transaction.amount / 100).toFixed(2)} EUR)`);
                });
                
                console.log('\n🔄 Starting migration...');
                
                // Begin transaction
                db.run('BEGIN TRANSACTION', (err) => {
                    if (err) {
                        console.error('❌ Error starting transaction:', err);
                        reject(err);
                        return;
                    }
                    
                    // Update accounts table structure and convert data
                    db.run(`
                        CREATE TABLE accounts_new (
                            id TEXT PRIMARY KEY,
                            user_id TEXT NOT NULL,
                            name TEXT NOT NULL,
                            number TEXT UNIQUE NOT NULL,
                            currency TEXT NOT NULL,
                            balance REAL DEFAULT 0.0,
                            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                            FOREIGN KEY (user_id) REFERENCES users(id)
                        )
                    `, (err) => {
                        if (err) {
                            console.error('❌ Error creating new accounts table:', err);
                            db.run('ROLLBACK');
                            reject(err);
                            return;
                        }
                        
                        // Copy data with conversion
                        db.run(`
                            INSERT INTO accounts_new (id, user_id, name, number, currency, balance, created_at)
                            SELECT id, user_id, name, number, currency, CAST(balance AS REAL) / 100.0, created_at
                            FROM accounts
                        `, (err) => {
                            if (err) {
                                console.error('❌ Error copying accounts data:', err);
                                db.run('ROLLBACK');
                                reject(err);
                                return;
                            }
                            
                            // Drop old table and rename new one
                            db.run('DROP TABLE accounts', (err) => {
                                if (err) {
                                    console.error('❌ Error dropping old accounts table:', err);
                                    db.run('ROLLBACK');
                                    reject(err);
                                    return;
                                }
                                
                                db.run('ALTER TABLE accounts_new RENAME TO accounts', (err) => {
                                    if (err) {
                                        console.error('❌ Error renaming accounts table:', err);
                                        db.run('ROLLBACK');
                                        reject(err);
                                        return;
                                    }
                                    
                                    console.log('✅ Accounts table migrated successfully');
                                    
                                    // Now migrate transactions table
                                    db.run(`
                                        CREATE TABLE transactions_new (
                                            id TEXT PRIMARY KEY,
                                            account_from TEXT NOT NULL,
                                            account_to TEXT NOT NULL,
                                            amount REAL NOT NULL,
                                            currency TEXT NOT NULL,
                                            explanation TEXT,
                                            sender_name TEXT,
                                            status TEXT NOT NULL DEFAULT 'completed',
                                            status_detail TEXT,
                                            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                                        )
                                    `, (err) => {
                                        if (err) {
                                            console.error('❌ Error creating new transactions table:', err);
                                            db.run('ROLLBACK');
                                            reject(err);
                                            return;
                                        }
                                        
                                        // Copy transactions data with conversion
                                        db.run(`
                                            INSERT INTO transactions_new (id, account_from, account_to, amount, currency, explanation, sender_name, status, status_detail, created_at)
                                            SELECT id, account_from, account_to, CAST(amount AS REAL) / 100.0, currency, explanation, sender_name, status, status_detail, created_at
                                            FROM transactions
                                        `, (err) => {
                                            if (err) {
                                                console.error('❌ Error copying transactions data:', err);
                                                db.run('ROLLBACK');
                                                reject(err);
                                                return;
                                            }
                                            
                                            // Drop old table and rename new one
                                            db.run('DROP TABLE transactions', (err) => {
                                                if (err) {
                                                    console.error('❌ Error dropping old transactions table:', err);
                                                    db.run('ROLLBACK');
                                                    reject(err);
                                                    return;
                                                }
                                                
                                                db.run('ALTER TABLE transactions_new RENAME TO transactions', (err) => {
                                                    if (err) {
                                                        console.error('❌ Error renaming transactions table:', err);
                                                        db.run('ROLLBACK');
                                                        reject(err);
                                                        return;
                                                    }
                                                    
                                                    console.log('✅ Transactions table migrated successfully');
                                                    
                                                    // Recreate indexes
                                                    db.run('CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id)', (err) => {
                                                        if (err) {
                                                            console.error('❌ Error creating accounts index:', err);
                                                            db.run('ROLLBACK');
                                                            reject(err);
                                                            return;
                                                        }
                                                        
                                                        db.run('CREATE INDEX IF NOT EXISTS idx_transactions_account_from ON transactions(account_from)', (err) => {
                                                            if (err) {
                                                                console.error('❌ Error creating transactions from index:', err);
                                                                db.run('ROLLBACK');
                                                                reject(err);
                                                                return;
                                                            }
                                                            
                                                            db.run('CREATE INDEX IF NOT EXISTS idx_transactions_account_to ON transactions(account_to)', (err) => {
                                                                if (err) {
                                                                    console.error('❌ Error creating transactions to index:', err);
                                                                    db.run('ROLLBACK');
                                                                    reject(err);
                                                                    return;
                                                                }
                                                                
                                                                // Commit transaction
                                                                db.run('COMMIT', (err) => {
                                                                    if (err) {
                                                                        console.error('❌ Error committing transaction:', err);
                                                                        reject(err);
                                                                        return;
                                                                    }
                                                                    
                                                                    console.log('✅ Migration completed successfully!');
                                                                    resolve();
                                                                });
                                                            });
                                                        });
                                                    });
                                                });
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
}

async function verifyMigration() {
    return new Promise((resolve, reject) => {
        console.log('\n🔍 Verifying migration results...');
        
        // Check accounts
        db.all('SELECT number, balance FROM accounts LIMIT 5', (err, accounts) => {
            if (err) {
                console.error('❌ Error verifying accounts:', err);
                reject(err);
                return;
            }
            
            console.log('\n💰 New account balances (in euros):');
            accounts.forEach(account => {
                console.log(`   ${account.number}: ${account.balance.toFixed(2)} EUR`);
            });
        });
        
        // Check transactions
        db.all('SELECT id, amount FROM transactions LIMIT 5', (err, transactions) => {
            if (err) {
                console.error('❌ Error verifying transactions:', err);
                reject(err);
                return;
            }
            
            console.log('\n💸 New transaction amounts (in euros):');
            transactions.forEach(transaction => {
                console.log(`   ${transaction.id}: ${transaction.amount.toFixed(2)} EUR`);
            });
            
            resolve();
        });
    });
}

// Run migration
runMigration()
    .then(() => verifyMigration())
    .then(() => {
        console.log('\n🎉 Migration completed successfully!');
        console.log('📝 Summary:');
        console.log('   - Account balances converted from cents to euros');
        console.log('   - Transaction amounts converted from cents to euros');
        console.log('   - Database schema updated to use REAL instead of INTEGER');
        console.log('   - All indexes recreated');
        
        db.close((err) => {
            if (err) {
                console.error('❌ Error closing database:', err);
            } else {
                console.log('✅ Database connection closed');
            }
            process.exit(0);
        });
    })
    .catch((error) => {
        console.error('❌ Migration failed:', error);
        db.close();
        process.exit(1);
    });
