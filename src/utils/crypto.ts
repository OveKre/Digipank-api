import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/config';

export class CryptoUtils {
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  static generateToken(payload: object, expiresIn?: string): string {
    return jwt.sign(payload, config.jwtSecret, {
      expiresIn: expiresIn || config.jwtExpiresIn,
      issuer: config.bankName,
      jwtid: uuidv4()
    } as jwt.SignOptions);
  }

  static verifyToken(token: string): any {
    return jwt.verify(token, config.jwtSecret);
  }

  static generateAccountNumber(): string {
    // Generate account number with bank prefix
    const randomPart = Math.random().toString().slice(2, 12); // 10 digits
    return `${config.bankPrefix}${randomPart}`;
  }

  static generateId(): string {
    return uuidv4();
  }

  static calculateChecksum(accountNumber: string): string {
    // Simple checksum calculation for account numbers
    let sum = 0;
    for (let i = 0; i < accountNumber.length; i++) {
      const char = accountNumber.charCodeAt(i);
      sum += char * (i + 1);
    }
    return (sum % 97).toString().padStart(2, '0');
  }

  static validateAccountNumber(accountNumber: string): boolean {
    // Basic validation for account number format
    const pattern = new RegExp(`^${config.bankPrefix}\\d{10}$`);
    return pattern.test(accountNumber);
  }

  static isInternalAccount(accountNumber: string): boolean {
    return accountNumber.startsWith(config.bankPrefix);
  }
}
