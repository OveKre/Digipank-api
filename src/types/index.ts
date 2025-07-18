export interface User {
  id: string;
  name: string;
  username: string;
  password_hash?: string;
  created_at?: string;
  accounts?: Account[];
}

export interface Account {
  id: string;
  user_id: string;
  name: string;
  number: string;
  currency: SupportedCurrency;
  balance: number;
  created_at?: string;
}

// Supported currencies
export const SUPPORTED_CURRENCIES = ['EUR', 'USD', 'GBP', 'SEK', 'NOK', 'DKK'] as const;
export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number];

export interface Transaction {
  id: string;
  account_from: string;
  account_to: string;
  amount: number;
  currency: string;
  explanation?: string;
  sender_name?: string;
  status: TransactionStatus;
  status_detail?: string;
  created_at?: string;
}

export interface Session {
  id: string;
  user_id: string;
  token: string;
  expires_at: string;
  created_at?: string;
}

export enum TransactionStatus {
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export interface UserRegistration {
  name: string;
  username: string;
  password: string;
}

export interface UserLogin {
  username: string;
  password: string;
}

export interface TransactionRequest {
  accountFrom: string;
  accountTo: string;
  amount: number;
  explanation?: string;
}

export interface B2BTransaction {
  jwt: string;
}

export interface B2BTransactionPayload {
  accountFrom: string;
  accountTo: string;
  currency: string;
  amount: number;
  explanation?: string;
  senderName: string;
}

export interface JWKSResponse {
  keys: JWK[];
}

export interface JWK {
  kty: string;
  use: string;
  kid: string;
  n: string;
  e: string;
}

export interface ApiError {
  error: string;
  message: string;
  statusCode?: number;
}
