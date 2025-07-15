import { CryptoUtils } from '../utils/crypto';
import { Logger } from '../utils/logger';
import { config } from '../config/config';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import https from 'https';
import http from 'http';
import crypto from 'crypto';

export class ExternalTransactionService {
  private logger = new Logger();

  /**
   * Process outgoing B2B transaction - generate JWT and send to destination bank
   */
  async processOutgoingTransaction(
    transactionId: string,
    accountFrom: string,
    accountTo: string,
    amount: number,
    currency: string,
    explanation?: string,
    senderName?: string
  ): Promise<boolean> {
    try {
      this.logger.info(`Processing outgoing B2B transaction: ${transactionId}`);

      // Generate JWT payload (amount is already in euros)
      const amountInEuros = amount; // Amount is already in euros
      const payload = {
        iss: config.bankPrefix.toUpperCase(), // Issuer - our bank prefix
        aud: "CENTRAL_BANK", // Audience - always central bank
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour expiry
        jti: CryptoUtils.generateId(), // Unique token ID
        transactionId: transactionId,
        accountFrom: accountFrom,
        accountTo: accountTo,
        currency: currency,
        amount: amountInEuros, // Amount in euros, not cents
        explanation: explanation || '',
        senderName: senderName || 'Digipanka klient'
      };

      this.logger.info(`JWT payload created for transaction ${transactionId}:`, {
        amount: amountInEuros,
        from: accountFrom,
        to: accountTo,
        currency: currency
      });

      // Sign JWT with our private key
      const jwtToken = this.generateSignedJWT(payload);

      if (!jwtToken) {
        this.logger.error(`Failed to generate JWT token for transaction: ${transactionId}`);
        throw new Error('Failed to generate JWT token');
      }

      this.logger.info(`JWT token generated successfully for transaction: ${transactionId}`);
      this.logger.info(`JWT token length: ${jwtToken.length} characters`);

      // Determine destination bank and send transaction
      const success = await this.sendToCentralBank(jwtToken, accountTo);

      if (success) {
        this.logger.info(`B2B transaction sent successfully: ${transactionId}`);
        return true;
      } else {
        throw new Error('Failed to send transaction to central bank');
      }

    } catch (error) {
      this.logger.error(`Failed to process outgoing B2B transaction ${transactionId}:`, error);
      return false;
    }
  }

  /**
   * Generate signed JWT using our private key
   */
  private generateSignedJWT(payload: any): string | null {
    try {
      // Check if private key exists
      if (!fs.existsSync(config.privateKeyPath)) {
        this.logger.error('Private key file not found at:', config.privateKeyPath);
        return null;
      }

      // Read private key
      const privateKey = fs.readFileSync(config.privateKeyPath, 'utf8');

      // Generate same kid as JWKS endpoint does
      const publicKey = crypto.createPublicKey(privateKey);
      const jwk = publicKey.export({ format: 'jwk' }) as any;
      const keyBuffer = Buffer.from(JSON.stringify({n: jwk.n, e: jwk.e}));
      const kid = crypto.createHash('sha256').update(keyBuffer).digest('base64url').substring(0, 32);

      this.logger.info(`Generated kid for JWT: ${kid}`);

      // Sign JWT with RS256
      const token = jwt.sign(payload, privateKey, {
        algorithm: 'RS256',
        keyid: kid  // Use same kid as JWKS endpoint
      });

      return token;
    } catch (error) {
      this.logger.error('Failed to generate signed JWT:', error);
      return null;
    }
  }

  /**
   * Send transaction to central bank
   */
  private async sendToCentralBank(jwtToken: string, destinationAccount: string): Promise<boolean> {
    try {
      this.logger.info(`Starting to send transaction to destination account: ${destinationAccount}`);

      // Determine destination bank prefix from account number
      const destinationBankPrefix = this.extractBankPrefix(destinationAccount);
      this.logger.info(`Extracted bank prefix: ${destinationBankPrefix} from account: ${destinationAccount}`);

      if (!destinationBankPrefix) {
        throw new Error(`Cannot determine destination bank from account: ${destinationAccount}`);
      }

      // For now, send directly to the destination bank
      // In real implementation, this would go through central bank
      const destinationUrl = this.getDestinationBankUrl(destinationBankPrefix);
      this.logger.info(`Destination bank URL: ${destinationUrl} for prefix: ${destinationBankPrefix}`);

      if (!destinationUrl) {
        throw new Error(`Unknown destination bank: ${destinationBankPrefix}`);
      }

      this.logger.info(`Sending HTTP request to: ${destinationUrl}`);
      const success = await this.makeHttpRequest(destinationUrl, {
          jwt: jwtToken
      });

       if (success) {
        this.logger.info('Transaction sent successfully to destination bank');
        return true;
      } else {
        this.logger.error('Failed to send transaction to destination bank');
        return false;
      }

    } catch (error) {
      this.logger.error('Failed to send transaction to central bank:', error);
      return false;
    }
  }

  /**
   * Make HTTP POST request using Node.js built-in modules
   */
  private async makeHttpRequest(url: string, data: any): Promise<boolean> {
    return new Promise((resolve) => {
      this.logger.info(`Making HTTP request to: ${url}`);

      const urlObj = new URL(url);
      const postData = JSON.stringify(data);

      this.logger.info(`Request details:`, {
        hostname: urlObj.hostname,
        port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
        path: urlObj.pathname,
        protocol: urlObj.protocol,
        dataSize: Buffer.byteLength(postData)
      });

      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
        path: urlObj.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          'User-Agent': `${config.bankName}/1.0`
        }
      };

      const httpModule = urlObj.protocol === 'https:' ? https : http;
      this.logger.info(`Using ${urlObj.protocol === 'https:' ? 'HTTPS' : 'HTTP'} module`);

      const req = httpModule.request(options, (res) => {
        this.logger.info(`Response received with status: ${res.statusCode}`);
        let responseData = '';

        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', () => {
          this.logger.info(`Response complete. Status: ${res.statusCode}, Data length: ${responseData.length}`);

          // RFC 7231 compliant status code handling
          if (res.statusCode) {
            if (res.statusCode >= 200 && res.statusCode <= 299) {
              // 2xx Success responses
              this.logger.info(`HTTP request successful: ${res.statusCode}, Response: ${responseData}`);
              resolve(true);
            } else if (res.statusCode >= 300 && res.statusCode <= 399) {
              // 3xx Redirection responses
              this.logger.warn(`HTTP redirect received: ${res.statusCode}, Response: ${responseData}`);
              resolve(false);
            } else if (res.statusCode >= 400 && res.statusCode <= 499) {
              // 4xx Client error responses
              this.logger.error(`HTTP client error: ${res.statusCode}, Response: ${responseData}`);
              resolve(false);
            } else if (res.statusCode >= 500 && res.statusCode <= 599) {
              // 5xx Server error responses
              this.logger.error(`HTTP server error: ${res.statusCode}, Response: ${responseData}`);
              resolve(false);
            } else {
              // Non-standard status codes
              this.logger.error(`HTTP non-standard status: ${res.statusCode}, Response: ${responseData}`);
              resolve(false);
            }
          } else {
            this.logger.error('HTTP response received without status code');
            resolve(false);
          }
        });
      });

      req.on('error', (error) => {
        this.logger.error('HTTP request error:', error);
        resolve(false);
      });

      req.setTimeout(30000, () => {
        this.logger.error('HTTP request timeout (30 seconds)');
        req.destroy();
        resolve(false);
      });

      this.logger.info(`Sending POST data: ${postData}`);
      req.write(postData);
      req.end();
      this.logger.info('HTTP request sent, waiting for response...');
    });
  }

  /**
   * Extract bank prefix from account number
   */
  private extractBankPrefix(accountNumber: string): string | null {
    // Assuming account format: "prefix + digits"
    // Example: "05b1234567890" -> "05b", "97f41936..." -> "97f"

    if (accountNumber.length >= 3) {
      // Try different prefix lengths
      const prefixes = [
        accountNumber.substring(0, 3), // 3 chars like "05b"
        accountNumber.substring(0, 4), // 4 chars
        accountNumber.substring(0, 2)  // 2 chars
      ];

      // For now, return the first 3 characters as prefix
      return prefixes[0];
    }

    return null;
  }

  /**
   * Get destination bank URL by prefix
   */
  private getDestinationBankUrl(prefix: string): string | null {
    // Bank registry from central bank - all registered banks
    const bankRegistry: { [key: string]: string } = {
      '05b': 'https://pank.digikaup.online/transactions/b2b', // Our own bank (Digipank)
      '97f': 'https://henno.cfd/henno-pank/transactions/b2b', // barBank (Henno)
      '435': 'https://bank.brigitakasemets.me/transactions/b2b', // FlowBank (Brigita)
      '8a0': 'https://hack2you.eu/oa-pank/docs/transactions/b2b', // OA-Pank (Andre)
    };

    return bankRegistry[prefix] || null;
  }
}