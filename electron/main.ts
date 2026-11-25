import { app, BrowserWindow, net, protocol, shell } from 'electron';
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { setupDesktopUpdater } from './updater';

const APP_PROTOCOL = 'lovelytalk';
const APP_HOST = 'app';
const APP_ORIGIN = `${APP_PROTOCOL}://${APP_HOST}`;

// Ensure consistent userData directory & Windows AppUserModelId across updates
app.setName('LovelyTalk');
if (process.platform === 'win32') {
  app.setAppUserModelId('com.lovelytalk.app');
}

// Register privileged custom protocol for stable origin (IndexedDB persistence + Web Crypto)
protocol.registerSchemesAsPrivileged([
  {
    scheme: APP_PROTOCOL,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
]);

let mainWindow: BrowserWindow | null = null;

function resolveDistDir(): string {
  return path.join(app.getAppPath(), 'dist');
}

function registerStaticProtocol(): void {
  const distDir = resolveDistDir();

  protocol.handle(APP_PROTOCOL, (request) => {
    const reqUrl = new URL(request.url);
    let pathname = decodeURIComponent(reqUrl.pathname || '/');
    if (pathname === '/' || pathname === '') {
      pathname = '/index.html';
    }

    const relativePath = pathname.replace(/^\/+/, '');
    const candidatePath = path.resolve(distDir, relativePath);

    // Prevent directory traversal outside dist/
    const isInsideDist =
      candidatePath === distDir || candidatePath.startsWith(distDir + path.sep);

    if (isInsideDist && fs.existsSync(candidatePath) && fs.statSync(candidatePath).isFile()) {
      return net.fetch(pathToFileURL(candidatePath).toString());
    }

    // SPA fallback to index.html
    const fallbackIndex = path.join(distDir, 'index.html');
    return net.fetch(pathToFileURL(fallbackIndex).toString());
  });
}

function createMainWindow(): BrowserWindow {
  const iconPath = path.join(app.getAppPath(), 'build-resources', 'icon.png');

  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 420,
    minHeight: 620,
    title: '러비러비톡 (Lovely Talk)',
    backgroundColor: '#080515',
    autoHideMenuBar: true,
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      devTools: !app.isPackaged,
    },
  });

  // Restrict external navigation & popups for Electron security
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) {
      void shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  win.webContents.on('will-navigate', (event, targetUrl) => {
    if (!targetUrl.startsWith(APP_ORIGIN)) {
      event.preventDefault();
    }
  });

  void win.loadURL(`${APP_ORIGIN}/index.html`);

  win.on('closed', () => {
    if (mainWindow === win) {
      mainWindow = null;
    }
  });

  return win;
}

const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    registerStaticProtocol();
    setupDesktopUpdater(() => mainWindow);
    mainWindow = createMainWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        mainWindow = createMainWindow();
      }
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}
