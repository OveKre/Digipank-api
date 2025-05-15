const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const jose = require('node-jose');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

// Path to the private key
const PRIVATE_KEY_PATH = path.join(__dirname, '../keys/private.pem');
// Path to the public key
const PUBLIC_KEY_PATH = path.join(__dirname, '../keys/public.pem');
// Path to JWKS directory
const JWKS_DIR = path.join(__dirname, '../public/jwks');

// Ensure keys directory exists
const keysDir = path.dirname(PRIVATE_KEY_PATH);
if (!fs.existsSync(keysDir)) {
  fs.mkdirSync(keysDir, { recursive: true });
}

// Ensure JWKS directory exists
if (!fs.existsSync(JWKS_DIR)) {
  fs.mkdirSync(JWKS_DIR, { recursive: true });
}

// Generate RSA key pair if not exists
const generateKeys = async () => {
  try {
    if (!fs.existsSync(PRIVATE_KEY_PATH) || !fs.existsSync(PUBLIC_KEY_PATH)) {
      console.log('Generating new RS256 key pair...');
      
      // Generate a new RSA key pair using node-jose
      const keystore = jose.JWK.createKeyStore();
      const key = await keystore.generate('RSA', 2048, { alg: 'RS256', use: 'sig' });
      
      // Export the private key
      const privateKey = key.toPEM(true);
      fs.writeFileSync(PRIVATE_KEY_PATH, privateKey);
      
      // Export the public key
      const publicKey = key.toPEM(false);
      fs.writeFileSync(PUBLIC_KEY_PATH, publicKey);
      
      // Export the public key in JWKS format
      const jwks = keystore.toJSON();
      const jwksPublicPath = path.join(JWKS_DIR, 'jwks.json');
      fs.writeFileSync(jwksPublicPath, JSON.stringify(jwks, null, 2));
      
      console.log('RS256 key pair generated successfully');
    }
  } catch (error) {
    console.error('Error generating keys:', error);
    throw error;
  }
};

// Load keys
const loadPrivateKey = () => {
  try {
    if (!fs.existsSync(PRIVATE_KEY_PATH)) {
      throw new Error('Private key not found. Please generate keys first.');
    }
    return fs.readFileSync(PRIVATE_KEY_PATH, 'utf8');
  } catch (error) {
    console.error('Error loading private key:', error);
    throw error;
  }
};

const loadPublicKey = () => {
  try {
    if (!fs.existsSync(PUBLIC_KEY_PATH)) {
      throw new Error('Public key not found. Please generate keys first.');
    }
    return fs.readFileSync(PUBLIC_KEY_PATH, 'utf8');
  } catch (error) {
    console.error('Error loading public key:', error);
    throw error;
  }
};

// Generate JWT token for user authentication
const generateAuthToken = (userId) => {
  const privateKey = loadPrivateKey();
  const payload = {
    sub: userId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
    jti: uuidv4()
  };
  
  return jwt.sign(payload, privateKey, { algorithm: 'RS256' });
};

// Verify JWT token for user authentication
const verifyAuthToken = (token) => {
  try {
    const publicKey = loadPublicKey();
    return jwt.verify(token, publicKey, { algorithms: ['RS256'] });
  } catch (error) {
    throw new Error('Invalid token');
  }
};

// Sign transaction data with private key
const signTransaction = (transactionData) => {
  const privateKey = loadPrivateKey();
  return jwt.sign(transactionData, privateKey, { algorithm: 'RS256' });
};

// Verify transaction signature from another bank
const verifyTransactionSignature = async (token, bankPrefix) => {
  try {
    // Get the central bank URL from env
    const centralBankUrl = process.env.CENTRAL_BANK_URL;
    
    // Get the bank's public key from central bank
    const response = await axios.get(`${centralBankUrl}/banks/${bankPrefix}`);
    const bankInfo = response.data;
    
    if (!bankInfo || !bankInfo.jwksUrl) {
      throw new Error(`Bank with prefix ${bankPrefix} not found or missing JWKS URL`);
    }
    
    // Get the bank's JWKS
    const jwksResponse = await axios.get(bankInfo.jwksUrl);
    const jwks = jwksResponse.data;
    
    // Create a keystore from JWKS
    const keystore = await jose.JWK.asKeyStore(jwks);

    // Find the key with "use": "sig"
    const signingKey = keystore.all().find(key => key.use === 'sig');
    
    if (!signingKey) {
      throw new Error('No signing key found in JWKS');
    }
    
    // Get public key in PEM format
    const publicKey = signingKey.toPEM(false);
    
    // Verify the signature
    return jwt.verify(token, publicKey, { algorithms: ['RS256'] });
  } catch (error) {
    console.error('Error verifying transaction signature:', error);
    throw new Error('Invalid transaction signature');
  }
};

// Get JWKS for the bank
const getJwks = async () => {
  try {
    const jwksPath = path.join(JWKS_DIR, 'jwks.json');
    if (!fs.existsSync(jwksPath)) {
      await generateKeys();
    }
    
    return JSON.parse(fs.readFileSync(jwksPath, 'utf8'));
  } catch (error) {
    console.error('Error getting JWKS:', error);
    throw error;
  }
};

module.exports = {
  generateKeys,
  loadPrivateKey,
  loadPublicKey,
  generateAuthToken,
  verifyAuthToken,
  signTransaction,
  verifyTransactionSignature,
  getJwks
};