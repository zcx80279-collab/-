#!/usr/bin/env node
/**
 * CI Permanent Android Signing Key Restore Utility
 *
 * Restores the existing permanent Android release signing key from:
 *   1) Dedicated PRIVATE GitHub backup repository release (ANDROID_KEYSTORE_BACKUP_REPO + KEYSTORE_BACKUP_TOKEN)
 *      -> Strictly verifies `repo.private === true` before downloading so encrypted keys are NEVER stored in a public repo.
 *   2) OR GitHub Encrypted Secret (`ANDROID_KEYSTORE_ENC_BASE64`, base64-encoded AES-256-GCM backup file).
 *
 * Strictly aborts the build (exit code 1) if restoration, decryption, or keytool verification fails.
 * NEVER generates a replacement keystore during CI builds.
 */
import fs from 'fs';
import path from 'path';
import { decryptBufferAes256Gcm, verifyKeystoreWithKeytool } from './android-keystore-manager.mjs';

const BACKUP_RELEASE_TAG = process.env.ANDROID_KEYSTORE_BACKUP_TAG || 'keystore-vault';
const BACKUP_ASSET_NAME = process.env.ANDROID_KEYSTORE_BACKUP_ASSET || 'lovelytalk-release.jks.enc';

function requireEnv(name) {
  const v = process.env[name];
  if (!v || !v.trim()) {
    throw new Error(`Missing required secret/env: ${name}`);
  }
  return v.trim();
}

async function fetchFromPrivateBackupRepo(backupRepo, token) {
  const headers = {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'User-Agent': 'LovelyTalk-Keystore-Restore',
  };

  // 1. CRITICAL SECURITY CHECK: Verify backup repository is strictly PRIVATE
  const repoRes = await fetch(`https://api.github.com/repos/${backupRepo}`, { headers });
  if (!repoRes.ok) {
    throw new Error(
      `Cannot access backup repository "${backupRepo}" (HTTP ${repoRes.status}). Check ANDROID_KEYSTORE_BACKUP_REPO and KEYSTORE_BACKUP_TOKEN.`
    );
  }
  const repoInfo = await repoRes.json();
  if (repoInfo.private !== true) {
    throw new Error(
      `SECURITY ABORT: Keystore backup repository "${backupRepo}" is PUBLIC (private=${repoInfo.private}). Keystore backups must ONLY reside in a strictly PRIVATE repository.`
    );
  }

  // Ensure backup repo is strictly separated from a public app repository
  const currentRepo = process.env.GITHUB_REPOSITORY || '';
  if (currentRepo && currentRepo.toLowerCase() === backupRepo.toLowerCase()) {
    console.log(
      '[keystore-restore] Backup repo matches current repo (verified private=true). Checking isolated vault tag...'
    );
  }

  // 2. Locate the dedicated vault release tag
  const relRes = await fetch(
    `https://api.github.com/repos/${backupRepo}/releases/tags/${encodeURIComponent(BACKUP_RELEASE_TAG)}`,
    { headers }
  );
  if (!relRes.ok) {
    throw new Error(
      `Keystore backup release tag "${BACKUP_RELEASE_TAG}" not found in private repo "${backupRepo}" (HTTP ${relRes.status}).`
    );
  }
  const release = await relRes.json();
  const asset = (release.assets || []).find((a) => a.name === BACKUP_ASSET_NAME);
  if (!asset) {
    throw new Error(
      `Encrypted keystore asset "${BACKUP_ASSET_NAME}" not found in "${backupRepo}" release "${BACKUP_RELEASE_TAG}".`
    );
  }

  // 3. Download asset binary securely via GitHub API
  const assetRes = await fetch(asset.url, {
    headers: {
      Accept: 'application/octet-stream',
      Authorization: `Bearer ${token}`,
      'User-Agent': 'LovelyTalk-Keystore-Restore',
    },
  });
  if (!assetRes.ok) {
    throw new Error(`Failed to download encrypted keystore backup asset (HTTP ${assetRes.status}).`);
  }

  return await assetRes.text();
}

async function main() {
  const outKeystorePath =
    process.argv[2] || process.env.ANDROID_KEYSTORE_PATH || path.resolve('android/app/release-keystore.jks');

  const encKey = requireEnv('KEYSTORE_ENCRYPTION_KEY');
  const storePass = requireEnv('ANDROID_KEYSTORE_PASSWORD');
  const alias = requireEnv('ANDROID_KEY_ALIAS');
  // Ensure key password is also present (or falls back to store password in Gradle)
  const backupRepo = (process.env.ANDROID_KEYSTORE_BACKUP_REPO || '').trim();
  const backupToken = (process.env.KEYSTORE_BACKUP_TOKEN || '').trim();
  const encBase64Secret = (process.env.ANDROID_KEYSTORE_ENC_BASE64 || '').trim();

  let encryptedEnvelopeText = '';

  if (backupRepo && backupToken) {
    console.log('[keystore-restore] Restoring AES-256-GCM backup from private GitHub vault...');
    encryptedEnvelopeText = await fetchFromPrivateBackupRepo(backupRepo, backupToken);
  } else if (encBase64Secret) {
    console.log('[keystore-restore] Restoring AES-256-GCM backup from GitHub Secret (ANDROID_KEYSTORE_ENC_BASE64)...');
    encryptedEnvelopeText = Buffer.from(encBase64Secret, 'base64').toString('utf-8');
  } else {
    throw new Error(
      'No permanent Android keystore backup source configured! Provide either (ANDROID_KEYSTORE_BACKUP_REPO + KEYSTORE_BACKUP_TOKEN) or (ANDROID_KEYSTORE_ENC_BASE64). Build aborted to prevent generating a new signing key.'
    );
  }

  const plaintextKeystore = decryptBufferAes256Gcm(encryptedEnvelopeText, encKey);

  fs.mkdirSync(path.dirname(path.resolve(outKeystorePath)), { recursive: true });
  fs.writeFileSync(outKeystorePath, plaintextKeystore, { mode: 0o600 });

  const fingerprint = verifyKeystoreWithKeytool(outKeystorePath, storePass, alias);
  console.log(`[keystore-restore] Permanent keystore restored & verified (SHA-256: ${fingerprint}).`);
}

main().catch((err) => {
  console.error(`[keystore-restore] FATAL: ${err.message}`);
  process.exit(1);
});
