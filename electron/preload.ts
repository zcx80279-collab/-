import { contextBridge, ipcRenderer } from 'electron';
import type { IpcRendererEvent } from 'electron';
import type { DesktopUpdateEvent } from './updater';

export interface LovelyDesktopBridge {
  getAppInfo: () => Promise<{
    version: string;
    platform: 'electron-windows';
    arch: string;
    isPackaged: boolean;
  }>;
  checkForUpdates: () => Promise<{
    ok: boolean;
    updateAvailable?: boolean;
    version?: string;
    error?: string;
  }>;
  downloadUpdate: () => Promise<{
    ok: boolean;
    error?: string;
  }>;
  installUpdate: () => Promise<{
    ok: boolean;
    error?: string;
  }>;
  onUpdateEvent: (listener: (event: DesktopUpdateEvent) => void) => () => void;
}

const api: LovelyDesktopBridge = {
  getAppInfo: () => ipcRenderer.invoke('lovely:get-app-info'),
  checkForUpdates: () => ipcRenderer.invoke('lovely:check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('lovely:download-update'),
  installUpdate: () => ipcRenderer.invoke('lovely:install-update'),
  onUpdateEvent: (listener) => {
    const handler = (_event: IpcRendererEvent, payload: DesktopUpdateEvent) => {
      listener(payload);
    };
    ipcRenderer.on('lovely:update-event', handler);
    return () => {
      ipcRenderer.removeListener('lovely:update-event', handler);
    };
  },
};

contextBridge.exposeInMainWorld('lovelyDesktop', api);
