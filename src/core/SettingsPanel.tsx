import React, { useState, useEffect } from 'react';
import { AppSettings } from '../core/types';
import { storageService } from '../storage/storageService';
import { platformService } from '../platform/platformService';
import { aiService } from '../ai/aiService';
import { DeveloperModeNarratorGuide } from './DeveloperModeNarratorGuide';
import {
  Settings,
  Database,
  CloudOff,
  Download,
  Cpu,
  Smartphone,
  ShieldCheck,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  UserCircle2,
  ArrowRight,
} from 'lucide-react';

interface SettingsPanelProps {
  appSettings: AppSettings;
  onSettingsUpdated: (updated: AppSettings) => void;
  onNavigateCharacters?: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  appSettings,
  onSettingsUpdated,
  onNavigateCharacters,
}) => {
  const [soundEnabled, setSoundEnabled] = useState(appSettings.soundEnabled);
  const [aiImageGen, setAiImageGen] = useState(appSettings.aiImageGenerationEnabled);
  const [statusNote, setStatusNote] = useState<string | null>(null);

  // Developer Mode Guide toggle
  const [showDeveloperMode, setShowDeveloperMode] = useState(false);

  const platformStatus = platformService.getPlatformStatus();
  const aiStatus = aiService.getLayerStatus();

  useEffect(() => {
    setSoundEnabled(appSettings.soundEnabled);
    setAiImageGen(appSettings.aiImageGenerationEnabled);
  }, [appSettings]);

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
          <span>앱 환경설정 및 개발자 모드 안내</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          기본 동작 설정, 로컬 데이터 백업 및 개발자 모드(사회자 프롬프트 소스코드 안내)를 관리합니다.
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

      {/* Relocation Notice: User Profile moved to Character Management ("나의 분신") */}
      {onNavigateCharacters && (
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-indigo-500/30 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs">
            <UserCircle2 size={18} className="text-pink-400 shrink-0" />
            <div>
              <div className="font-bold text-white">「나의 분신」 프로필 관리는 캐릭터 관리 페이지로 이동되었습니다</div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                기존에 저장된 프로필 데이터는 그대로 유지되며 [캐릭터 관리] 상단에서 생성 및 수정할 수 있습니다.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onNavigateCharacters}
            className="min-h-[36px] px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white flex items-center gap-1.5 shrink-0"
          >
            <span>나의 분신 관리로 이동</span>
            <ArrowRight size={13} />
          </button>
        </div>
      )}

      {/* Basic Settings Switches & Storage Backup */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-indigo-500/30 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Cpu size={16} className="text-indigo-400" />
            <span>기본 동작 설정</span>
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
                커뮤니티 AI 이미지 생성 스위치
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                환경설정에서 ON/OFF 상태를 저장합니다.
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
              <span className="font-mono text-indigo-300">
                lovy_lovy_talk_db (스키마 v{appSettings.schemaVersion})
              </span>
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
              저장 계층 인터페이스(`storageService`)만 분리되어 있으며, 실제 Google Drive 백업이 연결되기 전까지 허위 백업 완료 메시지를 표시하지 않습니다.
            </p>
            <button
              type="button"
              onClick={handleExportLocalSnapshot}
              className="mt-2 min-h-[38px] px-3.5 py-2 rounded-xl bg-indigo-950 hover:bg-indigo-900 border border-indigo-500/40 text-xs font-medium text-indigo-200 flex items-center gap-1.5"
            >
              <Download size={13} />
              <span>현재 로컬 DB 전체 스냅샷 JSON 내보내기</span>
            </button>
          </div>
        </div>
      </div>

      {/* Developer Mode Guide Screen */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold text-indigo-200">개발자 모드 가이드</div>
          <button
            type="button"
            onClick={() => setShowDeveloperMode(!showDeveloperMode)}
            className="min-h-[36px] px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-indigo-500/30 text-xs font-semibold text-indigo-200 flex items-center gap-1.5 shrink-0"
          >
            <span>{showDeveloperMode ? '개발자 가이드 접기' : '사회자 프롬프트 경로 및 역할 상세 가이드 열기'}</span>
            {showDeveloperMode ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>

        {showDeveloperMode && <DeveloperModeNarratorGuide />}
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
            <div className="font-semibold text-pink-300">AI 통신 및 사회자 시스템 연동 상태</div>
            <p className="text-slate-300">현재 단계: {aiStatus.phase}</p>
            <p className="text-slate-400 mt-1">{aiStatus.note}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
