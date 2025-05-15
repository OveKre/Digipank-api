const { verifyAuthToken } = require('../config/jwt');
const { getDb } = require('../config/database');

/**
 * Authentication middleware
 * Validates JWT token and sets user info to req.user
 */
const authenticate = (req, res, next) => {
  try {
    // Get the token from the Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication token required' });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify the token
    const decoded = verifyAuthToken(token);
    
    // Check if token exists in the sessions table
    const db = getDb();
    db.get('SELECT * FROM sessions WHERE token = ? AND expires_at > datetime("now")', [token], (err, session) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
      
      if (!session) {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }
      
      // Get user info
      db.get('SELECT id, username, email, full_name FROM users WHERE id = ?', [session.user_id], (err, user) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Internal server error' });
        }
        
        if (!user) {
          return res.status(401).json({ error: 'User not found' });
        }
        
        // Set user info to req.user
        req.user = user;
        req.token = token;
        next();
      });
    });
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = authenticate;