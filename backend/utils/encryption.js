import crypto from 'crypto';

// ✅ Message content encryption-at-rest
// Every chat message's `content` is stored in MongoDB as AES-256-GCM
// ciphertext, not plaintext. Anyone who dumps the database (backup leak,
// compromised Atlas login, etc.) sees gibberish instead of readable
// messages. This is NOT end-to-end encryption - the server still holds the
// key and decrypts messages to serve them to the app, exactly like a
// password hash's opposite: here we need the original text back, so it's
// reversible encryption rather than a one-way hash.

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV, the size GCM is designed for
const PREFIX = 'enc:v1:'; // marks a value as already-encrypted so old,

// pre-existing plaintext messages in the DB keep working without a migration
function getKey() {
  const raw = process.env.MESSAGE_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      'MESSAGE_ENCRYPTION_KEY is not set. Generate one with `openssl rand -hex 32` and add it to your .env file.'
    );
  }
  // Accept a proper 64-char hex string (32 bytes) as-is; otherwise hash
  // whatever was provided so any secret still yields a valid 32-byte key.
  if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, 'hex');
  return crypto.createHash('sha256').update(raw).digest();
}

// Turns plaintext into "enc:v1:<iv>:<authTag>:<ciphertext>" (all hex).
// Empty strings / null pass through untouched - nothing to encrypt.
export function encryptText(plainText) {
  if (plainText === '' || plainText == null) return plainText;
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(String(plainText), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

// Reverses encryptText. Anything that isn't in our encrypted format
// (empty string, or a message saved before this feature existed) is
// returned as-is, so old data never breaks.
export function decryptText(stored) {
  if (!stored || !stored.startsWith(PREFIX)) return stored;
  try {
    const [ivHex, authTagHex, dataHex] = stored.slice(PREFIX.length).split(':');
    const key = getKey();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(dataHex, 'hex')),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  } catch (err) {
    console.error('decryptText error:', err.message);
    return '⚠️ This message could not be decrypted';
  }
}
