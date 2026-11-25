#!/usr/bin/env node
/**
 * Generates android-latest.json metadata for Android in-app auto-update checks,
 * including SHA-256 integrity hash, version, versionCode, APK download URL, and release notes.
 */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

function main() {
  const apkPath = process.argv[2];
  const outPath = process.argv[3];

  if (!apkPath || !outPath) {
    console.error('Usage: node scripts/generate-android-metadata.mjs <apk-path> <output-json-path>');
    process.exit(1);
  }

  if (!fs.existsSync(apkPath)) {
    throw new Error(`APK file not found at: ${apkPath}`);
  }

  const versionManifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'version.json'), 'utf-8'));
  const apkBytes = fs.readFileSync(apkPath);
  const sha256 = crypto.createHash('sha256').update(apkBytes).digest('hex');

  const tag = `v${versionManifest.version}`;
  const repo = process.env.GITHUB_REPOSITORY || versionManifest.githubRepo || '';
  const apkFileName = 'LovelyTalk-Android.apk';
  const apkUrl = repo
    ? `https://github.com/${repo}/releases/download/${tag}/${apkFileName}`
    : '';

  const releaseNotes =
    process.env.RELEASE_NOTES?.trim() ||
    `러비러비톡 ${tag} 정식 릴리스입니다. 기존 채팅 기록과 캐릭터 설정을 유지한 채 안전하게 업데이트할 수 있습니다.`;

  const payload = {
    appId: versionManifest.appId,
    version: versionManifest.version,
    versionCode: versionManifest.androidVersionCode,
    tag,
    apkFileName,
    apkUrl,
    sha256,
    size: apkBytes.length,
    releaseNotes,
    prerelease: false,
    publishedAt: new Date().toISOString(),
  };

  fs.mkdirSync(path.dirname(path.resolve(outPath)), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2) + '\n', 'utf-8');
  console.log(`[android-meta] Generated ${outPath} (v${payload.version}, code=${payload.versionCode}, sha256=${sha256})`);
}

try {
  main();
} catch (err) {
  console.error(`[android-meta] ERROR: ${err.message}`);
  process.exit(1);
}
