const fs = require('fs');
const path = require('path');
const { getDb, closeDb } = require('../../config/database');

/**
 * Run database migrations
 */
const runMigrations = async () => {
  try {
    console.log('Running database migrations...');
    
    // Get migration files
    const migrationsDir = path.join(__dirname);
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Ensure migrations run in order
    
    if (migrationFiles.length === 0) {
      console.log('No migration files found');
      return;
    }
    
    const db = getDb();
    
    // Create migrations table first and return a promise
    await new Promise((resolve, reject) => {
      db.run(`
        CREATE TABLE IF NOT EXISTS migrations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
    
    // Get executed migrations
    const executedMigrations = await new Promise((resolve, reject) => {
      db.all('SELECT name FROM migrations', (err, rows) => {
        if (err) return reject(err);
        resolve(rows ? rows.map(row => row.name) : []);
      });
    });
    
    // Run pending migrations
    for (const file of migrationFiles) {
      if (executedMigrations.includes(file)) {
        console.log(`Migration ${file} already executed, skipping`);
        continue;
      }
      
      console.log(`Executing migration ${file}...`);
      
      const migrationPath = path.join(migrationsDir, file);
      const migrationSql = fs.readFileSync(migrationPath, 'utf8');
      
      // Run the migration in a transaction
      await new Promise((resolve, reject) => {
        db.serialize(() => {
          db.run('BEGIN TRANSACTION');
          
          // Split and execute each SQL statement
          for (const statement of migrationSql.split(';')) {
            const trimmedStatement = statement.trim();
            if (trimmedStatement) {
              db.run(trimmedStatement, (err) => {
                if (err) {
                  console.error(`Error executing statement: ${trimmedStatement}`);
                  console.error(err);
                  db.run('ROLLBACK');
                  return reject(err);
                }
              });
            }
          }
          
          // Record the migration
          db.run('INSERT INTO migrations (name) VALUES (?)', [file], (err) => {
            if (err) {
              console.error(`Error recording migration ${file}`);
              db.run('ROLLBACK');
              return reject(err);
            }
            
            db.run('COMMIT', (err) => {
              if (err) {
                console.error('Error committing transaction');
                db.run('ROLLBACK');
                return reject(err);
              }
              
              console.log(`Migration ${file} executed successfully`);
              resolve();
            });
          });
        });
      });
    }
    
    console.log('All migrations completed successfully');
  } catch (error) {
    console.error('Error running migrations:', error);
    process.exit(1);
  } finally {
    closeDb();
  }
};

// Run migrations
runMigrations();