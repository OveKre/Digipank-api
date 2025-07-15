const jwt = require('jsonwebtoken');
const fs = require('fs');
const crypto = require('crypto');

// Configuration (same as your system)
const config = {
  bankPrefix: '05b',
  privateKeyPath: './keys/private.pem'
};

function generateId() {
  return crypto.randomBytes(16).toString('hex');
}

function generateJWTPayload() {
  // Test transaction data (similar to what your system would send)
  const transactionId = generateId();
  const accountFrom = '05b1234567890123'; // Your bank account
  const accountTo = '97f1234567890'; // Henno bank account
  const amountInEuros = 10.50; // Amount in euros (as expected by partner banks)
  
  const payload = {
    iss: config.bankPrefix.toUpperCase(), // Issuer - your bank prefix
    aud: "CENTRAL_BANK", // Audience - always central bank
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour expiry
    jti: generateId(), // Unique token ID
    transactionId: transactionId,
    accountFrom: accountFrom,
    accountTo: accountTo,
    currency: 'EUR',
    amount: amountInEuros, // Amount in euros for B2B communication
    explanation: 'Test payment from Digipank',
    senderName: 'Digipanga klient'
  };

  return payload;
}

function generateSignedJWT(payload) {
  try {
    // Check if private key exists
    if (!fs.existsSync(config.privateKeyPath)) {
      console.error('Private key file not found at:', config.privateKeyPath);
      return null;
    }

    // Read private key
    const privateKey = fs.readFileSync(config.privateKeyPath, 'utf8');

    // Generate same kid as JWKS endpoint does
    const publicKey = crypto.createPublicKey(privateKey);
    const jwk = publicKey.export({ format: 'jwk' });
    const keyBuffer = Buffer.from(JSON.stringify({n: jwk.n, e: jwk.e}));
    const kid = crypto.createHash('sha256').update(keyBuffer).digest('base64url').substring(0, 32);

    console.log(`Generated kid for JWT: ${kid}`);

    // Sign JWT with RS256
    const token = jwt.sign(payload, privateKey, {
      algorithm: 'RS256',
      keyid: kid  // Use same kid as JWKS endpoint
    });

    return token;
  } catch (error) {
    console.error('Failed to generate signed JWT:', error);
    return null;
  }
}

// Generate test payload
console.log('=== DIGIPANK JWT TEST PAYLOAD ===\n');

const payload = generateJWTPayload();
console.log('1. JWT Payload (JSON):');
console.log(JSON.stringify(payload, null, 2));

console.log('\n2. JWT Payload (for manual testing):');
console.log('Copy this payload to test in Henno pank:');
console.log('---');
console.log(JSON.stringify(payload));
console.log('---');

// Generate signed JWT
const signedJWT = generateSignedJWT(payload);
if (signedJWT) {
  console.log('\n3. Signed JWT Token:');
  console.log(signedJWT);
  
  console.log('\n4. JWT Header (decoded):');
  const header = jwt.decode(signedJWT, { complete: true }).header;
  console.log(JSON.stringify(header, null, 2));
  
  console.log('\n5. JWT Payload (decoded):');
  const decodedPayload = jwt.decode(signedJWT, { complete: true }).payload;
  console.log(JSON.stringify(decodedPayload, null, 2));
  
  console.log('\n6. For testing in Henno bank, use this full JWT:');
  console.log('POST to: https://henno.cfd/henno-pank/transactions/b2b');
  console.log('Content-Type: application/json');
  console.log('Body:');
  console.log(JSON.stringify({ jwt: signedJWT }, null, 2));
} else {
  console.log('\n❌ Failed to generate signed JWT token');
}

console.log('\n=== SUMMARY ===');
console.log(`Transaction ID: ${payload.transactionId}`);
console.log(`From Account: ${payload.accountFrom} (Digipank)`);
console.log(`To Account: ${payload.accountTo} (Henno bank)`);
console.log(`Amount: €${payload.amount}`);
console.log(`Currency: ${payload.currency}`);
console.log(`Explanation: ${payload.explanation}`);
console.log(`Sender: ${payload.senderName}`);
