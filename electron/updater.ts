import { app, BrowserWindow, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import type { ProgressInfo, UpdateInfo } from 'electron-updater';

export type DesktopUpdateEvent =
  | { type: 'checking' }
  | {
      type: 'available';
      version: string;
      releaseNotes: string;
      releaseDate?: string;
    }
  | { type: 'not-available'; version: string }
  | {
      type: 'progress';
      percent: number;
      bytesPerSecond: number;
      transferred: number;
      total: number;
    }
  | { type: 'downloaded'; version: string }
  | { type: 'error'; message: string };

function normalizeReleaseNotes(notes: UpdateInfo['releaseNotes']): string {
  if (!notes) return '';
  if (typeof notes === 'string') {
    return notes.replace(/<[^>]+>/g, '').trim();
  }
  if (Array.isArray(notes)) {
    return notes
      .map((entry) => {
        if (typeof entry === 'string') return entry;
        const body = (entry.note || '').replace(/<[^>]+>/g, '').trim();
        return entry.version ? `[v${entry.version}]\n${body}` : body;
      })
      .filter(Boolean)
      .join('\n\n');
  }
  return '';
}

export function setupDesktopUpdater(getMainWindow: () => BrowserWindow | null): void {
  // User consent policy: never auto-download or force-restart without explicit user approval
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;
  autoUpdater.allowPrerelease = false;
  autoUpdater.allowDowngrade = false;

  const emit = (event: DesktopUpdateEvent) => {
    const win = getMainWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send('lovely:update-event', event);
    }
  };

  autoUpdater.on('checking-for-update', () => {
    emit({ type: 'checking' });
  });

  autoUpdater.on('update-available', (info: UpdateInfo) => {
    emit({
      type: 'available',
      version: info.version,
      releaseNotes: normalizeReleaseNotes(info.releaseNotes),
      releaseDate: info.releaseDate,
    });
  });

  autoUpdater.on('update-not-available', (info: UpdateInfo) => {
    emit({
      type: 'not-available',
      version: info.version || app.getVersion(),
    });
  });

  autoUpdater.on('download-progress', (progress: ProgressInfo) => {
    emit({
      type: 'progress',
      percent: Math.round(progress.percent * 10) / 10,
      bytesPerSecond: progress.bytesPerSecond,
      transferred: progress.transferred,
      total: progress.total,
    });
  });

  autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
    emit({
      type: 'downloaded',
      version: info.version,
    });
  });

  autoUpdater.on('error', (err: Error) => {
    emit({
      type: 'error',
      message: err?.message || '업데이트 확인 또는 다운로드 중 오류가 발생했습니다.',
    });
  });

  ipcMain.handle('lovely:get-app-info', () => ({
    version: app.getVersion(),
    platform: 'electron-windows',
    arch: process.arch,
    isPackaged: app.isPackaged,
  }));

  ipcMain.handle('lovely:check-for-updates', async () => {
    if (!app.isPackaged) {
      return {
        ok: false,
        error: '개발 모드에서는 정식 설치 버전의 자동 업데이트를 실행할 수 없습니다.',
      };
    }
    try {
      const result = await autoUpdater.checkForUpdates();
      return {
        ok: true,
        updateAvailable: Boolean(result?.updateInfo && result.updateInfo.version !== app.getVersion()),
        version: result?.updateInfo?.version || app.getVersion(),
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : '업데이트 서버 연결에 실패했습니다.';
      return { ok: false, error: message };
    }
  });

  ipcMain.handle('lovely:download-update', async () => {
    if (!app.isPackaged) {
      return { ok: false, error: '패키징된 설치 앱에서만 업데이트를 다운로드할 수 있습니다.' };
    }
    try {
      await autoUpdater.downloadUpdate();
      return { ok: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : '업데이트 다운로드에 실패했습니다.';
      return { ok: false, error: message };
    }
  });

  ipcMain.handle('lovely:install-update', () => {
    if (!app.isPackaged) {
      return { ok: false, error: '패키징된 설치 앱에서만 설치를 적용할 수 있습니다.' };
    }
    // User explicitly confirmed installation and restart
    setImmediate(() => {
      autoUpdater.quitAndInstall(false, true);
    });
    return { ok: true };
  });
}
