import { build } from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

async function main() {
  const outDir = path.join(ROOT, 'dist-electron');
  fs.mkdirSync(outDir, { recursive: true });

  const commonOptions = {
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node20',
    sourcemap: false,
    external: ['electron', 'electron-updater'],
  };

  await Promise.all([
    build({
      ...commonOptions,
      entryPoints: [path.join(ROOT, 'electron', 'main.ts')],
      outfile: path.join(outDir, 'main.cjs'),
    }),
    build({
      ...commonOptions,
      entryPoints: [path.join(ROOT, 'electron', 'preload.ts')],
      outfile: path.join(outDir, 'preload.cjs'),
    }),
  ]);

  console.log('[build-electron] Built dist-electron/main.cjs and dist-electron/preload.cjs');
}

main().catch((err) => {
  console.error('[build-electron] Build failed:', err);
  process.exit(1);
});
