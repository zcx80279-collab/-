/**
 * Platform Abstraction Layer (Web / Windows Electron / Android Capacitor)
 *
 * Per Section 1 & Section 9:
 * - Web environment is immediately verified in Google AI Studio.
 * - Electron (Windows EXE) and Capacitor (Android APK) extension hooks are structured cleanly
 *   without falsely claiming unverified native builds in Phase 1.
 */

export type RuntimePlatform = 'web' | 'electron-windows' | 'capacitor-android';

export interface PlatformStatus {
  currentRuntime: RuntimePlatform;
  webVerified: boolean;
  windowsElectronReadyForPackaging: boolean;
  androidCapacitorReadyForPackaging: boolean;
  nativeBuildStatusNote: string;
  updatePolicyNote: string;
}

export const platformService = {
  detectRuntime(): RuntimePlatform {
    if (typeof window !== 'undefined') {
      const ua = window.navigator.userAgent.toLowerCase();
      if (ua.includes('electron')) return 'electron-windows';
      if ((window as unknown as Record<string, unknown>).Capacitor) return 'capacitor-android';
    }
    return 'web';
  },

  getPlatformStatus(): PlatformStatus {
    return {
      currentRuntime: this.detectRuntime(),
      webVerified: true,
      windowsElectronReadyForPackaging: false,
      androidCapacitorReadyForPackaging: false,
      nativeBuildStatusNote:
        '1단계: 웹 애플리케이션 및 IndexedDB 로컬 구조 검증 완료. Windows(Electron EXE) 및 Android(Capacitor APK) 네이티브 패키징·서명 빌드는 미완료(후속 단계 진행) 상태입니다.',
      updatePolicyNote:
        '향후 Windows/Android 업데이트 확인 및 설치는 반드시 사용자 사전 동의를 거치며, 무동의 강제 업데이트나 임의 서명키 생성을 수행하지 않습니다.',
    };
  },
};
