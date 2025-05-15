const fs = require('fs');
const path = require('path');
const jose = require('node-jose');
const dotenv = require('dotenv');

dotenv.config();

// Paths for keys
const KEYS_DIR = path.join(__dirname, '../keys');
const PRIVATE_KEY_PATH = path.join(KEYS_DIR, 'private.pem');
const PUBLIC_KEY_PATH = path.join(KEYS_DIR, 'public.pem');
const JWKS_DIR = path.join(__dirname, '../public/jwks');
const JWKS_PATH = path.join(JWKS_DIR, 'jwks.json');

/**
 * Generate RSA key pair for JWT signing
 * Using RS256 algorithm (RSA + SHA256)
 */
const generateRsaKeyPair = async () => {
  try {
    // Create directories if they don't exist
    if (!fs.existsSync(KEYS_DIR)) {
      fs.mkdirSync(KEYS_DIR, { recursive: true });
    }
    
    if (!fs.existsSync(JWKS_DIR)) {
      fs.mkdirSync(JWKS_DIR, { recursive: true });
    }
    
    console.log('Generating RSA key pair (RS256)...');
    
    // Generate RSA key pair
    const keystore = jose.JWK.createKeyStore();
    const key = await keystore.generate('RSA', 2048, {
      alg: 'RS256',
      use: 'sig',
      kid: 'bank-signing-key-' + new Date().toISOString().split('T')[0]
    });
    
    // Export private key to PEM
    const privateKeyPem = key.toPEM(true);
    fs.writeFileSync(PRIVATE_KEY_PATH, privateKeyPem);
    console.log(`Private key saved to ${PRIVATE_KEY_PATH}`);
    
    // Export public key to PEM
    const publicKeyPem = key.toPEM();
    fs.writeFileSync(PUBLIC_KEY_PATH, publicKeyPem);
    console.log(`Public key saved to ${PUBLIC_KEY_PATH}`);
    
    // Export JWKS (JSON Web Key Set)
    const jwks = keystore.toJSON();
    fs.writeFileSync(JWKS_PATH, JSON.stringify(jwks, null, 2));
    console.log(`JWKS saved to ${JWKS_PATH}`);
    
    return {
      privateKey: privateKeyPem,
      publicKey: publicKeyPem,
      jwks
    };
  } catch (error) {
    console.error('Error generating RSA key pair:', error);
    throw error;
  }
};

/**
 * Load the private key
 * @returns {string} - Private key in PEM format
 */
const loadPrivateKey = () => {
  try {
    if (!fs.existsSync(PRIVATE_KEY_PATH)) {
      throw new Error('Private key not found. Please run generateKeys.js first.');
    }
    return fs.readFileSync(PRIVATE_KEY_PATH, 'utf8');
  } catch (error) {
    console.error('Error loading private key:', error);
    throw error;
  }
};

/**
 * Load the public key
 * @returns {string} - Public key in PEM format
 */
const loadPublicKey = () => {
  try {
    if (!fs.existsSync(PUBLIC_KEY_PATH)) {
      throw new Error('Public key not found. Please run generateKeys.js first.');
    }
    return fs.readFileSync(PUBLIC_KEY_PATH, 'utf8');
  } catch (error) {
    console.error('Error loading public key:', error);
    throw error;
  }
};

/**
 * Load the JWKS
 * @returns {Object} - JWKS object
 */
const loadJwks = () => {
  try {
    if (!fs.existsSync(JWKS_PATH)) {
      throw new Error('JWKS not found. Please run generateKeys.js first.');
    }
    return JSON.parse(fs.readFileSync(JWKS_PATH, 'utf8'));
  } catch (error) {
    console.error('Error loading JWKS:', error);
    throw error;
  }
};

module.exports = {
  generateRsaKeyPair,
  loadPrivateKey,
  loadPublicKey,
  loadJwks,
  PRIVATE_KEY_PATH,
  PUBLIC_KEY_PATH,
  JWKS_PATH
};