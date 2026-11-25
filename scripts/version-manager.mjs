#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const SEMVER_RE = /^(\d+)\.(\d+)\.(\d+)$/;

export function parseSemver(version) {
  const m = String(version || '').trim().match(SEMVER_RE);
  if (!m) return null;
  return {
    major: Number(m[1]),
    minor: Number(m[2]),
    patch: Number(m[3]),
  };
}

export function compareSemver(a, b) {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  if (!pa || !pb) {
    throw new Error(`Invalid SemVer comparison: "${a}" vs "${b}"`);
  }
  if (pa.major !== pb.major) return pa.major - pb.major;
  if (pa.minor !== pb.minor) return pa.minor - pb.minor;
  return pa.patch - pb.patch;
}

export function computeMinVersionCode(version) {
  const p = parseSemver(version);
  if (!p) throw new Error(`Invalid SemVer: ${version}`);
  return p.major * 10000 + p.minor * 100 + p.patch;
}

function readJson(relPath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relPath), 'utf-8'));
}

function writeJson(relPath, obj) {
  fs.writeFileSync(path.join(ROOT, relPath), JSON.stringify(obj, null, 2) + '\n', 'utf-8');
}

function readGradleVersions() {
  const gradlePath = path.join(ROOT, 'android', 'app', 'build.gradle');
  if (!fs.existsSync(gradlePath)) return null;
  const content = fs.readFileSync(gradlePath, 'utf-8');
  const codeMatch = content.match(/\bversionCode\s+(\d+)/);
  const nameMatch = content.match(/\bversionName\s+"([^"]+)"/);
  return {
    path: gradlePath,
    content,
    versionCode: codeMatch ? Number(codeMatch[1]) : null,
    versionName: nameMatch ? nameMatch[1] : null,
  };
}

function updateGradleVersions(version, versionCode) {
  const gradle = readGradleVersions();
  if (!gradle) return false;
  let updated = gradle.content.replace(/\bversionCode\s+\d+/, `versionCode ${versionCode}`);
  updated = updated.replace(/\bversionName\s+"[^"]+"/, `versionName "${version}"`);
  fs.writeFileSync(gradle.path, updated, 'utf-8');
  return true;
}

async function verifyAgainstGitHubReleases(targetVersion, repo, token) {
  if (!repo) {
    console.log('[version-manager] GITHUB_REPOSITORY not set; skipping remote release check.');
    return;
  }
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'LovelyTalk-Release-Verifier',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`https://api.github.com/repos/${repo}/releases?per_page=50`, {
    headers,
  });

  if (res.status === 404) {
    console.log('[version-manager] No existing releases found (or private repo without token).');
    return;
  }
  if (!res.ok) {
    throw new Error(`GitHub Releases API check failed with HTTP ${res.status}`);
  }

  const releases = await res.json();
  const targetTag = `v${targetVersion}`;

  for (const rel of releases) {
    if (rel.tag_name === targetTag && !rel.draft) {
      throw new Error(
        `Duplicate release prevented: published GitHub Release "${targetTag}" already exists.`
      );
    }
  }

  const stableVersions = releases
    .filter((r) => !r.draft && !r.prerelease && typeof r.tag_name === 'string')
    .map((r) => r.tag_name.replace(/^v/, ''))
    .filter((v) => parseSemver(v) !== null);

  if (stableVersions.length > 0) {
    stableVersions.sort((a, b) => compareSemver(b, a));
    const latestPublished = stableVersions[0];
    const cmp = compareSemver(targetVersion, latestPublished);
    if (cmp <= 0) {
      throw new Error(
        `Downgrade or duplicate version blocked: target v${targetVersion} must be strictly greater than latest published v${latestPublished}.`
      );
    }
    console.log(
      `[version-manager] Remote check passed: v${targetVersion} > latest published v${latestPublished}.`
    );
  } else {
    console.log(`[version-manager] Remote check passed: v${targetVersion} is the first stable release.`);
  }
}

async function cmdVerify(args) {
  const versionManifest = readJson('version.json');
  const pkg = readJson('package.json');
  const lockPath = path.join(ROOT, 'package-lock.json');
  const lock = fs.existsSync(lockPath) ? readJson('package-lock.json') : null;
  const gradle = readGradleVersions();

  const { version, androidVersionCode } = versionManifest;
  if (!parseSemver(version)) {
    throw new Error(`version.json version "${version}" must follow strict SemVer (X.Y.Z).`);
  }

  const minCode = computeMinVersionCode(version);
  if (!Number.isInteger(androidVersionCode) || androidVersionCode < minCode) {
    throw new Error(
      `version.json androidVersionCode (${androidVersionCode}) must be an integer >= ${minCode} for v${version}.`
    );
  }

  if (pkg.version !== version) {
    throw new Error(`Version mismatch: package.json (${pkg.version}) !== version.json (${version}).`);
  }

  if (lock) {
    if (lock.version !== version || (lock.packages && lock.packages[''] && lock.packages[''].version !== version)) {
      throw new Error(
        `Version mismatch: package-lock.json (${lock.version}) !== version.json (${version}). Run "npm install --package-lock-only" or "npm run version:sync".`
      );
    }
  }

  if (gradle) {
    if (gradle.versionName !== version) {
      throw new Error(
        `Version mismatch: android/app/build.gradle versionName (${gradle.versionName}) !== version.json (${version}).`
      );
    }
    if (gradle.versionCode !== androidVersionCode) {
      throw new Error(
        `Version mismatch: android/app/build.gradle versionCode (${gradle.versionCode}) !== version.json (${androidVersionCode}).`
      );
    }
  }

  const tagIdx = args.indexOf('--tag');
  if (tagIdx !== -1 && args[tagIdx + 1]) {
    const rawTag = args[tagIdx + 1].trim();
    if (!rawTag.startsWith('v')) {
      throw new Error(`Release tag "${rawTag}" must start with "v" (e.g., v${version}).`);
    }
    const tagVersion = rawTag.slice(1);
    if (!parseSemver(tagVersion)) {
      throw new Error(`Release tag "${rawTag}" is not a stable SemVer tag (expected vX.Y.Z).`);
    }
    if (tagVersion !== version) {
      throw new Error(
        `Release tag mismatch: tag "${rawTag}" !== app version "v${version}". Release aborted.`
      );
    }
  }

  if (args.includes('--check-remote')) {
    await verifyAgainstGitHubReleases(
      version,
      process.env.GITHUB_REPOSITORY || versionManifest.githubRepo || '',
      process.env.GITHUB_TOKEN || ''
    );
  }

  console.log(
    `[version-manager] OK: version=${version}, androidVersionCode=${androidVersionCode}, appId=${versionManifest.appId}`
  );
}

function cmdSync() {
  const versionManifest = readJson('version.json');
  const { version, androidVersionCode } = versionManifest;
  if (!parseSemver(version)) {
    throw new Error(`Invalid SemVer in version.json: ${version}`);
  }

  const pkg = readJson('package.json');
  pkg.version = version;
  writeJson('package.json', pkg);

  const lockPath = path.join(ROOT, 'package-lock.json');
  if (fs.existsSync(lockPath)) {
    const lock = readJson('package-lock.json');
    lock.version = version;
    if (lock.packages && lock.packages['']) {
      lock.packages[''].version = version;
    }
    writeJson('package-lock.json', lock);
  }

  updateGradleVersions(version, androidVersionCode);
  console.log(`[version-manager] Synced all manifests to v${version} (versionCode ${androidVersionCode}).`);
}

function cmdBump(targetArg) {
  if (!targetArg) {
    throw new Error('Usage: node scripts/version-manager.mjs bump <patch|minor|major|X.Y.Z>');
  }

  const versionManifest = readJson('version.json');
  const current = parseSemver(versionManifest.version);
  if (!current) {
    throw new Error(`Current version in version.json is invalid: ${versionManifest.version}`);
  }

  let nextVersion;
  if (targetArg === 'patch') {
    nextVersion = `${current.major}.${current.minor}.${current.patch + 1}`;
  } else if (targetArg === 'minor') {
    nextVersion = `${current.major}.${current.minor + 1}.0`;
  } else if (targetArg === 'major') {
    nextVersion = `${current.major + 1}.0.0`;
  } else if (parseSemver(targetArg)) {
    if (compareSemver(targetArg, versionManifest.version) <= 0) {
      throw new Error(
        `Downgrade prevented: new version (${targetArg}) must be greater than current (${versionManifest.version}).`
      );
    }
    nextVersion = targetArg;
  } else {
    throw new Error(`Invalid bump target "${targetArg}". Expected patch, minor, major, or X.Y.Z.`);
  }

  const minNextCode = computeMinVersionCode(nextVersion);
  const nextVersionCode = Math.max(versionManifest.androidVersionCode + 1, minNextCode);

  versionManifest.version = nextVersion;
  versionManifest.androidVersionCode = nextVersionCode;
  writeJson('version.json', versionManifest);

  cmdSync();
  console.log(
    `[version-manager] Bumped to v${nextVersion} (androidVersionCode=${nextVersionCode}).`
  );
}

async function main() {
  const [cmd, ...args] = process.argv.slice(2);
  if (cmd === 'verify') {
    await cmdVerify(args);
  } else if (cmd === 'sync') {
    cmdSync();
  } else if (cmd === 'bump') {
    cmdBump(args[0]);
  } else {
    console.error(
      'Usage: node scripts/version-manager.mjs <verify [--tag vX.Y.Z] [--check-remote] | sync | bump <patch|minor|major|X.Y.Z>>'
    );
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(`[version-manager] ERROR: ${err.message}`);
  process.exit(1);
});
