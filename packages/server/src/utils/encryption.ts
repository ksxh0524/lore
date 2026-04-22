import crypto from 'crypto';

// AES-256-GCM encryption key from environment variable or default
const ENCRYPTION_KEY = process.env.LORE_ENCRYPTION_KEY || 'lore-default-encryption-key-32chars!';

// Ensure key is exactly 32 bytes for AES-256
const getKey = (): Buffer => {
  const key = Buffer.from(ENCRYPTION_KEY);
  if (key.length === 32) return key;
  // Hash to 32 bytes if not exact length
  return crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
};

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits

/**
 * Encrypt an API key using AES-256-GCM
 * Returns base64-encoded string with format: iv:authTag:ciphertext
 */
export function encryptApiKey(apiKey: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);

  const encrypted = Buffer.concat([cipher.update(apiKey, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Combine iv + authTag + encrypted data and encode as base64
  const combined = Buffer.concat([iv, authTag, encrypted]);
  return combined.toString('base64');
}

/**
 * Decrypt an encrypted API key
 * Expects base64-encoded string with format: iv:authTag:ciphertext
 */
export function decryptApiKey(encrypted: string): string {
  const combined = Buffer.from(encrypted, 'base64');

  if (combined.length < IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new Error('Invalid encrypted data');
  }

  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
}

/**
 * Mask an API key for display (e.g., sk-abc...xyz)
 */
export function maskApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length <= 8) return '***';
  return `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}`;
}
