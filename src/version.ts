import versionManifest from '../version.json';

export const APP_VERSION: string = versionManifest.version;
export const ANDROID_VERSION_CODE: number = versionManifest.androidVersionCode;
export const APP_ID: string = versionManifest.appId;
export const APP_NAME: string = versionManifest.appName;
export const PRODUCT_NAME: string = versionManifest.productName;

export const GITHUB_REPO: string = (
  import.meta.env.VITE_GITHUB_REPO ||
  versionManifest.githubRepo ||
  ''
).trim();

const SEMVER_RE = /^v?(\d+)\.(\d+)\.(\d+)$/;

export function parseSemver(version: string): { major: number; minor: number; patch: number } | null {
  const m = String(version || '').trim().match(SEMVER_RE);
  if (!m) return null;
  return {
    major: Number(m[1]),
    minor: Number(m[2]),
    patch: Number(m[3]),
  };
}

/**
 * Compares two strict SemVer strings (e.g. "1.1.0" vs "1.0.0").
 * Returns > 0 if a > b, < 0 if a < b, 0 if equal.
 */
export function compareSemver(a: string, b: string): number {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  if (!pa || !pb) return 0;
  if (pa.major !== pb.major) return pa.major - pb.major;
  if (pa.minor !== pb.minor) return pa.minor - pb.minor;
  return pa.patch - pb.patch;
}
