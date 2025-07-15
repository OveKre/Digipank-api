const jwt = require('jsonwebtoken');
const fs = require('fs');
const crypto = require('crypto');
const https = require('https');

// Configuration (reading from same paths as your server)
const config = {
  bankPrefix: '05b',
  privateKeyPath: './keys/private.pem',
  publicKeyPath: './keys/public.pem'
};

function generateId() {
  return crypto.randomBytes(16).toString('hex');
}

function generateJWTPayload() {
  const transactionId = generateId();
  const accountFrom = '05b2853511278'; // Your real Digipank account
  const accountTo = '97f41936fd8426d9fabec77ccd1e057c42a'; // Real Henno bank account
  const amountInEuros = 50; // Amount in euros (50 EUR)
  
  const payload = {
    iss: config.bankPrefix.toUpperCase(),
    aud: "CENTRAL_BANK",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
    jti: generateId(),
    transactionId: transactionId,
    accountFrom: accountFrom,
    accountTo: accountTo,
    currency: 'EUR',
    amount: amountInEuros,
    explanation: 'ülekanne',
    senderName: 'Digipanga klient'
  };

  return payload;
}

function generateSignedJWT(payload) {
  try {
    if (!fs.existsSync(config.privateKeyPath)) {
      console.error('❌ Private key file not found at:', config.privateKeyPath);
      return null;
    }

    const privateKey = fs.readFileSync(config.privateKeyPath, 'utf8');
    const publicKey = crypto.createPublicKey(privateKey);
    const jwk = publicKey.export({ format: 'jwk' });
    const keyBuffer = Buffer.from(JSON.stringify({n: jwk.n, e: jwk.e}));
    const kid = crypto.createHash('sha256').update(keyBuffer).digest('base64url').substring(0, 32);

    console.log(`✅ Generated kid: ${kid}`);

    const token = jwt.sign(payload, privateKey, {
      algorithm: 'RS256',
      keyid: kid
    });

    return token;
  } catch (error) {
    console.error('❌ Failed to generate signed JWT:', error);
    return null;
  }
}

async function testJWTToHenno(jwtToken) {
  return new Promise((resolve) => {
    const postData = JSON.stringify({ jwt: jwtToken });
    
    const options = {
      hostname: 'henno.cfd',
      path: '/henno-pank/transactions/b2b',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': 'Digipank/1.0'
      }
    };

    console.log('🚀 Sending request to Henno bank...');
    
    const req = https.request(options, (res) => {
      console.log(`📥 Response status: ${res.statusCode}`);
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        console.log(`📋 Response: ${responseData}`);
        
        if (res.statusCode >= 200 && res.statusCode <= 299) {
          console.log('✅ SUCCESS: Transaction sent to Henno bank!');
          resolve(true);
        } else {
          console.log('❌ FAILED: Henno bank rejected the transaction');
          resolve(false);
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ HTTP request error:', error);
      resolve(false);
    });

    req.setTimeout(10000, () => {
      console.error('❌ Request timeout');
      req.destroy();
      resolve(false);
    });

    req.write(postData);
    req.end();
  });
}

// Main test function
async function runTest() {
  console.log('=== DIGIPANK JWT TEST (SERVER) ===\n');
  
  // Check if keys exist
  if (!fs.existsSync(config.privateKeyPath)) {
    console.error('❌ Private key not found at:', config.privateKeyPath);
    return;
  }
  
  if (!fs.existsSync(config.publicKeyPath)) {
    console.error('❌ Public key not found at:', config.publicKeyPath);
    return;
  }
  
  console.log('✅ Keys found');
  
  // Generate payload
  const payload = generateJWTPayload();
  console.log('✅ Payload generated');
  console.log(JSON.stringify(payload, null, 2));
  
  // Generate JWT
  const signedJWT = generateSignedJWT(payload);
  if (!signedJWT) {
    console.error('❌ Failed to generate JWT');
    return;
  }
  
  console.log('\n✅ JWT generated successfully');
  console.log('JWT length:', signedJWT.length);
  
  // Test with Henno bank
  console.log('\n🧪 Testing with Henno bank...');
  const success = await testJWTToHenno(signedJWT);
  
  if (success) {
    console.log('\n🎉 TEST PASSED: Your JWT works with Henno bank!');
  } else {
    console.log('\n💥 TEST FAILED: JWT was rejected by Henno bank');
  }
  
  console.log('\n=== TEST COMPLETE ===');
}

// Run the test
runTest().catch(console.error);
