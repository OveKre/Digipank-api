const app = require('./app');
const dotenv = require('dotenv');
const { initDatabase } = require('./config/database');

// Load environment variables
dotenv.config();

// Initialize database
initDatabase();

const PORT = process.env.PORT || 3001;

// Start the server
app.listen(PORT, () => {
  console.log(`${process.env.BANK_NAME} server is running on port ${PORT}`);
  console.log(`API Documentation available at http://localhost:${PORT}/docs`);
});
