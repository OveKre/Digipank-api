const jwt = require('jsonwebtoken');
const fs = require('fs');

// Testimiseks - päris elus kasutaks teine pank oma privaatvõtit
const testPrivateKey = `-----BEGIN PRIVATE 

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
