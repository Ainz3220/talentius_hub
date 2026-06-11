import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from(process.env.ENCRYPTION_KEY || '0'.repeat(64), 'hex');

export function encrypt(plaintext) {
  if (plaintext === null || plaintext === undefined) return plaintext;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
}

export function normalizeEmail(email) {
  return String(email).toLowerCase().trim();
}

export function hashForLookup(plaintext) {
  if (plaintext === null || plaintext === undefined) return null;
  return crypto.createHmac('sha256', KEY)
    .update(normalizeEmail(plaintext), 'utf8')
    .digest('hex');
}

export function decrypt(ciphertext) {
  if (ciphertext === null || ciphertext === undefined) return ciphertext;
  try {
    const [ivB64, authTagB64, encryptedB64] = ciphertext.split(':');
    const iv = Buffer.from(ivB64, 'base64');
    const authTag = Buffer.from(authTagB64, 'base64');
    const encrypted = Buffer.from(encryptedB64, 'base64');
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
}

export function maskValue(plaintext) {
  if (!plaintext) return '🔒 ••••';
  const last4 = plaintext.slice(-4);
  return `🔒 ••••${last4}`;
}
