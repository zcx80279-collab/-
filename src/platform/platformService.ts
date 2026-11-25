/**
 * Platform Abstraction Layer (Web / Windows Electron / Android Capacitor)
 *
 * Detects the active runtime cleanly so installable-app-only features
 * (such as native auto-updates) NEVER execute on the Web version.
 */
import { Capacitor } from '@capacitor/core';
import { APP_ID, APP_VERSION } from '../version';

export type RuntimePlatform = 'web' | 'electron-windows' | 'capacitor-android';

export interface PlatformStatus {
  currentRuntime: RuntimePlatform;
  appVersion: string;
  appId: string;
  isInstallableApp: boolean;
  webVerified: boolean;
  windowsElectronReadyForPackaging: boolean;
  androidCapacitorReadyForPackaging: boolean;
  nativeBuildStatusNote: string;
  updatePolicyNote: string;
}

export const platformService = {
  detectRuntime(): RuntimePlatform {
    if (typeof window !== 'undefined') {
      const win = window as unknown as Record<string, unknown>;
      if (win.lovelyDesktop) {
        return 'electron-windows';
      }
      const ua = window.navigator.userAgent.toLowerCase();
      if (ua.includes('electron')) {
        return 'electron-windows';
      }
      try {
        if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
          return 'capacitor-android';
        }
      } catch {
        // Fallback check if Capacitor bridge is unavailable
      }
      if (win.Capacitor && (win.Capacitor as { isNativePlatform?: () => boolean }).isNativePlatform?.()) {
        return 'capacitor-android';
      }
    }
    return 'web';
  },

  isNativeInstallableApp(): boolean {
    const runtime = this.detectRuntime();
    return runtime === 'electron-windows' || runtime === 'capacitor-android';
  },

  getPlatformLabel(runtime?: RuntimePlatform): string {
    const resolved = runtime ?? this.detectRuntime();
    if (resolved === 'electron-windows') return 'Windows 설치형 앱 (Electron)';
    if (resolved === 'capacitor-android') return 'Android 설치형 앱 (Capacitor)';
    return '웹 버전 (Browser)';
  },

  getPlatformStatus(): PlatformStatus {
    const currentRuntime = this.detectRuntime();
    return {
      currentRuntime,
      appVersion: APP_VERSION,
      appId: APP_ID,
      isInstallableApp: currentRuntime !== 'web',
      webVerified: true,
      windowsElectronReadyForPackaging: true,
      androidCapacitorReadyForPackaging: true,
      nativeBuildStatusNote:
        `현재 실행 환경: ${this.getPlatformLabel(currentRuntime)} (v${APP_VERSION}, App ID: ${APP_ID}). 웹 버전 유지 및 Windows(Electron NSIS EXE) · Android(Capacitor APK) 패키징·자동 업데이트 구성이 적용되었습니다.`,
      updatePolicyNote:
        'Windows 및 Android 설치형 앱에서만 GitHub Releases 정식 버전을 확인하며, 모든 업데이트 다운로드·설치는 사용자 승인 후 기존 데이터를 유지한 채 진행됩니다. 웹 버전에서는 설치형 업데이트가 실행되지 않습니다.',
    };
  },
};
