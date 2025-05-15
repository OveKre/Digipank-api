const { generateRsaKeyPair } = require('./cryptoUtils');

/**
 * Generate RSA key pair for JWT signing
 * This script is used to generate the keys before starting the server
 */
const generateKeys = async () => {
  try {
    console.log('Starting key generation process...');
    
    // Generate RSA key pair (RS256)
    await generateRsaKeyPair();
    
    console.log('Key generation completed successfully!');
    console.log('RSA key pair (RS256) has been generated and saved.');
    console.log('Make sure to register your public key with the central bank.');
  } catch (error) {
    console.error('Error during key generation:', error);
    process.exit(1);
  }
};

// Run the key generation
generateKeys();