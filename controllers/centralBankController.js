const axios = require('axios');
const { loadPublicKey } = require('../utils/cryptoUtils');
const dotenv = require('dotenv');

dotenv.config();

/**
 * Register the bank with the central bank
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const registerBank = async (req, res) => {
  try {
    // Get bank details from .env
    const bankName = process.env.BANK_NAME;
    const bankPrefix = process.env.BANK_PREFIX;
    const bankOwners = process.env.BANK_OWNERS;
    const transactionUrl = process.env.BANK_TRANSACTION_URL;
    const jwksUrl = process.env.BANK_JWKS_URL;

    if (!bankName || !bankPrefix || !bankOwners || !transactionUrl || !jwksUrl) {
      return res.status(400).json({
        success: false,
        message: 'Missing required bank configuration in .env file'
      });
    }

    // Central bank API details
    const centralBankUrl = process.env.CENTRAL_BANK_URL;

    // Check if bank is already registered
    try {
      const centralBankApiKey = process.env.CENTRAL_BANK_API_KEY;

      if (centralBankApiKey) {
        // Try to get bank info from central bank
        const checkResponse = await axios.get(`${centralBankUrl}/banks/${bankPrefix}`, {
          headers: {
            'Authorization': `Bearer ${centralBankApiKey}`
          }
        });

        // If we get here, the bank is already registered
        if (checkResponse.data) {
          return res.status(409).json({
            success: false,
            message: 'Bank is already registered with the central bank',
            data: checkResponse.data
          });
        }
      }
    } catch (checkError) {
      // If we get a 404, the bank is not registered, which is what we want
      // Any other error should be ignored as we'll proceed with registration
      if (checkError.response && checkError.response.status !== 404) {
        console.log('Error checking bank registration status:', checkError.message);
      }
    }

    // Load the public key
    const publicKey = loadPublicKey();

    // Register the bank with the central bank
    const response = await axios.post(`${centralBankUrl}/banks`, {
      name: bankName,
      prefix: bankPrefix,
      owners: bankOwners,
      transactionUrl,
      jwksUrl,
      publicKey
    });

    // Save the central bank API key
    if (response.data.success && response.data.apiKey) {
      // In a real-world scenario, we would save this to .env or a secure storage
      console.log('Central bank API key:', response.data.apiKey);
      console.log('Please add this API key to your .env file as CENTRAL_BANK_API_KEY');

      res.status(201).json({
        success: true,
        message: 'Bank registered successfully with the central bank',
        data: {
          apiKey: response.data.apiKey
        }
      });
    } else {
      throw new Error('Failed to register with the central bank');
    }
  } catch (error) {
    console.error('Error registering with central bank:', error);

    if (error.response) {
      // Handle specific error cases
      if (error.response.status === 409) {
        return res.status(409).json({
          success: false,
          message: 'Bank with this prefix is already registered',
          error: error.response.data.message || error.message
        });
      }

      return res.status(error.response.status).json({
        success: false,
        message: 'Error registering with central bank',
        error: error.response.data.message || error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error registering with central bank',
      error: error.message
    });
  }
};

/**
 * Get all registered banks from the central bank
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getAllBanks = async (req, res) => {
  try {
    // Central bank API details
    const centralBankUrl = process.env.CENTRAL_BANK_URL;
    const centralBankApiKey = process.env.CENTRAL_BANK_API_KEY;

    if (!centralBankApiKey) {
      return res.status(401).json({
        success: false,
        message: 'Central bank API key is not configured'
      });
    }

    // Get all banks from the central bank
    const response = await axios.get(`${centralBankUrl}/banks`, {
      headers: {
        'Authorization': `Bearer ${centralBankApiKey}`
      }
    });

    res.status(200).json({
      success: true,
      data: response.data
    });
  } catch (error) {
    console.error('Error getting banks from central bank:', error);

    if (error.response) {
      return res.status(error.response.status).json({
        success: false,
        message: 'Error getting banks from central bank',
        error: error.response.data.message || error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error getting banks from central bank',
      error: error.message
    });
  }
};

/**
 * Get bank information from the central bank
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getBankInfo = async (req, res) => {
  try {
    const bankPrefix = req.params.prefix;

    // Central bank API details
    const centralBankUrl = process.env.CENTRAL_BANK_URL;
    const centralBankApiKey = process.env.CENTRAL_BANK_API_KEY;

    if (!centralBankApiKey) {
      return res.status(401).json({
        success: false,
        message: 'Central bank API key is not configured'
      });
    }

    // Get bank info from the central bank
    const response = await axios.get(`${centralBankUrl}/banks/${bankPrefix}`, {
      headers: {
        'Authorization': `Bearer ${centralBankApiKey}`
      }
    });

    res.status(200).json({
      success: true,
      data: response.data
    });
  } catch (error) {
    console.error('Error getting bank info from central bank:', error);

    if (error.response) {
      return res.status(error.response.status).json({
        success: false,
        message: 'Error getting bank info from central bank',
        error: error.response.data.message || error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error getting bank info from central bank',
      error: error.message
    });
  }
};

module.exports = {
  registerBank,
  getAllBanks,
  getBankInfo
};