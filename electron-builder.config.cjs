const fs = require('fs');
const path = require('path');

const versionManifest = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'version.json'), 'utf-8')
);

const repoSlug = process.env.GITHUB_REPOSITORY || versionManifest.githubRepo || '';
const [envOwner, envRepo] = repoSlug.includes('/') ? repoSlug.split('/') : ['', ''];

const owner = process.env.GH_OWNER || envOwner || 'OWNER_PLACEHOLDER';
const repo = process.env.GH_REPO || envRepo || 'lovely-talk';

/** @type {import('electron-builder').Configuration} */
module.exports = {
  appId: versionManifest.appId || 'com.lovelytalk.app',
  productName: versionManifest.productName || 'LovelyTalk',
  copyright: 'Copyright © Lovely Talk',
  directories: {
    output: 'release-windows',
    buildResources: 'build-resources',
  },
  files: [
    'dist/**/*',
    'dist-electron/**/*',
    'version.json',
    'package.json',
    '!**/node_modules/*/{CHANGELOG.md,README.md,README,readme.md,readme}',
    '!**/node_modules/*/{test,__tests__,tests,powered-test,example,examples}',
    '!**/node_modules/*.d.ts',
    '!**/*.map',
  ],
  asar: true,
  generateUpdatesFilesForAllChannels: false,
  publish: [
    {
      provider: 'github',
      owner,
      repo,
      releaseType: 'release',
    },
  ],
  win: {
    target: [
      {
        target: 'nsis',
        arch: ['x64'],
      },
    ],
    icon: 'build-resources/icon.ico',
    artifactName: 'LovelyTalk-Windows-Setup.exe',
  },
  nsis: {
    oneClick: false,
    perMachine: false,
    allowToChangeInstallationDirectory: true,
    deleteAppDataOnUninstall: false,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: '러비러비톡',
    installerIcon: 'build-resources/icon.ico',
    uninstallerIcon: 'build-resources/icon.ico',
    runAfterFinish: true,
  },
};
