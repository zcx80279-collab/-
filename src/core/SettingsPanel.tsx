import React, { useState } from 'react';
import { AppSettings } from '../core/types';
import { storageService } from '../storage/storageService';
import { platformService } from '../platform/platformService';
import { aiService } from '../ai/aiService';
import {
  Settings,
  Database,
  CloudOff,
  Download,
  Cpu,
  Smartphone,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

interface SettingsPanelProps {
  appSettings: AppSettings;
  onSettingsUpdated: (updated: AppSettings) => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  appSettings,
  onSettingsUpdated,
}) => {
  const [soundEnabled, setSoundEnabled] = useState(appSettings.soundEnabled);
  const [aiImageGen, setAiImageGen] = useState(appSettings.aiImageGenerationEnabled);
  const [statusNote, setStatusNote] = useState<string | null>(null);

  const platformStatus = platformService.getPlatformStatus();
  const aiStatus = aiService.getLayerStatus();

  const handleToggleSetting = async (
    key: 'soundEnabled' | 'aiImageGenerationEnabled',
    val: boolean
  ) => {
    if (key === 'soundEnabled') setSoundEnabled(val);
    if (key === 'aiImageGenerationEnabled') setAiImageGen(val);

    const saved = await storageService.saveAppSettings({ [key]: val });
    onSettingsUpdated(saved);
    setStatusNote('환경설정이 IndexedDB "settings" 스토어에 즉시 저장되었습니다.');
  };

  const handleExportLocalSnapshot = async () => {
    const json = await storageService.exportSnapshotJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lovy_lovy_talk_snapshot_v${appSettings.schemaVersion}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatusNote('로컬 데이터베이스 스냅샷 JSON 파일을 내보냈습니다.');
  };

  return (
    <div className="flex flex-col h-full bg-slate-950/75 text-slate-100 overflow-y-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="border-b border-indigo-500/30 pb-4">
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <Settings size={20} className="text-pink-400" />
          <span>앱 환경설정 및 플랫폼·백업 구조</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          IndexedDB 로컬 데이터 보호, 향후 AI 기능 스위치, 백업 확장 인터페이스, Windows/Android 패키징 준비 상태를 확인합니다.
        </p>
      </div>

      {statusNote && (
        <div className="p-3.5 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-xs text-emerald-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={15} />
            <span>{statusNote}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusNote(null)}
            className="text-xs text-slate-300 hover:text-white"
          >
            닫기
          </button>
        </div>
      )}

      {/* Basic Settings Switches */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-indigo-500/30 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Cpu size={16} className="text-indigo-400" />
            <span>기본 동작 및 향후 AI 기능 설정</span>
          </h3>

          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <div>
              <div className="text-xs font-bold text-white">UI 효과음 설정</div>
              <div className="text-[11px] text-slate-400">알림 및 버튼 조작 사운드 활성화 여부</div>
            </div>
            <button
              type="button"
              onClick={() => handleToggleSetting('soundEnabled', !soundEnabled)}
              className={`min-h-[36px] px-4 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                soundEnabled ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {soundEnabled ? 'ON' : 'OFF'}
            </button>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <div className="pr-3">
              <div className="text-xs font-bold text-white">
                커뮤니티 AI 이미지 생성 스위치 (1단계 API 미연결)
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                지시서 6항: 생성 비용 확인 후 후속 단계에서 도입 여부를 결정하며, 환경설정에서 ON/OFF 상태를 미리 저장합니다. (현재 실제 API 호출은 금지됨)
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleToggleSetting('aiImageGenerationEnabled', !aiImageGen)}
              className={`min-h-[36px] px-4 py-1.5 rounded-xl text-xs font-bold transition-colors shrink-0 ${
                aiImageGen ? 'bg-pink-600 text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {aiImageGen ? 'ON (예약)' : 'OFF (기본)'}
            </button>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1 text-xs">
            <div className="font-bold text-indigo-300">일상 모드 3일 단위 자동 기록 정리 정책 (1단계 비활성화)</div>
            <p className="text-slate-400 leading-relaxed">
              • 상태: <strong className="text-amber-300">미구현 (1단계 지시서에 따라 자동 삭제 미실행)</strong>
              <br />• 3일 단위 정리의 정확한 기준은 추후 사용자와 결정하며, 현재 채팅방에서 북마크(보존) 표시한 메시지는 향후 자동 정리 대상에서 제외되도록 데이터 구조(`isSavedFromCleanup`)가 준비되어 있습니다.
            </p>
          </div>
        </div>

        {/* Storage & Backup Expansion Layer */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-indigo-500/30 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Database size={16} className="text-sky-400" />
            <span>IndexedDB 저장 시스템 및 백업 확장 인터페이스</span>
          </h3>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white">데이터베이스 이름</span>
              <span className="font-mono text-indigo-300">lovy_lovy_talk_db (스키마 v{appSettings.schemaVersion})</span>
            </div>
            <div className="text-slate-400 leading-relaxed">
              분리된 스토어: <code className="text-pink-300">characters</code>,{' '}
              <code className="text-pink-300">messages</code>,{' '}
              <code className="text-pink-300">stories</code>,{' '}
              <code className="text-pink-300">community</code>,{' '}
              <code className="text-pink-300">assets</code>,{' '}
              <code className="text-pink-300">settings</code>,{' '}
              <code className="text-pink-300">rooms</code>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-300 pt-1">
              <ShieldCheck size={14} />
              <span>사용자 승인 없는 데이터 초기화 금지 및 트랜잭션 보호 적용됨</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
            <div className="flex items-center gap-2 font-bold text-slate-200">
              <CloudOff size={15} className="text-amber-400" />
              <span>Google Drive 클라우드 백업 상태: 후속 단계 구현 예정 (미연결)</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              지시서 8항 원칙에 따라 저장 계층 인터페이스(`storageService`)만 분리되어 있으며, 실제 Google Drive 백업이 연결되기 전까지 허위 백업 완료 메시지를 표시하지 않습니다.
            </p>
            <button
              type="button"
              onClick={handleExportLocalSnapshot}
              className="mt-2 min-h-[38px] px-3.5 py-2 rounded-xl bg-indigo-950 hover:bg-indigo-900 border border-indigo-500/40 text-xs font-medium text-indigo-200 flex items-center gap-1.5"
            >
              <Download size={13} />
              <span>현재 로컬 DB 전체 스냅샷 JSON 내보내기 (검수용)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Platform & AI Layer Status */}
      <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3 text-xs">
        <div className="flex items-center gap-2 font-bold text-white text-sm">
          <Smartphone size={16} className="text-pink-400" />
          <span>멀티플랫폼 (Web · Windows Electron · Android Capacitor) 및 AI 계층 상태</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <div className="font-semibold text-indigo-300">플랫폼 런타임 및 패키징 상태</div>
            <p className="text-slate-300">{platformStatus.nativeBuildStatusNote}</p>
            <p className="text-slate-400 mt-1">{platformStatus.updatePolicyNote}</p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <div className="font-semibold text-pink-300">AI 통신 인터페이스 분리 상태</div>
            <p className="text-slate-300">현재 단계: {aiStatus.phase}</p>
            <p className="text-slate-400 mt-1">{aiStatus.note}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
