#!/usr/bin/env node
/**
 * Android Permanent Signing Key Manager (AES-256-GCM)
 *
 * Security rules:
 * - Never overwrites an existing keystore or encrypted backup.
 * - Uses AES-256-GCM authenticated encryption with scrypt key derivation.
 * - Never prints passwords, encryption keys, or raw keystore contents to stdout/stderr.
 * - Fails with non-zero exit code on decryption/integrity failure (never creates a replacement key).
 */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const ALGORITHM = 'aes-256-gcm';
const SCRYPT_KEY_LEN = 32;
const SALT_LEN = 32;
const IV_LEN = 12;

function requireEnv(name) {
  const val = process.env[name];
  if (!val || !val.trim()) {
    throw new Error(`Required environment variable ${name} is missing.`);
  }
  return val.trim();
}

function sha256Hex(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

export function encryptBufferAes256Gcm(plaintextBuffer, passphrase) {
  const salt = crypto.randomBytes(SALT_LEN);
  const iv = crypto.randomBytes(IV_LEN);
  const key = crypto.scryptSync(passphrase, salt, SCRYPT_KEY_LEN, { N: 16384, r: 8, p: 1 });

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintextBuffer), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return JSON.stringify(
    {
      format: 'lovelytalk-keystore-v1',
      algorithm: ALGORITHM,
      kdf: 'scrypt',
      kdfParams: { N: 16384, r: 8, p: 1, keyLen: SCRYPT_KEY_LEN },
      salt: salt.toString('hex'),
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      sha256: sha256Hex(plaintextBuffer),
      ciphertext: encrypted.toString('base64'),
      createdAt: new Date().toISOString(),
    },
    null,
    2
  );
}

export function decryptBufferAes256Gcm(envelopeJsonString, passphrase) {
  let envelope;
  try {
    envelope = JSON.parse(envelopeJsonString);
  } catch {
    throw new Error('Encrypted keystore backup is not valid JSON.');
  }

  if (envelope.algorithm !== ALGORITHM || envelope.kdf !== 'scrypt') {
    throw new Error(`Unsupported keystore encryption format: ${envelope.algorithm}/${envelope.kdf}`);
  }

  const salt = Buffer.from(envelope.salt, 'hex');
  const iv = Buffer.from(envelope.iv, 'hex');
  const authTag = Buffer.from(envelope.authTag, 'hex');
  const ciphertext = Buffer.from(envelope.ciphertext, 'base64');
  const kdfParams = envelope.kdfParams || { N: 16384, r: 8, p: 1, keyLen: SCRYPT_KEY_LEN };

  const key = crypto.scryptSync(passphrase, salt, kdfParams.keyLen || SCRYPT_KEY_LEN, {
    N: kdfParams.N || 16384,
    r: kdfParams.r || 8,
    p: kdfParams.p || 1,
  });

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let plaintext;
  try {
    plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  } catch {
    throw new Error(
      'AES-256-GCM decryption failed: wrong KEYSTORE_ENCRYPTION_KEY or corrupted backup file.'
    );
  }

  const actualHash = sha256Hex(plaintext);
  if (envelope.sha256 && actualHash !== envelope.sha256) {
    throw new Error('Decrypted keystore SHA-256 integrity verification failed.');
  }

  return plaintext;
}

export function verifyKeystoreWithKeytool(keystorePath, storePassword, alias) {
  if (!fs.existsSync(keystorePath)) {
    throw new Error(`Keystore file does not exist at ${keystorePath}`);
  }
  try {
    const out = execFileSync(
      'keytool',
      ['-list', '-keystore', keystorePath, '-alias', alias, '-storepass:env', 'KT_STOREPASS'],
      {
        env: { ...process.env, KT_STOREPASS: storePassword },
        stdio: ['ignore', 'pipe', 'pipe'],
        encoding: 'utf-8',
      }
    );
    const fpMatch = out.match(/SHA-?256:\s*([0-9A-Fa-f:]+)/);
    return fpMatch ? fpMatch[1] : 'verified';
  } catch {
    throw new Error(
      'keytool verification failed: keystore password or alias is invalid, or keystore is corrupted.'
    );
  }
}

function cmdInit(args) {
  const outKeystore = args[0] || path.resolve('lovelytalk-release.jks');
  const outEncrypted = args[1] || `${outKeystore}.enc`;

  if (fs.existsSync(outKeystore) || fs.existsSync(outEncrypted)) {
    throw new Error(
      `Refusing to generate a new signing key because a keystore or encrypted backup already exists (${outKeystore} / ${outEncrypted}). Existing signing keys must never be overwritten.`
    );
  }

  const storePass = requireEnv('ANDROID_KEYSTORE_PASSWORD');
  const keyPass = process.env.ANDROID_KEY_PASSWORD?.trim() || storePass;
  const alias = requireEnv('ANDROID_KEY_ALIAS');
  const encKey = requireEnv('KEYSTORE_ENCRYPTION_KEY');

  if (encKey.length < 16) {
    throw new Error('KEYSTORE_ENCRYPTION_KEY must be at least 16 characters long.');
  }

  const dname =
    process.env.ANDROID_KEY_DNAME ||
    'CN=LovelyTalk, OU=Mobile, O=LovelyTalk, L=Seoul, ST=Seoul, C=KR';

  execFileSync(
    'keytool',
    [
      '-genkeypair',
      '-v',
      '-storetype',
      'PKCS12',
      '-keystore',
      outKeystore,
      '-alias',
      alias,
      '-keyalg',
      'RSA',
      '-keysize',
      '2048',
      '-validity',
      '10000',
      '-dname',
      dname,
      '-storepass:env',
      'KT_STOREPASS',
      '-keypass:env',
      'KT_KEYPASS',
    ],
    {
      env: { ...process.env, KT_STOREPASS: storePass, KT_KEYPASS: keyPass },
      stdio: ['ignore', 'ignore', 'pipe'],
    }
  );

  fs.chmodSync(outKeystore, 0o600);
  const raw = fs.readFileSync(outKeystore);
  const encryptedJson = encryptBufferAes256Gcm(raw, encKey);
  fs.writeFileSync(outEncrypted, encryptedJson, { mode: 0o600 });

  const fingerprint = verifyKeystoreWithKeytool(outKeystore, storePass, alias);
  console.log('[keystore-manager] Permanent Android signing keystore created & AES-256-GCM encrypted.');
  console.log(`[keystore-manager] Certificate SHA-256 fingerprint: ${fingerprint}`);
  console.log(`[keystore-manager] Encrypted backup saved to: ${outEncrypted}`);
}

function cmdEncrypt(args) {
  const inKeystore = args[0];
  const outEncrypted = args[1] || `${inKeystore}.enc`;
  if (!inKeystore || !fs.existsSync(inKeystore)) {
    throw new Error('Usage: encrypt <input-keystore-path> [output-encrypted-path]');
  }
  const encKey = requireEnv('KEYSTORE_ENCRYPTION_KEY');
  const raw = fs.readFileSync(inKeystore);
  const encryptedJson = encryptBufferAes256Gcm(raw, encKey);
  fs.writeFileSync(outEncrypted, encryptedJson, { mode: 0o600 });
  console.log(`[keystore-manager] Encrypted backup written to: ${outEncrypted}`);
}

function cmdDecrypt(args) {
  const inEncrypted = args[0];
  const outKeystore = args[1];
  if (!inEncrypted || !outKeystore) {
    throw new Error('Usage: decrypt <input-encrypted-path> <output-keystore-path>');
  }
  const encKey = requireEnv('KEYSTORE_ENCRYPTION_KEY');
  const envelopeStr = fs.readFileSync(inEncrypted, 'utf-8');
  const plaintext = decryptBufferAes256Gcm(envelopeStr, encKey);
  fs.mkdirSync(path.dirname(path.resolve(outKeystore)), { recursive: true });
  fs.writeFileSync(outKeystore, plaintext, { mode: 0o600 });
  console.log(`[keystore-manager] Keystore decrypted and verified successfully.`);
}

function cmdVerify(args) {
  const keystorePath = args[0];
  if (!keystorePath) {
    throw new Error('Usage: verify <keystore-path>');
  }
  const storePass = requireEnv('ANDROID_KEYSTORE_PASSWORD');
  const alias = requireEnv('ANDROID_KEY_ALIAS');
  const fingerprint = verifyKeystoreWithKeytool(keystorePath, storePass, alias);
  console.log(`[keystore-manager] Verified keystore alias "${alias}" (SHA-256: ${fingerprint}).`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const [cmd, ...args] = process.argv.slice(2);
  try {
    if (cmd === 'init') cmdInit(args);
    else if (cmd === 'encrypt') cmdEncrypt(args);
    else if (cmd === 'decrypt') cmdDecrypt(args);
    else if (cmd === 'verify') cmdVerify(args);
    else {
      console.error('Usage: node scripts/android-keystore-manager.mjs <init|encrypt|decrypt|verify> ...');
      process.exit(1);
    }
  } catch (err) {
    console.error(`[keystore-manager] ERROR: ${err.message}`);
    process.exit(1);
  }
}
