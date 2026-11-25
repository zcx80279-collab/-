#!/usr/bin/env node
/**
 * Pre-publish Release Asset Verifier
 *
 * Guarantees that ALL required Android & Windows artifacts exist, are non-empty,
 * and have 100% consistent version numbers, filenames, and cryptographic hashes
 * BEFORE any GitHub Release is published.
 */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

function fileHash(filePath, algo, encoding) {
  const hash = crypto.createHash(algo);
  hash.update(fs.readFileSync(filePath));
  return hash.digest(encoding);
}

function assertFileExists(dir, fileName, minBytes = 1) {
  const fullPath = path.join(dir, fileName);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Required release file is missing: ${fileName}`);
  }
  const stat = fs.statSync(fullPath);
  if (!stat.isFile() || stat.size < minBytes) {
    throw new Error(`Required release file "${fileName}" is empty or too small (${stat.size} bytes).`);
  }
  return { fullPath, size: stat.size };
}

function main() {
  const dir = process.argv[2] || path.resolve('release-bundle');
  const expectedVersion = process.argv[3] || JSON.parse(fs.readFileSync('version.json', 'utf-8')).version;

  console.log(`[verify-release] Inspecting release bundle in ${dir} for v${expectedVersion}...`);

  // 1. Required files check
  const apk = assertFileExists(dir, 'LovelyTalk-Android.apk', 100_000);
  const androidMeta = assertFileExists(dir, 'android-latest.json', 20);
  const exe = assertFileExists(dir, 'LovelyTalk-Windows-Setup.exe', 1_000_000);
  const blockmap = assertFileExists(dir, 'LovelyTalk-Windows-Setup.exe.blockmap', 100);
  const latestYml = assertFileExists(dir, 'latest.yml', 50);

  // 2. Verify android-latest.json integrity & match with APK
  const meta = JSON.parse(fs.readFileSync(androidMeta.fullPath, 'utf-8'));
  if (meta.version !== expectedVersion) {
    throw new Error(`android-latest.json version (${meta.version}) !== expected (${expectedVersion})`);
  }
  if (meta.apkFileName !== 'LovelyTalk-Android.apk') {
    throw new Error(`android-latest.json apkFileName (${meta.apkFileName}) !== "LovelyTalk-Android.apk"`);
  }
  const actualApkSha256 = fileHash(apk.fullPath, 'sha256', 'hex');
  if (meta.sha256 !== actualApkSha256) {
    throw new Error(
      `android-latest.json SHA-256 mismatch! metadata=${meta.sha256}, actual=${actualApkSha256}`
    );
  }

  // 3. Verify latest.yml integrity & match with Windows EXE
  const ymlText = fs.readFileSync(latestYml.fullPath, 'utf-8');
  const ymlVersionMatch = ymlText.match(/^version:\s*['"]?([^\s'"]+)['"]?/m);
  if (!ymlVersionMatch || ymlVersionMatch[1] !== expectedVersion) {
    throw new Error(
      `latest.yml version (${ymlVersionMatch?.[1]}) !== expected (${expectedVersion})`
    );
  }
  if (!ymlText.includes('LovelyTalk-Windows-Setup.exe')) {
    throw new Error('latest.yml does not reference "LovelyTalk-Windows-Setup.exe"!');
  }

  const actualExeSha512 = fileHash(exe.fullPath, 'sha512', 'base64');
  if (!ymlText.includes(actualExeSha512)) {
    throw new Error('latest.yml SHA-512 checksum does not match LovelyTalk-Windows-Setup.exe!');
  }

  console.log('[verify-release] ALL 5 RELEASE ARTIFACTS VERIFIED:');
  console.log(`  - LovelyTalk-Android.apk (${apk.size} bytes, sha256=${actualApkSha256.slice(0, 12)}...)`);
  console.log(`  - android-latest.json (version=${meta.version}, versionCode=${meta.versionCode})`);
  console.log(`  - LovelyTalk-Windows-Setup.exe (${exe.size} bytes, sha512 verified in latest.yml)`);
  console.log(`  - LovelyTalk-Windows-Setup.exe.blockmap (${blockmap.size} bytes)`);
  console.log(`  - latest.yml (version=${ymlVersionMatch[1]})`);
}

try {
  main();
} catch (err) {
  console.error(`[verify-release] FAILED: ${err.message}`);
  process.exit(1);
}
