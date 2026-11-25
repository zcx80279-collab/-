import { registerPlugin } from '@capacitor/core';
import type { PluginListenerHandle } from '@capacitor/core';
import { platformService, RuntimePlatform } from './platformService';
import {
  ANDROID_VERSION_CODE,
  APP_VERSION,
  GITHUB_REPO,
  compareSemver,
  parseSemver,
} from '../version';

export type UpdatePhase =
  | 'idle'
  | 'checking'
  | 'up-to-date'
  | 'available'
  | 'downloading'
  | 'downloaded'
  | 'permission-required'
  | 'installing'
  | 'error';

export interface UpdateMetadata {
  currentVersion: string;
  latestVersion: string;
  releaseNotes: string;
  publishedAt?: string;
  apkUrl?: string;
  apkSha256?: string;
  apkFilePath?: string;
  latestVersionCode?: number;
}

export interface UpdateProgress {
  percent: number;
  transferred: number;
  total: number;
}

export interface UpdateState {
  supported: boolean;
  platform: RuntimePlatform;
  phase: UpdatePhase;
  modalOpen: boolean;
  info: UpdateMetadata | null;
  progress: UpdateProgress | null;
  errorMessage: string | null;
  statusMessage: string | null;
  lastCheckedAt: number | null;
}

interface DesktopUpdateEvent {
  type: 'checking' | 'available' | 'not-available' | 'progress' | 'downloaded' | 'error';
  version?: string;
  releaseNotes?: string;
  releaseDate?: string;
  percent?: number;
  bytesPerSecond?: number;
  transferred?: number;
  total?: number;
  message?: string;
}

interface LovelyDesktopBridge {
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
  downloadUpdate: () => Promise<{ ok: boolean; error?: string }>;
  installUpdate: () => Promise<{ ok: boolean; error?: string }>;
  onUpdateEvent: (listener: (event: DesktopUpdateEvent) => void) => () => void;
}

interface AndroidAppUpdaterPlugin {
  getAppInfo(): Promise<{
    versionName: string;
    versionCode: number;
    packageName: string;
  }>;
  canInstallPackages(): Promise<{ granted: boolean }>;
  openInstallPermissionSettings(): Promise<void>;
  downloadAndInstallApk(options: {
    url: string;
    sha256: string;
    version: string;
  }): Promise<{
    status: 'installer_launched' | 'permission_required';
    filePath: string;
  }>;
  installDownloadedApk(options: { filePath: string }): Promise<{
    status: 'installer_launched' | 'permission_required';
  }>;
  addListener(
    eventName: 'downloadProgress',
    listenerFunc: (data: {
      percent: number;
      downloadedBytes: number;
      totalBytes: number;
    }) => void
  ): Promise<PluginListenerHandle>;
}

interface AndroidLatestJson {
  version: string;
  versionCode: number;
  apkFileName: string;
  apkUrl?: string;
  sha256: string;
  releaseNotes?: string;
  prerelease?: boolean;
  publishedAt?: string;
}

interface GitHubReleaseAsset {
  name: string;
  browser_download_url: string;
}

interface GitHubReleaseResponse {
  tag_name: string;
  draft: boolean;
  prerelease: boolean;
  body?: string;
  published_at?: string;
  assets?: GitHubReleaseAsset[];
}

const AndroidAppUpdater = registerPlugin<AndroidAppUpdaterPlugin>('AppUpdater');

function getDesktopBridge(): LovelyDesktopBridge | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { lovelyDesktop?: LovelyDesktopBridge };
  return w.lovelyDesktop ?? null;
}

type Listener = (state: UpdateState) => void;

class AppUpdateService {
  private state: UpdateState;
  private listeners = new Set<Listener>();
  private desktopUnsubscribe: (() => void) | null = null;
  private androidProgressHandle: PluginListenerHandle | null = null;
  private silentCheckActive = false;
  private installedVersion = APP_VERSION;
  private installedVersionCode = ANDROID_VERSION_CODE;
  private initialized = false;

  constructor() {
    const platform = platformService.detectRuntime();
    this.state = {
      supported: platform !== 'web',
      platform,
      phase: 'idle',
      modalOpen: false,
      info: null,
      progress: null,
      errorMessage: null,
      statusMessage: null,
      lastCheckedAt: null,
    };
  }

  getState(): UpdateState {
    return this.state;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private setState(patch: Partial<UpdateState>): void {
    this.state = { ...this.state, ...patch };
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    const platform = platformService.detectRuntime();
    if (platform === 'web') {
      this.setState({ supported: false, platform: 'web' });
      return;
    }

    if (platform === 'electron-windows') {
      const bridge = getDesktopBridge();
      if (!bridge) return;
      try {
        const info = await bridge.getAppInfo();
        if (info?.version) {
          this.installedVersion = info.version;
        }
      } catch {
        // Fallback to APP_VERSION
      }

      this.desktopUnsubscribe = bridge.onUpdateEvent((event) => {
        this.handleDesktopEvent(event);
      });
    } else if (platform === 'capacitor-android') {
      try {
        const info = await AndroidAppUpdater.getAppInfo();
        if (info?.versionName) this.installedVersion = info.versionName;
        if (typeof info?.versionCode === 'number') this.installedVersionCode = info.versionCode;
      } catch {
        // Fallback to compiled APP_VERSION / ANDROID_VERSION_CODE
      }

      try {
        this.androidProgressHandle = await AndroidAppUpdater.addListener(
          'downloadProgress',
          (data) => {
            this.setState({
              phase: 'downloading',
              progress: {
                percent: Math.max(0, Math.min(100, Math.round(data.percent))),
                transferred: data.downloadedBytes || 0,
                total: data.totalBytes || 0,
              },
            });
          }
        );
      } catch {
        // Progress listener unavailable outside native Android runtime
      }
    }
  }

  private handleDesktopEvent(event: DesktopUpdateEvent): void {
    switch (event.type) {
      case 'checking':
        this.setState({
          phase: 'checking',
          errorMessage: null,
          statusMessage: '최신 정식 버전을 확인하고 있습니다...',
        });
        break;
      case 'available': {
        const latest = event.version || '';
        // Safety check against accidental downgrade or same-version notice
        if (!parseSemver(latest) || compareSemver(latest, this.installedVersion) <= 0) {
          this.setState({
            phase: 'up-to-date',
            lastCheckedAt: Date.now(),
            statusMessage: `현재 최신 버전(v${this.installedVersion})을 사용 중입니다.`,
          });
          return;
        }
        this.setState({
          phase: 'available',
          modalOpen: true,
          lastCheckedAt: Date.now(),
          errorMessage: null,
          statusMessage: `새 버전 v${latest}이(가) 준비되었습니다.`,
          info: {
            currentVersion: this.installedVersion,
            latestVersion: latest,
            releaseNotes:
              event.releaseNotes?.trim() ||
              '새로운 기능 개선 및 안정성 업데이트가 포함되어 있습니다.',
            publishedAt: event.releaseDate,
          },
        });
        break;
      }
      case 'not-available':
        this.setState({
          phase: 'up-to-date',
          lastCheckedAt: Date.now(),
          errorMessage: null,
          statusMessage: `현재 최신 버전(v${this.installedVersion})을 사용 중입니다.`,
        });
        break;
      case 'progress':
        this.setState({
          phase: 'downloading',
          modalOpen: true,
          progress: {
            percent: Math.max(0, Math.min(100, Math.round(event.percent ?? 0))),
            transferred: event.transferred ?? 0,
            total: event.total ?? 0,
          },
        });
        break;
      case 'downloaded':
        this.setState({
          phase: 'downloaded',
          modalOpen: true,
          progress: {
            percent: 100,
            transferred: this.state.progress?.total ?? 0,
            total: this.state.progress?.total ?? 0,
          },
          errorMessage: null,
          statusMessage: '다운로드가 완료되었습니다. 설치 및 재시작을 진행해 주세요.',
        });
        break;
      case 'error':
        this.setState({
          phase: this.silentCheckActive ? 'idle' : 'error',
          modalOpen: this.state.modalOpen && !this.silentCheckActive,
          errorMessage: this.silentCheckActive
            ? null
            : event.message || '업데이트 처리 중 오류가 발생했습니다.',
          statusMessage: this.silentCheckActive
            ? null
            : '네트워크 오류 또는 업데이트 서버 연결 실패가 발생했습니다. 기존 앱은 계속 정상 이용할 수 있습니다.',
        });
        break;
    }
  }

  getInstalledVersion(): string {
    return this.installedVersion;
  }

  dismissModal(): void {
    this.setState({ modalOpen: false });
  }

  reopenModal(): void {
    if (this.state.info) {
      this.setState({ modalOpen: true });
    }
  }

  /**
   * Checks for a newer stable GitHub Release on installed Windows / Android apps.
   * Never executes on Web. Network failures never disrupt normal app usage.
   */
  async checkForUpdates(options: { silent?: boolean } = {}): Promise<void> {
    const platform = platformService.detectRuntime();
    if (platform === 'web') {
      return;
    }

    await this.initialize();
    const silent = Boolean(options.silent);
    this.silentCheckActive = silent;

    this.setState({
      phase: 'checking',
      errorMessage: null,
      statusMessage: silent ? null : '최신 정식 버전을 확인하고 있습니다...',
    });

    if (platform === 'electron-windows') {
      const bridge = getDesktopBridge();
      if (!bridge) {
        this.setState({
          phase: silent ? 'idle' : 'error',
          errorMessage: silent ? null : '데스크톱 업데이트 브리지를 찾을 수 없습니다.',
        });
        return;
      }
      const res = await bridge.checkForUpdates();
      if (!res.ok) {
        this.setState({
          phase: silent ? 'idle' : 'error',
          lastCheckedAt: Date.now(),
          errorMessage: silent ? null : res.error || '업데이트 확인에 실패했습니다.',
          statusMessage: silent
            ? null
            : '네트워크 상태를 확인한 후 다시 시도해 주세요. 기존 앱은 정상 사용할 수 있습니다.',
        });
      }
      return;
    }

    if (platform === 'capacitor-android') {
      await this.checkAndroidRelease(silent);
    }
  }

  private async checkAndroidRelease(silent: boolean): Promise<void> {
    if (!GITHUB_REPO) {
      this.setState({
        phase: silent ? 'idle' : 'error',
        lastCheckedAt: Date.now(),
        errorMessage: silent
          ? null
          : 'GitHub 저장소 정보가 설정되지 않아 업데이트를 확인할 수 없습니다.',
      });
      return;
    }

    try {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 12000);

      // GitHub /releases/latest returns ONLY the latest non-draft, non-prerelease release
      const releaseRes = await fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`,
        {
          headers: { Accept: 'application/vnd.github+json' },
          signal: controller.signal,
        }
      );
      window.clearTimeout(timeoutId);

      if (releaseRes.status === 404) {
        this.setState({
          phase: 'up-to-date',
          lastCheckedAt: Date.now(),
          statusMessage: `현재 등록된 정식 업데이트가 없습니다 (현재 v${this.installedVersion}).`,
        });
        return;
      }

      if (!releaseRes.ok) {
        throw new Error(`업데이트 서버 응답 오류 (HTTP ${releaseRes.status})`);
      }

      const release = (await releaseRes.json()) as GitHubReleaseResponse;

      // Strictly ignore drafts and pre-releases
      if (release.draft || release.prerelease) {
        this.setState({
          phase: 'up-to-date',
          lastCheckedAt: Date.now(),
          statusMessage: `현재 최신 정식 버전(v${this.installedVersion})을 사용 중입니다.`,
        });
        return;
      }

      const assets = release.assets || [];
      const metaAsset = assets.find((a) => a.name === 'android-latest.json');
      const apkAsset = assets.find((a) => a.name === 'LovelyTalk-Android.apk');

      if (!metaAsset || !apkAsset) {
        throw new Error('최신 릴리스에 Android 업데이트 메타데이터 또는 APK가 아직 준비되지 않았습니다.');
      }

      const metaRes = await fetch(metaAsset.browser_download_url, {
        cache: 'no-store',
      });
      if (!metaRes.ok) {
        throw new Error(`버전 정보(android-latest.json) 다운로드 실패 (HTTP ${metaRes.status})`);
      }

      const meta = (await metaRes.json()) as AndroidLatestJson;

      if (meta.prerelease) {
        this.setState({
          phase: 'up-to-date',
          lastCheckedAt: Date.now(),
          statusMessage: `현재 최신 정식 버전(v${this.installedVersion})을 사용 중입니다.`,
        });
        return;
      }

      const latestVer = String(meta.version || release.tag_name.replace(/^v/, '')).trim();
      const semverDiff = compareSemver(latestVer, this.installedVersion);
      const codeHigher =
        typeof meta.versionCode === 'number'
          ? meta.versionCode > this.installedVersionCode
          : semverDiff > 0;

      if (semverDiff > 0 && codeHigher) {
        this.setState({
          phase: 'available',
          modalOpen: true,
          lastCheckedAt: Date.now(),
          errorMessage: null,
          statusMessage: `새 버전 v${latestVer} 업데이트가 가능합니다.`,
          info: {
            currentVersion: this.installedVersion,
            latestVersion: latestVer,
            latestVersionCode: meta.versionCode,
            releaseNotes:
              meta.releaseNotes?.trim() ||
              release.body?.trim() ||
              '새로운 기능 개선 및 안정성 업데이트가 포함되어 있습니다.',
            publishedAt: meta.publishedAt || release.published_at,
            apkUrl: apkAsset.browser_download_url || meta.apkUrl,
            apkSha256: meta.sha256,
          },
        });
      } else {
        this.setState({
          phase: 'up-to-date',
          lastCheckedAt: Date.now(),
          errorMessage: null,
          statusMessage: `현재 최신 버전(v${this.installedVersion})을 사용 중입니다.`,
        });
      }
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.name === 'AbortError'
            ? '업데이트 서버 응답 시간이 초과되었습니다.'
            : err.message
          : '네트워크 오류로 업데이트를 확인할 수 없습니다.';

      // Silent check must never interrupt normal app usage
      this.setState({
        phase: silent ? 'idle' : 'error',
        lastCheckedAt: Date.now(),
        errorMessage: silent ? null : msg,
        statusMessage: silent
          ? null
          : '네트워크 오류가 발생해도 기존 러비러비톡 앱은 정상적으로 이용할 수 있습니다.',
      });
    }
  }

  /**
   * Starts downloading the update (called only after user clicks [업데이트] or [다시 시도]).
   */
  async startDownload(): Promise<void> {
    const platform = platformService.detectRuntime();
    if (platform === 'web') return;

    this.silentCheckActive = false;
    this.setState({
      phase: 'downloading',
      modalOpen: true,
      errorMessage: null,
      progress: { percent: 0, transferred: 0, total: 0 },
      statusMessage: '업데이트 설치 파일을 다운로드하는 중입니다...',
    });

    if (platform === 'electron-windows') {
      const bridge = getDesktopBridge();
      if (!bridge) {
        this.setState({
          phase: 'error',
          errorMessage: '데스크톱 업데이터에 연결할 수 없습니다.',
        });
        return;
      }
      const res = await bridge.downloadUpdate();
      if (!res.ok) {
        this.setState({
          phase: 'error',
          errorMessage: res.error || '업데이트 다운로드에 실패했습니다.',
        });
      }
      return;
    }

    if (platform === 'capacitor-android') {
      const info = this.state.info;
      if (!info?.apkUrl || !info?.apkSha256) {
        this.setState({
          phase: 'error',
          errorMessage: 'APK 다운로드 주소 또는 무결성 해시(SHA-256) 정보가 누락되었습니다.',
        });
        return;
      }

      try {
        const result = await AndroidAppUpdater.downloadAndInstallApk({
          url: info.apkUrl,
          sha256: info.apkSha256,
          version: info.latestVersion,
        });

        if (result.status === 'permission_required') {
          this.setState({
            phase: 'permission-required',
            modalOpen: true,
            info: { ...info, apkFilePath: result.filePath },
            progress: { percent: 100, transferred: 0, total: 0 },
            statusMessage:
              'APK 다운로드 및 무결성 검증이 완료되었습니다. 설치를 위해 "알 수 없는 앱 설치" 권한을 허용해 주세요.',
          });
        } else {
          this.setState({
            phase: 'installing',
            modalOpen: true,
            info: { ...info, apkFilePath: result.filePath },
            progress: { percent: 100, transferred: 0, total: 0 },
            statusMessage:
              'Android 시스템 설치 화면을 열었습니다. 안내에 따라 업데이트를 승인해 주세요. 기존 데이터는 유지됩니다.',
          });
        }
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'APK 다운로드 또는 무결성 검증에 실패했습니다.';
        this.setState({
          phase: 'error',
          modalOpen: true,
          errorMessage: message,
        });
      }
    }
  }

  /**
   * Opens Android "Install Unknown Apps" settings screen ONLY when permission is required.
   */
  async openAndroidInstallPermissionSettings(): Promise<void> {
    if (platformService.detectRuntime() !== 'capacitor-android') return;
    try {
      await AndroidAppUpdater.openInstallPermissionSettings();
    } catch (err) {
      this.setState({
        phase: 'error',
        errorMessage:
          err instanceof Error ? err.message : '권한 설정 화면을 열 수 없습니다.',
      });
    }
  }

  /**
   * Triggers installation after user confirms (Windows quitAndInstall or Android retry after permission).
   */
  async installDownloadedUpdate(): Promise<void> {
    const platform = platformService.detectRuntime();
    if (platform === 'electron-windows') {
      const bridge = getDesktopBridge();
      if (!bridge) return;
      this.setState({
        phase: 'installing',
        statusMessage: '업데이트 설치를 위해 앱을 재시작합니다...',
      });
      await bridge.installUpdate();
      return;
    }

    if (platform === 'capacitor-android') {
      const filePath = this.state.info?.apkFilePath;
      if (!filePath) {
        await this.startDownload();
        return;
      }
      try {
        const res = await AndroidAppUpdater.installDownloadedApk({ filePath });
        if (res.status === 'permission_required') {
          this.setState({
            phase: 'permission-required',
            statusMessage:
              '아직 "알 수 없는 앱 설치" 권한이 허용되지 않았습니다. 권한을 켠 뒤 다시 눌러 주세요.',
          });
        } else {
          this.setState({
            phase: 'installing',
            statusMessage:
              'Android 시스템 설치 화면을 열었습니다. 업데이트 승인 후 앱이 최신 버전으로 갱신됩니다.',
          });
        }
      } catch (err) {
        this.setState({
          phase: 'error',
          errorMessage:
            err instanceof Error ? err.message : 'APK 설치 화면을 실행하지 못했습니다.',
        });
      }
    }
  }

  destroy(): void {
    this.desktopUnsubscribe?.();
    this.desktopUnsubscribe = null;
    void this.androidProgressHandle?.remove();
    this.androidProgressHandle = null;
  }
}

export const updateService = new AppUpdateService();
