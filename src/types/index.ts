// USER
export interface User {
  id: number;
  name: string;
  username: string;
  password_hash?: string;
  is_active: boolean;
  created_date?: string;
  updated_date?: string;
  accounts?: Account[];
  roles?: string[];
}

// ACCOUNT
export interface Account {
  id: number;
  user_id: number;
  name: string;
  account_number: string;
  currency: SupportedCurrency;
  balance: number;
  account_type: AccountType;
  is_active: boolean;
  created_date?: string;
  updated_date?: string;
}

// Supported currencies
export const SUPPORTED_CURRENCIES = ['EUR', 'USD', 'GBP', 'SEK', 'NOK', 'DKK'] as const;
export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number];

// Account types
export enum AccountType {
  CHECKING = 'checking',
  SAVINGS = 'savings',
  CREDIT = 'credit',
  BUSINESS = 'business'
}

// TRANSACTION
export interface Transaction {
  id: string;
  from_account: string;
  to_account: string;
  amount: number;
  currency: string;
  transaction_type: TransactionType;
  description?: string;
  sender_name?: string;
  status: TransactionStatus;
  status_detail?: string;
  reference_number?: string;
  created_at?: string;
}

// Transaction types
export enum TransactionType {
  TRANSFER = 'transfer',
  DEPOSIT = 'deposit',
  WITHDRAWAL = 'withdrawal',
  PAYMENT = 'payment',
  INTEREST = 'interest'
}

// Transaction status
export enum TransactionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  FAILED = 'failed'
}

// SESSION
export interface Session {
  id: number;
  user_id: number;
  token: string;
  expires_date: string;
  ip_address?: string;
  user_agent?: string;
  is_active: boolean;
  created_date?: string;
}

// ROLE
export interface Role {
  id: number;
  role_name: string;
  description?: string;
  is_active: boolean;
  created_date?: string;
}

// USER ROLE
export interface UserRole {
  id: number;
  user_id: number;
  role_id: number;
  granter_id?: number;
  granted_date?: string;
  expires_date?: string;
  is_active: boolean;
  created_date?: string;
}

// AUDIT LOG
export interface AuditLog {
  id: number;
  user_id?: number;
  action: string;
  resource_type: string;
  resource_id?: string;
  old_values?: any;
  new_values?: any;
  ip_address?: string;
  user_agent?: string;
  created_date?: string;
}

// USER REGISTRATION
export interface UserRegistration {
  name: string;
  username: string;
  password: string;
  email?: string;
  phone?: string;
}

// ACCOUNT CREATION
export interface AccountCreation {
  name: string;
  currency: SupportedCurrency;
  account_type: AccountType;
}

// BACKWARD COMPATIBILITY ALIASES FOR OLD ESTONIAN NAMES
export type Kasutaja = User;
export type Konto = Account;
export type Tehing = Transaction;
export type Sessioon = Session;
export type Roll = Role;
export type KasutajaRoll = UserRole;
export type Auditilogi = AuditLog;
export type KasutajaRegistreerimine = UserRegistration;
export type KontoLoomine = AccountCreation;
export type ToetavadValuutad = SupportedCurrency;
export const TOETAVAD_VALUUTAD = SUPPORTED_CURRENCIES;

// Old enum aliases
export const KontoTyyp = AccountType;
export const TehinguTyyp = TransactionType;
export const TehinguStaatus = TransactionStatus;

// Puuduvad tüübid teiste failide jaoks
export interface ApiError extends Error {
  statusCode: number;
  error: string;
}

export interface B2BTransactionPayload {
  accountFrom: string;
  accountTo: string;
  amount: number;
  currency: string;
  explanation?: string;
  senderName?: string;
}

export interface JWKSResponse {
  keys: Array<{
    kty: string;
    use: string;
    kid: string;
    n: string;
    e: string;
  }>;
}
