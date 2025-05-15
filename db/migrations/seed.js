const bcrypt = require('bcrypt');
const { getDb, closeDb } = require('../../config/database');
const { generateAccountNumber } = require('../../utils/helpers');

/**
 * Seed the database with initial data
 */
const seedDatabase = async () => {
  try {
    console.log('Seeding database...');
    
    const db = getDb();
    
    // Start a transaction
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      
      // Create test user
      const username = 'testuser';
      const password = 'Test1234';
      const email = 'test@example.com';
      const fullName = 'Test User';
      
      // Hash the password
      bcrypt.hash(password, 10, (err, hashedPassword) => {
        if (err) {
          console.error('Error hashing password:', err);
          db.run('ROLLBACK');
          return;
        }
        
        // Insert the user
        db.run(
          'INSERT OR IGNORE INTO users (username, password, email, full_name) VALUES (?, ?, ?, ?)',
          [username, hashedPassword, email, fullName],
          function(err) {
            if (err) {
              console.error('Error creating test user:', err);
              db.run('ROLLBACK');
              return;
            }
            
            const userId = this.lastID;
            
            // Create test accounts
            const currencies = ['EUR', 'USD', 'GBP'];
            
            for (const currency of currencies) {
              const accountNumber = generateAccountNumber(currency);
              
              db.run(
                'INSERT OR IGNORE INTO accounts (account_number, user_id, balance, currency) VALUES (?, ?, ?, ?)',
                [accountNumber, userId, 1000, currency],
                function(err) {
                  if (err) {
                    console.error(`Error creating ${currency} account:`, err);
                    db.run('ROLLBACK');
                    return;
                  }
                }
              );
            }
            
            // Commit the transaction
            db.run('COMMIT', (err) => {
              if (err) {
                console.error('Error committing transaction:', err);
                db.run('ROLLBACK');
                return;
              }
              
              console.log('Database seeded successfully');
              console.log('Test user credentials:');
              console.log(`Username: ${username}`);
              console.log(`Password: ${password}`);
              
              // Close the database connection
              closeDb();
            });
          }
        );
      });
    });
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

// Run the seeder
seedDatabase();