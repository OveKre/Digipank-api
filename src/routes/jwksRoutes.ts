import { Router, Request, Response } from 'express';
import { JWKSResponse } from '../types';
import { Logger } from '../utils/logger';
import fs from 'fs';
import { config } from '../config/config';
import crypto from 'crypto';

const router = Router();
const logger = new Logger();

/**
 * @swagger
 * /jwks.json:
 *   get:
 *     summary: Get JWKS
 *     description: Get JSON Web Key Set for signature verification
 *     tags: [Security]
 *     responses:
 *       200:
 *         description: JWKS retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 keys:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       kty:
 *                         type: string
 *                         description: Key type
 *                       use:
 *                         type: string
 *                         description: Key use
 *                       kid:
 *                         type: string
 *                         description: Key ID
 *                       n:
 *                         type: string
 *                         description: RSA modulus
 *                       e:
 *                         type: string
 *                         description: RSA exponent
 *       500:
 *         description: Internal server error
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    // Check if public key file exists
    if (!fs.existsSync(config.publicKeyPath)) {
      logger.error('Public key file not found at:', config.publicKeyPath);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Public key not available'
      });
    }

    // Read the public key file
    const publicKeyPem = fs.readFileSync(config.publicKeyPath, 'utf8');
    
    // Create KeyObject from PEM
    const publicKey = crypto.createPublicKey(publicKeyPem);
    
    // Export the key as JWK
    const jwk = publicKey.export({ format: 'jwk' }) as any;
    
    // Generate a consistent key ID based on the key
    const keyBuffer = Buffer.from(JSON.stringify({n: jwk.n, e: jwk.e}));
    const kid = crypto.createHash('sha256').update(keyBuffer).digest('base64url').substring(0, 32);
    
    const jwks: JWKSResponse = {
      keys: [
        {
          kty: jwk.kty,
          use: "sig",
          kid: kid,
          n: jwk.n,
          e: jwk.e
        }
      ]
    };

    logger.info(`JWKS endpoint called, returning key with kid: ${kid}`);
    res.json(jwks);
    
  } catch (error) {
    logger.error('JWKS endpoint error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve JWKS'
    });
  }
});

export { router as jwksRoutes };
