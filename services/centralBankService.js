const axios = require('axios');
const { loadPublicKey } = require('../utils/cryptoUtils');
const dotenv = require('dotenv');

dotenv.config();

/**
 * Check if the bank is already registered with the central bank
 * @returns {Promise<boolean>} - True if bank is already registered
 */
const isBankRegistered = async () => {
  try {
    const bankPrefix = process.env.BANK_PREFIX;
    const centralBankUrl = process.env.CENTRAL_BANK_URL;
    const centralBankApiKey = process.env.CENTRAL_BANK_API_KEY;

    if (!centralBankApiKey || !bankPrefix) {
      return false;
    }

    // Try to get bank info from central bank
    const response = await axios.get(`${centralBankUrl}/banks/${bankPrefix}`, {
      headers: {
        'Authorization': `Bearer ${centralBankApiKey}`
      }
    });

    return !!response.data;
  } catch (error) {
    // If we get a 404, the bank is not registered
    if (error.response && error.response.status === 404) {
      return false;
    }

    // For any other error, we can't determine, so we'll assume not registered
    return false;
  }
};

/**
 * Register the bank with the central bank
 * @returns {Promise<Object>} - Registration result with API key
 */
const registerBank = async () => {
  try {
    // Get bank details from .env
    const bankName = process.env.BANK_NAME;
    const bankPrefix = process.env.BANK_PREFIX;
    const bankOwners = process.env.BANK_OWNERS;
    const transactionUrl = process.env.BANK_TRANSACTION_URL;
    const jwksUrl = process.env.BANK_JWKS_URL;

    if (!bankName || !bankPrefix || !bankOwners || !transactionUrl || !jwksUrl) {
      throw new Error('Missing required bank configuration in .env file');
    }

    // Check if bank is already registered
    const isRegistered = await isBankRegistered();
    if (isRegistered) {
      throw new Error('Bank is already registered with the central bank');
    }

    // Load the public key
    const publicKey = loadPublicKey();

    // Central bank API details
    const centralBankUrl = process.env.CENTRAL_BANK_URL;

    // Register the bank with the central bank
    const response = await axios.post(`${centralBankUrl}/banks`, {
      name: bankName,
      prefix: bankPrefix,
      owners: bankOwners,
      transactionUrl,
      jwksUrl,
      publicKey
    });

    if (response.data.success && response.data.apiKey) {
      return {
        success: true,
        message: 'Bank registered successfully with the central bank',
        apiKey: response.data.apiKey
      };
    } else {
      throw new Error('Failed to register with the central bank');
    }
  } catch (error) {
    if (error.response) {
      // Handle specific error cases
      if (error.response.status === 409) {
        throw new Error('Bank with this prefix is already registered');
      }
      throw new Error(error.response.data.message || 'Error from central bank');
    }
    throw error;
  }
};

/**
 * Get all registered banks from the central bank
 * @returns {Promise<Array>} - Array of banks
 */
const getAllBanks = async () => {
  try {
    // Central bank API details
    const centralBankUrl = process.env.CENTRAL_BANK_URL;
    const centralBankApiKey = process.env.CENTRAL_BANK_API_KEY;

    if (!centralBankApiKey) {
      throw new Error('Central bank API key is not configured');
    }

    // Get all banks from the central bank
    const response = await axios.get(`${centralBankUrl}/banks`, {
      headers: {
        'Authorization': `Bearer ${centralBankApiKey}`
      }
    });

    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data.message || 'Error from central bank');
    }
    throw error;
  }
};

/**
 * Get bank information from the central bank
 * @param {string} bankPrefix - Bank prefix
 * @returns {Promise<Object>} - Bank information
 */
const getBankInfo = async (bankPrefix) => {
  try {
    // Central bank API details
    const centralBankUrl = process.env.CENTRAL_BANK_URL;
    const centralBankApiKey = process.env.CENTRAL_BANK_API_KEY;

    if (!centralBankApiKey) {
      throw new Error('Central bank API key is not configured');
    }

    // Get bank info from the central bank
    const response = await axios.get(`${centralBankUrl}/banks/${bankPrefix}`, {
      headers: {
        'Authorization': `Bearer ${centralBankApiKey}`
      }
    });

    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data.message || 'Error from central bank');
    }
    throw error;
  }
};

/**
 * Validate bank connection with central bank
 * @returns {Promise<boolean>} - True if connection is valid
 */
const validateConnection = async () => {
  try {
    // Central bank API details
    const centralBankUrl = process.env.CENTRAL_BANK_URL;
    const centralBankApiKey = process.env.CENTRAL_BANK_API_KEY;

    if (!centralBankApiKey) {
      return false;
    }

    // Try to make a simple request to the central bank
    await axios.get(`${centralBankUrl}/health`, {
      headers: {
        'Authorization': `Bearer ${centralBankApiKey}`
      }
    });

    return true;
  } catch (error) {
    return false;
  }
};

module.exports = {
  registerBank,
  getAllBanks,
  getBankInfo,
  validateConnection,
  isBankRegistered
};