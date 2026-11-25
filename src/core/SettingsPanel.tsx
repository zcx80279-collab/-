import React, { useEffect, useState } from 'react';
import { AppSettings } from '../core/types';
import { storageService } from '../storage/storageService';
import { platformService } from '../platform/platformService';
import { updateService, UpdateState } from '../platform/updateService';
import { DeveloperAccess } from '../developer/DeveloperAccess';
import {
  Settings, Database, RefreshCw, Code2, Network, Palette, Bell, KeyRound,
  UserRound, Info, ArrowLeft, CheckCircle2, Download, Cloud, Sparkles,
  CloudUpload, ArrowUp, Wrench, Cpu, Layers, GitFork, FileText,
} from 'lucide-react';
import './settings.css';

interface SettingsPanelProps {
  appSettings: AppSettings;
  onSettingsUpdated: (updated: AppSettings) => void;
  onNavigateCharacters?: () => void;
  onNavigateDeveloper: () => void;
}

const SKIN = '/settings-skin/';
const CARDS = [
  { id: 'basic', title: '기본 설정', icon: 'icon_basic.png', glyph: Settings, tint: 'pink', summary: '효과음과 커뮤니티 이미지' },
  { id: 'storage', title: '저장 및 백업', icon: 'icon_storage.png', glyph: Database, tint: 'cyan', summary: 'JSON 데이터 내보내기' },
  { id: 'update', title: '앱 업데이트', icon: 'icon_update.png', glyph: RefreshCw, tint: 'pink', summary: '설치형 앱 버전 확인' },
  { id: 'developer', title: '개발자 모드', icon: 'icon_developer.png', glyph: Code2, tint: 'cyan', summary: '암호 인증 후 전용 페이지' },
  { id: 'ai', title: 'AI 연동', icon: 'icon_ai.png', glyph: Network, tint: 'pink', summary: 'AI 연결 설정 안내' },
  { id: 'theme', title: '테마 설정', icon: 'icon_theme.png', glyph: Palette, tint: 'pink', summary: '화면 테마' },
  { id: 'notifications', title: '알림 설정', icon: 'icon_notification.png', glyph: Bell, tint: 'cyan', summary: '알림 환경' },
  { id: 'api', title: 'API 설정', icon: 'icon_api.png', glyph: KeyRound, tint: 'pink', summary: 'API 설정 안내' },
  { id: 'avatar', title: '나의 분신', icon: 'icon_avatar.png', glyph: UserRound, tint: 'cyan', summary: '캐릭터 관리에서 편집' },
  { id: 'about', title: '앱 정보', icon: 'icon_info.png', glyph: Info, tint: 'pink', summary: '버전 및 플랫폼 정보' },
] as const;
type SectionId = (typeof CARDS)[number]['id'];

function CardWatermark({ id }: { id: SectionId }) {
  switch (id) {
    case 'basic':
      return <img className="lovy-settings-card-motif" src={`${SKIN}rabbit_peeking.png`} alt="" aria-hidden="true" />;
    case 'storage':
      return <CloudUpload className="lovy-settings-card-watermark" strokeWidth={1.6} aria-hidden="true" />;
    case 'update':
      return <ArrowUp className="lovy-settings-card-watermark" strokeWidth={1.6} aria-hidden="true" />;
    case 'developer':
      return <Wrench className="lovy-settings-card-watermark" strokeWidth={1.6} aria-hidden="true" />;
    case 'ai':
      return <Cpu className="lovy-settings-card-watermark" strokeWidth={1.6} aria-hidden="true" />;
    case 'theme':
      return <Layers className="lovy-settings-card-watermark" strokeWidth={1.6} aria-hidden="true" />;
    case 'notifications':
      return <Bell className="lovy-settings-card-watermark" strokeWidth={1.6} aria-hidden="true" />;
    case 'api':
      return <GitFork className="lovy-settings-card-watermark" strokeWidth={1.6} aria-hidden="true" />;
    case 'avatar':
      return (
        <span className="lovy-settings-card-motif-twin" aria-hidden="true">
          <img src={`${SKIN}rabbit_peeking.png`} alt="" />
          <img src={`${SKIN}rabbit_peeking.png`} alt="" />
        </span>
      );
    case 'about':
      return <FileText className="lovy-settings-card-watermark" strokeWidth={1.6} aria-hidden="true" />;
  }
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ appSettings, onSettingsUpdated, onNavigateCharacters, onNavigateDeveloper }) => {
  const [selected, setSelected] = useState<SectionId | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(appSettings.soundEnabled);
  const [aiImageGen, setAiImageGen] = useState(appSettings.aiImageGenerationEnabled);
  const [statusNote, setStatusNote] = useState<string | null>(null);
  const [developerGate, setDeveloperGate] = useState(false);
  const [updateState, setUpdateState] = useState<UpdateState>(() => updateService.getState());
  useEffect(() => updateService.subscribe(setUpdateState), []);
  useEffect(() => { setSoundEnabled(appSettings.soundEnabled); setAiImageGen(appSettings.aiImageGenerationEnabled); }, [appSettings]);

  const handleToggleSetting = async (key: 'soundEnabled' | 'aiImageGenerationEnabled', val: boolean) => {
    if (key === 'soundEnabled') setSoundEnabled(val); else setAiImageGen(val);
    const saved = await storageService.saveAppSettings({ [key]: val });
    onSettingsUpdated(saved);
    setStatusNote('설정이 저장되었습니다.');
  };
  const handleExport = async () => {
    const json = await storageService.exportSnapshotJson();
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url;
    a.download = `lovy_lovy_talk_snapshot_v${appSettings.schemaVersion}.json`; a.click(); URL.revokeObjectURL(url);
    setStatusNote('로컬 데이터 스냅샷 JSON을 내보냈습니다.');
  };
  const openSection = (id: SectionId) => {
    if (id === 'developer') { setDeveloperGate(true); return; }
    setSelected(id);
  };
  const activeCard = CARDS.find(card => card.id === selected);

  return <div className="lovy-settings">
    <div className="lovy-settings-scroll">
      <div className="lovy-settings-shell">
        <div className="lovy-settings-frame" aria-hidden="true" />
        <div className="lovy-settings-content">
          <div className="lovy-settings-topbar">
            <header className="lovy-settings-heading">
              <img src={`${SKIN}icon_basic.png`} alt="" aria-hidden="true" />
              <div><h1>환경설정</h1></div>
            </header>
          </div>
          {statusNote && <div className="lovy-settings-notice" role="status"><CheckCircle2 size={16}/><span>{statusNote}</span><button type="button" onClick={() => setStatusNote(null)}>닫기</button></div>}
          {!selected ? <>
            <div className="lovy-settings-grid" aria-label="환경설정 항목">
              {CARDS.map(card => <button key={card.id} type="button" className={`lovy-settings-card ${card.tint}`} onClick={() => openSection(card.id)} aria-label={`${card.title}: ${card.summary}`}>
                <span className="lovy-settings-card-frame" aria-hidden="true" />
                <span className="lovy-settings-card-bg" aria-hidden="true">
                  <CardWatermark id={card.id} />
                </span>
                <img className="lovy-settings-card-icon" src={`${SKIN}${card.icon}`} alt="" aria-hidden="true" />
                <span className="lovy-settings-card-title">{card.title}</span>
                <span className="lovy-settings-card-summary">{card.summary}</span>
              </button>)}
            </div>
            <img className="lovy-settings-circuit-left" src={`${SKIN}circuit_bottom.png`} alt="" aria-hidden="true" />
            <img className="lovy-settings-circuit-right" src={`${SKIN}circuit_long.png`} alt="" aria-hidden="true" />
            <div className="lovy-settings-mascot">
              <img className="lovy-settings-rabbit" src={`${SKIN}rabbit_headset.png`} alt="헤드셋을 착용한 토끼" />
              <img className="lovy-settings-heart" src={`${SKIN}heart_bubble.png`} alt="픽셀 하트 말풍선 장식" />
            </div>
          </> : <section className="lovy-settings-detail">
            <button type="button" className="lovy-settings-back" onClick={() => setSelected(null)}><ArrowLeft size={16}/>환경설정 목록</button>
            <div className="lovy-settings-detail-title"><img src={`${SKIN}${activeCard?.icon}`} alt=""/><div><h2>{activeCard?.title}</h2><p>{activeCard?.summary}</p></div></div>
            {selected === 'basic' && <div className="lovy-settings-panel">
              <SettingToggle title="UI 효과음" help="알림 및 버튼 조작 사운드" checked={soundEnabled} onChange={value => void handleToggleSetting('soundEnabled', value)} />
              <SettingToggle title="커뮤니티 AI 이미지 생성" help="커뮤니티 이미지 생성 설정" checked={aiImageGen} onChange={value => void handleToggleSetting('aiImageGenerationEnabled', value)} />
            </div>}
            {selected === 'storage' && <div className="lovy-settings-panel"><div className="lovy-settings-row"><div><b><Cloud size={17}/> Google Drive 백업</b><p>현재 버전에서는 연결되지 않았습니다.</p></div><span className="lovy-settings-unavailable">미연결</span></div><div className="lovy-settings-row"><div><b><Database size={17}/> JSON 데이터 내보내기</b><p>현재 로컬 데이터베이스 스냅샷을 파일로 저장합니다.</p></div><button type="button" className="lovy-settings-action" onClick={() => void handleExport()}><Download size={15}/>내보내기</button></div></div>}
            {selected === 'update' && <div className="lovy-settings-panel"><div className="lovy-settings-row"><div><b>앱 버전</b><p>v{updateService.getInstalledVersion()} · {platformService.getPlatformLabel()}</p>{updateState.errorMessage && <p className="lovy-settings-error">{updateState.errorMessage}</p>}{updateState.statusMessage && <p>{updateState.statusMessage}</p>}</div>{updateState.supported && <div className="lovy-settings-actions">{updateState.info && !updateState.modalOpen && <button type="button" onClick={() => updateService.reopenModal()}>v{updateState.info.latestVersion} 업데이트 열기</button>}<button type="button" className="lovy-settings-action" disabled={updateState.phase === 'checking' || updateState.phase === 'downloading'} onClick={() => void updateService.checkForUpdates({ silent: false })}><RefreshCw size={15}/>업데이트 확인</button></div>}</div>{!updateState.supported && <p className="lovy-settings-muted">웹 버전에서는 설치형 앱 자동 업데이트를 사용할 수 없습니다.</p>}</div>}
            {selected === 'ai' && <Placeholder icon={<Sparkles size={20}/>} text="AI 연결은 API 설정에서 관리합니다. 기존 AI 동작 방식은 변경되지 않았습니다."/>}
            {selected === 'api' && <Placeholder icon={<KeyRound size={20}/>} text="현재 제공된 프로젝트에는 이 화면에서 조정하는 API 설정이 없습니다."/>}
            {selected === 'theme' && <Placeholder icon={<Palette size={20}/>} text="기존 채팅 화면 테마와 PNG 꾸미기는 채팅 화면의 화면 설정에서 관리합니다."/>}
            {selected === 'notifications' && <Placeholder icon={<Bell size={20}/>} text="현재 설정 가능한 알림 기능이 없습니다."/>}
            {selected === 'avatar' && <div className="lovy-settings-panel"><div className="lovy-settings-row"><div><b>나의 분신 프로필</b><p>저장된 프로필은 유지되며 캐릭터 관리에서 편집할 수 있습니다.</p></div>{onNavigateCharacters && <button type="button" className="lovy-settings-action" onClick={onNavigateCharacters}>캐릭터 관리로 이동</button>}</div></div>}
            {selected === 'about' && <div className="lovy-settings-panel"><div className="lovy-settings-row"><div><b>러비러비톡 Lovy Lovy Talk</b><p>버전 v{updateService.getInstalledVersion()}</p><p>{platformService.getPlatformStatus().nativeBuildStatusNote}</p></div><Info size={22}/></div></div>}
          </section>}
        </div>
      </div>
    </div>
    {developerGate && <div className="lovy-settings-gate"><DeveloperAccess onAuthenticated={() => { setDeveloperGate(false); onNavigateDeveloper(); }} onCancel={() => setDeveloperGate(false)} /></div>}
  </div>;
};

function SettingToggle({ title, help, checked, onChange }: { title: string; help: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <div className="lovy-settings-row"><div><b>{title}</b><p>{help}</p></div><button type="button" className={`lovy-settings-switch ${checked ? 'on' : ''}`} aria-pressed={checked} aria-label={`${title} ${checked ? '켜짐' : '꺼짐'}`} onClick={() => onChange(!checked)}><img src={`${SKIN}switch_${checked ? 'on' : 'off'}.png`} alt=""/><span>{checked ? 'ON' : 'OFF'}</span></button></div>;
}
function Placeholder({ icon, text }: { icon: React.ReactNode; text: string }) { return <div className="lovy-settings-panel lovy-settings-placeholder"><span>{icon}</span><p>{text}</p></div>; }
