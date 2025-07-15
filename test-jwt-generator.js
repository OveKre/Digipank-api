const jwt = require('jsonwebtoken');
const fs = require('fs');

// Testimiseks - päris elus kasutaks teine pank oma privaatvõtit
const testPrivateKey = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7VJTUt9Us8cKB
VJbfHgvRDQwJGnGW1UvE3pS8PGj3nkGvv1sOJzZz4OdGfuG1GdJgNbJgJi5x
XYV2jlGkJQUzjOmXc4NcNnXmD0KqC6QbRKgdO2YGONHPdK7M8N0jS8M6P7jq
2JfgvLsD7TgGJJZJ7gXpRnJhG3r4HG5LxG8vP1DfKnG9O4W5JtKyQ6L3KQxH
KyOzGnN7cV6kR5R6O3S4Q2YR1R1JKNkNJmS2FyDtGxuOqKjNjG8iP6hD7VoQ
CpqjVJkX8Y7oRgY4H5p3nCj2pLBPRY9LK3gG7zJ5X3lQ2KjH9vPQ5K3tL1R
qJnO7pQ3J8V2W9iKzR7S6M5L3YrAgMBAAECggEAJcqrOm1JQQgLhJmK2F5K
AgMBAAECggEAJcqrOm1JQQgLhJmK2F5K
-----END PRIVATE KEY-----`;

function generateTestJWT() {
    const payload = {
        accountFrom: "12345678901234567890", // Henno panga konto näide
        accountTo: "05b1234567890123456789",  // Teie Digipanga konto
        amount: 50000, // 500 eurot sentides
        currency: "EUR",
        explanation: "Test ülekanne B2B endpointi",
        senderName: "Test Saatja",
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600 // 1 tund kehtib
    };

    // Päris elus kasutaks teine pank oma privaatvõtit
    const token = jwt.sign(payload, 'test-secret-key');
    
    console.log('=== TEST JWT ===');
    console.log(token);
    console.log('\n=== PAYLOAD ===');
    console.log(JSON.stringify(payload, null, 2));
    
    console.log('\n=== CURL NÄIDE ===');
    console.log(`curl -X POST http://localhost:3001/transactions/b2b \\
  -H "Content-Type: application/json" \\
  -d '{"jwt": "${token}"}'`);
    
    return token;
}

if (require.main === module) {
    generateTestJWT();
}

module.exports = { generateTestJWT };
