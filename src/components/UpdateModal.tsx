import React from 'react';
import {
  Download,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  Settings,
  CheckCircle2,
  X,
} from 'lucide-react';
import { UpdateState, updateService } from '../platform/updateService';

interface UpdateModalProps {
  state: UpdateState;
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({ state }) => {
  if (!state.supported || !state.modalOpen || !state.info) {
    return null;
  }

  const { phase, info, progress, errorMessage, statusMessage, platform } = state;
  const isDownloading = phase === 'downloading';

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lovely-update-title"
    >
      <div className="w-full max-w-md p-6 rounded-2xl bg-slate-900 border-2 border-pink-500/50 space-y-5 shadow-2xl text-slate-100">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-pink-500/20 text-pink-300 text-xs font-semibold">
              <Download size={13} />
              <span>정식 버전 업데이트</span>
            </div>
            <h3 id="lovely-update-title" className="text-lg font-extrabold text-white">
              새 업데이트가 있습니다!
            </h3>
          </div>

          {!isDownloading && (
            <button
              type="button"
              onClick={() => updateService.dismissModal()}
              aria-label="닫기"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Version Comparison */}
        <div className="p-3.5 rounded-xl bg-slate-950 border border-indigo-500/30 space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">현재 버전</span>
            <span className="font-mono font-semibold text-slate-200">
              v{info.currentVersion}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">최신 버전</span>
            <span className="font-mono font-bold text-pink-300">
              v{info.latestVersion}
            </span>
          </div>
        </div>

        {/* Release Notes */}
        {info.releaseNotes && (
          <div className="space-y-1.5">
            <div className="text-xs font-semibold text-slate-300">변경 사항</div>
            <div className="max-h-36 overflow-y-auto p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
              {info.releaseNotes}
            </div>
          </div>
        )}

        {/* Download Progress */}
        {phase === 'downloading' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-indigo-200 font-medium">다운로드 진행 중...</span>
              <span className="font-mono font-bold text-pink-300">
                {progress?.percent ?? 0}%
              </span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-pink-500 transition-all duration-200"
                style={{ width: `${Math.max(2, progress?.percent ?? 0)}%` }}
              />
            </div>
            {progress && progress.total > 0 && (
              <div className="text-[11px] text-slate-400 text-right font-mono">
                {formatBytes(progress.transferred)} / {formatBytes(progress.total)}
              </div>
            )}
          </div>
        )}

        {/* Android Unknown Sources Permission Guidance (ONLY when needed) */}
        {phase === 'permission-required' && (
          <div className="p-3.5 rounded-xl bg-amber-950/60 border border-amber-500/40 space-y-2 text-xs text-amber-100">
            <div className="flex items-center gap-1.5 font-bold text-amber-300">
              <Settings size={14} />
              <span>알 수 없는 앱 설치 권한 안내</span>
            </div>
            <p className="leading-relaxed">
              다운로드 및 무결성(SHA-256) 검증이 완료되었습니다. Android에서 업데이트를 설치하려면
              러비러비톡의 「알 수 없는 앱 설치」 권한을 한 번 허용해 주세요.
            </p>
          </div>
        )}

        {/* Downloaded / Installing Info */}
        {(phase === 'downloaded' || phase === 'installing') && (
          <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 space-y-1.5 text-xs text-emerald-100">
            <div className="flex items-center gap-1.5 font-bold text-emerald-300">
              <CheckCircle2 size={14} />
              <span>
                {phase === 'downloaded' ? '다운로드 완료' : '설치 진행 중'}
              </span>
            </div>
            <p className="leading-relaxed">
              {statusMessage ||
                '설치가 완료되면 기존 채팅 기록과 캐릭터 설정을 유지한 채 최신 버전으로 실행됩니다.'}
            </p>
          </div>
        )}

        {/* Error State */}
        {phase === 'error' && errorMessage && (
          <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-500/40 space-y-1.5 text-xs text-red-100">
            <div className="flex items-center gap-1.5 font-bold text-red-300">
              <AlertTriangle size={14} />
              <span>업데이트 오류</span>
            </div>
            <p className="leading-relaxed">{errorMessage}</p>
            <p className="text-[11px] text-red-200/80">
              다시 시도하거나 나중에 업데이트하셔도 기존 앱은 정상 작동합니다.
            </p>
          </div>
        )}

        {/* Data Preservation Guarantee */}
        <div className="flex items-center gap-1.5 text-[11px] text-emerald-300/90">
          <ShieldCheck size={13} className="shrink-0" />
          <span>업데이트 후에도 기존 채팅 기록, 캐릭터, 나의 분신 데이터는 그대로 유지됩니다.</span>
        </div>

        {/* Action Buttons */}
        <div className="pt-1 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
          {phase === 'available' && (
            <>
              <button
                type="button"
                onClick={() => updateService.dismissModal()}
                className="min-h-[42px] px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 cursor-pointer"
              >
                나중에
              </button>
              <button
                type="button"
                onClick={() => void updateService.startDownload()}
                className="min-h-[42px] px-5 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-xs font-bold text-white shadow-lg shadow-pink-600/30 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Download size={14} />
                <span>업데이트</span>
              </button>
            </>
          )}

          {phase === 'downloading' && (
            <button
              type="button"
              disabled
              className="min-h-[42px] px-5 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-400 cursor-not-allowed"
            >
              다운로드 진행 중...
            </button>
          )}

          {phase === 'downloaded' && platform === 'electron-windows' && (
            <>
              <button
                type="button"
                onClick={() => updateService.dismissModal()}
                className="min-h-[42px] px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 cursor-pointer"
              >
                나중에
              </button>
              <button
                type="button"
                onClick={() => void updateService.installDownloadedUpdate()}
                className="min-h-[42px] px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-lg shadow-emerald-600/30 cursor-pointer"
              >
                지금 설치 및 재시작
              </button>
            </>
          )}

          {phase === 'permission-required' && platform === 'capacitor-android' && (
            <>
              <button
                type="button"
                onClick={() => void updateService.openAndroidInstallPermissionSettings()}
                className="min-h-[42px] px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-xs font-bold text-white cursor-pointer"
              >
                권한 설정 열기
              </button>
              <button
                type="button"
                onClick={() => void updateService.installDownloadedUpdate()}
                className="min-h-[42px] px-5 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-xs font-bold text-white cursor-pointer"
              >
                권한 허용 후 설치 진행
              </button>
            </>
          )}

          {phase === 'installing' && (
            <button
              type="button"
              onClick={() => updateService.dismissModal()}
              className="min-h-[42px] px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 cursor-pointer"
            >
              닫기
            </button>
          )}

          {phase === 'error' && (
            <>
              <button
                type="button"
                onClick={() => updateService.dismissModal()}
                className="min-h-[42px] px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 cursor-pointer"
              >
                나중에
              </button>
              <button
                type="button"
                onClick={() => void updateService.startDownload()}
                className="min-h-[42px] px-5 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-xs font-bold text-white cursor-pointer flex items-center justify-center gap-1.5"
              >
                <RefreshCw size={14} />
                <span>다시 시도</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
