import React, { useState, useEffect } from 'react';
import {
  Character,
  ChatRoom,
  CustomizationSettings,
  AppSettings,
  UserProfile,
  ThemeMode,
  GUIDE_RAVI_ID,
} from './core/types';
import { seedInitialData } from './storage/db';
import { storageService } from './storage/storageService';
import { DEFAULT_AVATARS, DEFAULT_FRAMES, DEFAULT_CHAT_BACKGROUNDS } from './core/defaultAssets';
import { ChatWorkspace } from './chat/ChatWorkspace';
import { CommunityFeed } from './community/CommunityFeed';
import { CharacterManager } from './characters/CharacterManager';
import { SettingsPanel } from './core/SettingsPanel';
import { VerificationReportModal } from './core/VerificationReportModal';
import {
  MessageSquare,
  Users,
  Globe,
  Settings,
  Plus,
  BookOpen,
  ShieldAlert,
  Sparkles,
  UserCircle2,
  Flame,
} from 'lucide-react';

type ActiveTab = 'chat' | 'community' | 'characters' | 'settings' | 'report';

const THEME_WRAPPER_CLASSES: Record<ThemeMode, string> = {
  'dark-indigo': 'bg-[#090b1a] text-slate-100',
  black: 'bg-[#030408] text-slate-100',
  violet: 'bg-[#130924] text-slate-100',
  'neon-pink': 'bg-[#1a0718] text-slate-100',
  'neon-blue': 'bg-[#061224] text-slate-100',
};

export default function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<ActiveTab>('chat');
  const [characters, setCharacters] = useState<Character[]>([]);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [assetUrls, setAssetUrls] = useState<Record<string, string>>({});
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Section 2: First-Run Welcome Notice Modal (shown once on first launch only)
  const [showFirstRunWelcome, setShowFirstRunWelcome] = useState(false);

  // Section 3: User Persona Creation Prompt Modal (shown only when starting actual AI character chat without persona)
  const [showPersonaPromptModal, setShowPersonaPromptModal] = useState(false);
  const [autoOpenPersonaEditor, setAutoOpenPersonaEditor] = useState(false);

  const [customization, setCustomization] = useState<CustomizationSettings>({
    id: 'customization',
    theme: 'dark-indigo',
    frameAssetId: 'default-frame-indigo',
    cornerAssetId: 'none',
    appBackgroundAssetId: 'none',
    chatBackgroundAssetId: 'default-chat-bg-night',
    bubbleStyle: 'glass',
    customStickers: [],
    updatedAt: Date.now(),
  });
  const [appSettings, setAppSettings] = useState<AppSettings>({
    id: 'app_settings',
    soundEnabled: true,
    narratorEnabled: true,
    aiImageGenerationEnabled: false,
    autoCleanupDays: 3,
    autoCleanupEnabled: false,
    schemaVersion: 2,
    updatedAt: Date.now(),
  });

  // Mobile screen transition state: 'list' (left room list) vs 'room' (center chat view)
  const [mobileChatView, setMobileChatView] = useState<'list' | 'room'>('room');

  // New Room Modal
  const [showNewRoomModal, setShowNewRoomModal] = useState(false);
  const [newRoomCharId, setNewRoomCharId] = useState<string>('');
  const [newRoomTitle, setNewRoomTitle] = useState<string>('');
  const [newRoomMode, setNewRoomMode] = useState<'daily' | 'story'>('daily');

  useEffect(() => {
    initializeApplication();
  }, []);

  const initializeApplication = async () => {
    try {
      await seedInitialData();
      await reloadAllState(true);
      setIsInitialized(true);
    } catch (err) {
      setInitError(err instanceof Error ? err.message : 'IndexedDB 초기화 오류가 발생했습니다.');
    }
  };

  const reloadAllState = async (isInitialLoad = false) => {
    const [loadedChars, loadedRooms, loadedAssets, loadedCustom, loadedApp, loadedProfile] =
      await Promise.all([
        storageService.getAllCharacters(),
        storageService.getAllRooms(),
        storageService.getAllAssets(),
        storageService.getCustomizationSettings(),
        storageService.getAppSettings(),
        storageService.getUserProfile(),
      ]);

    setCharacters(loadedChars);
    setRooms(loadedRooms);
    setCustomization(loadedCustom);
    setAppSettings(loadedApp);
    setUserProfile(loadedProfile);

    if (isInitialLoad) {
      // Existing users who already registered a profile should not be forced through first-run welcome again
      if (loadedProfile) {
        if (!loadedApp.welcomeSeen) {
          const updated = await storageService.saveAppSettings({ welcomeSeen: true });
          setAppSettings(updated);
        }
        setShowFirstRunWelcome(false);
      } else if (!loadedApp.welcomeSeen) {
        setShowFirstRunWelcome(true);
      }
    }

    const urlMap: Record<string, string> = {};
    for (const a of loadedAssets) {
      urlMap[a.id] = a.dataUrl;
    }
    setAssetUrls(urlMap);

    if (isInitialLoad && loadedRooms.length > 0 && !activeRoomId) {
      const guideRoom = !loadedProfile
        ? loadedRooms.find((r) => r.characterId === GUIDE_RAVI_ID)
        : null;
      setActiveRoomId(guideRoom ? guideRoom.id : loadedRooms[0].id);
    }
    if (loadedChars.length > 0 && !newRoomCharId) {
      const nonGuide = loadedChars.find((c) => c.id !== GUIDE_RAVI_ID) || loadedChars[0];
      setNewRoomCharId(nonGuide.id);
    }
  };

  const charactersMap: Record<string, Character> = {};
  for (const c of characters) {
    charactersMap[c.id] = c;
  }

  const activeRoom = rooms.find((r) => r.id === activeRoomId) || rooms[0] || null;

  const handleDismissWelcome = async (targetTab: ActiveTab) => {
    const updated = await storageService.saveAppSettings({ welcomeSeen: true });
    setAppSettings(updated);
    setShowFirstRunWelcome(false);
    setActiveTab(targetTab);
  };

  const handleSelectRoom = (room: ChatRoom) => {
    // Guide Ravi is always accessible without user profile or API key
    if (room.characterId !== GUIDE_RAVI_ID && !userProfile) {
      setShowPersonaPromptModal(true);
      return;
    }
    setActiveRoomId(room.id);
    setActiveTab('chat');
    setMobileChatView('room');
  };

  const handleOpenChatWithCharacter = async (characterId: string) => {
    if (characterId !== GUIDE_RAVI_ID && !userProfile) {
      setShowPersonaPromptModal(true);
      return;
    }
    const existingRoom = rooms.find((r) => r.characterId === characterId);
    if (existingRoom) {
      setActiveRoomId(existingRoom.id);
    } else {
      const created = await storageService.createChatRoom(characterId);
      await reloadAllState();
      setActiveRoomId(created.id);
    }
    setActiveTab('chat');
    setMobileChatView('room');
  };

  const handleCreateNewRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomCharId) return;
    if (newRoomCharId !== GUIDE_RAVI_ID && !userProfile) {
      setShowNewRoomModal(false);
      setShowPersonaPromptModal(true);
      return;
    }
    const created = await storageService.createChatRoom(newRoomCharId, newRoomTitle, newRoomMode);
    setShowNewRoomModal(false);
    setNewRoomTitle('');
    await reloadAllState();
    setActiveRoomId(created.id);
    setActiveTab('chat');
    setMobileChatView('room');
  };

  const handleGoCreatePersona = () => {
    setShowPersonaPromptModal(false);
    setAutoOpenPersonaEditor(true);
    setActiveTab('characters');
  };

  if (initError) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="max-w-md p-6 rounded-2xl bg-red-950/80 border border-red-500/50 space-y-3">
          <div className="flex items-center gap-2 text-red-300 font-bold">
            <ShieldAlert size={20} />
            <span>데이터베이스 로드 오류</span>
          </div>
          <p className="text-xs text-slate-200 leading-relaxed">{initError}</p>
        </div>
      </div>
    );
  }

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-[#090b1a] text-slate-100 flex items-center justify-center p-6">
        <div className="text-center space-y-2">
          <div className="text-base font-bold text-white">러비러비톡 (Lovy Lovy Talk) 초기화 중...</div>
          <div className="text-xs text-indigo-300">IndexedDB 로컬 스토리지 및 보안 스키마 검증 중</div>
        </div>
      </div>
    );
  }

  // Per-room PNG customization resolution (falls back to existing global customization defaults)
  const roomCustom = activeTab === 'chat' ? activeRoom?.customization : undefined;
  const effectiveTheme: ThemeMode = roomCustom?.theme ?? customization.theme;
  const effectiveFrameAssetId =
    roomCustom?.frameAssetId !== undefined ? roomCustom.frameAssetId : customization.frameAssetId;
  const effectiveChatBgAssetId =
    activeRoom?.customization?.chatBackgroundAssetId !== undefined
      ? activeRoom.customization.chatBackgroundAssetId
      : customization.chatBackgroundAssetId;
  const effectiveBubbleStyle = activeRoom?.customization?.bubbleStyle ?? customization.bubbleStyle;

  const frameOverlayUrl =
    effectiveFrameAssetId && effectiveFrameAssetId !== 'none'
      ? assetUrls[effectiveFrameAssetId] || DEFAULT_FRAMES.cyberIndigo
      : '';

  const chatBgUrl =
    effectiveChatBgAssetId && effectiveChatBgAssetId !== 'none'
      ? assetUrls[effectiveChatBgAssetId] || DEFAULT_CHAT_BACKGROUNDS.darkNight
      : '';

  return (
    <div
      className={`h-screen w-screen overflow-hidden flex flex-col select-none sm:select-auto ${
        THEME_WRAPPER_CLASSES[effectiveTheme] || THEME_WRAPPER_CLASSES['dark-indigo']
      }`}
    >
      {/* Top Bar: Wordmark, 4 Main Menus (채팅방, 커뮤니티, 캐릭터 관리, 환경설정), and Report */}
      <header className="h-14 px-4 sm:px-6 bg-slate-950/90 backdrop-blur-md border-b border-indigo-500/30 flex items-center justify-between gap-8 shrink-0 z-30">
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('chat');
          }}
          className="text-base sm:text-lg font-extrabold tracking-tight text-white whitespace-nowrap shrink-0"
        >
          러비러비톡 Lovy Lovy Talk
        </a>

        <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-300">
          <button
            type="button"
            onClick={() => setActiveTab('chat')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'chat'
                ? 'text-pink-400 underline underline-offset-8 decoration-2'
                : 'hover:text-white'
            }`}
          >
            채팅방
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('community')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'community'
                ? 'text-pink-400 underline underline-offset-8 decoration-2'
                : 'hover:text-white'
            }`}
          >
            커뮤니티
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('characters')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'characters'
                ? 'text-pink-400 underline underline-offset-8 decoration-2'
                : 'hover:text-white'
            }`}
          >
            캐릭터 관리
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'settings'
                ? 'text-pink-400 underline underline-offset-8 decoration-2'
                : 'hover:text-white'
            }`}
          >
            환경설정
          </button>
        </nav>

        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('report')}
            className={`min-h-[36px] px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'report'
                ? 'bg-pink-600 text-white'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white'
            }`}
          >
            검수 보고서
          </button>
        </div>
      </header>

      {/* Main Workspace with Per-Room 9-Slice External Frame Skin Overlay */}
      <div className="flex-1 min-h-0 flex relative overflow-hidden p-1.5 sm:p-2.5">
        {frameOverlayUrl && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-1 sm:inset-1.5 z-20 rounded-2xl overflow-hidden"
            style={{
              borderWidth: '12px',
              borderStyle: 'solid',
              borderColor: 'transparent',
              borderImageSource: `url("${frameOverlayUrl}")`,
              borderImageSlice: '36 fill',
              borderImageRepeat: 'stretch',
              opacity: 0.42,
            }}
          />
        )}

        <div className="flex-1 min-h-0 flex rounded-2xl overflow-hidden border border-indigo-500/30 bg-slate-950/60 backdrop-blur-md relative z-10">
          {/* Left Sidebar: Characters & Chat Rooms List */}
          <aside
            className={`${
              activeTab === 'chat'
                ? mobileChatView === 'list'
                  ? 'flex w-full md:w-72 lg:w-80'
                  : 'hidden md:flex md:w-72 lg:w-80'
                : 'hidden lg:flex lg:w-72'
            } flex-col h-full bg-slate-900/95 border-r border-indigo-500/30 shrink-0`}
          >
            {/* Sidebar Header */}
            <div className="p-3.5 border-b border-indigo-500/30 flex items-center justify-between gap-2">
              <div>
                <h2 className="text-xs font-bold text-white">캐릭터 및 채팅방 목록</h2>
                <p className="text-[11px] text-slate-400">총 {rooms.length}개 채널 활성</p>
              </div>
              <button
                type="button"
                onClick={() => setShowNewRoomModal(true)}
                className="min-h-[36px] px-2.5 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-xs font-semibold text-white flex items-center gap-1 whitespace-nowrap shrink-0"
              >
                <Plus size={13} />
                <span>새 채팅방</span>
              </button>
            </div>

            {/* Quick Character Avatars Bar */}
            <div className="px-3.5 py-2.5 border-b border-slate-800/80 flex items-center gap-2 overflow-x-auto">
              {characters.map((c) => {
                const avatar = assetUrls[c.avatarAssetId] || DEFAULT_AVATARS.ravi;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleOpenChatWithCharacter(c.id)}
                    title={c.name}
                    className="group flex flex-col items-center gap-1 shrink-0 w-14"
                  >
                    <div className="w-10 h-10 rounded-xl border border-indigo-400/50 group-hover:border-pink-400 overflow-hidden p-0.5 bg-slate-950 transition-colors">
                      <img
                        src={avatar}
                        alt={c.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover rounded-[9px]"
                      />
                    </div>
                    <span className="text-[10px] text-slate-300 group-hover:text-white truncate w-full text-center">
                      {c.name}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Chat Rooms Vertical List */}
            <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
              {rooms.map((room) => {
                const char = charactersMap[room.characterId];
                const isGuide = room.characterId === GUIDE_RAVI_ID;
                const isSelected = activeRoom?.id === room.id && activeTab === 'chat';
                const avatarSrc = char
                  ? assetUrls[char.avatarAssetId] || DEFAULT_AVATARS.ravi
                  : DEFAULT_AVATARS.ravi;

                return (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => handleSelectRoom(room)}
                    className={`w-full min-h-[56px] p-2.5 rounded-xl border text-left transition-all flex items-center gap-3 ${
                      isSelected
                        ? 'bg-indigo-950/90 border-pink-500/60 text-white shadow-md'
                        : 'bg-slate-950/60 hover:bg-slate-900 border-slate-800/80 text-slate-300'
                    }`}
                  >
                    <img
                      src={avatarSrc}
                      alt={char ? char.name : '보존된 대화방'}
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-xl border border-indigo-500/40 object-cover shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-white truncate flex items-center gap-1">
                          <span className="truncate">
                            {room.title || (char ? `${char.name} 대화방` : '삭제된 캐릭터 대화방')}
                          </span>
                          {room.makjangMode && (
                            <span title="막장 모드 활성화됨" className="inline-flex items-center shrink-0">
                              <Flame size={11} className="text-red-400" />
                            </span>
                          )}
                        </span>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {isGuide
                            ? '고정 안내'
                            : room.mode === 'story'
                            ? '스토리'
                            : '일상'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 truncate mt-0.5">
                        {char
                          ? char.name
                          : `삭제된 캐릭터 (${room.characterId}) · 기록 보존됨`}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Center & Right Viewport Container */}
          <main
            className={`${
              activeTab === 'chat' && mobileChatView === 'list' ? 'hidden md:flex' : 'flex'
            } flex-1 flex-col min-w-0 h-full overflow-hidden`}
          >
            {activeTab === 'chat' && (
              <ChatWorkspace
                activeRoom={activeRoom}
                charactersMap={charactersMap}
                assetUrls={assetUrls}
                globalCustomization={customization}
                chatBackgroundUrl={chatBgUrl}
                bubbleStyle={effectiveBubbleStyle}
                userProfile={userProfile}
                onRequireUserProfile={() => setShowPersonaPromptModal(true)}
                onRoomUpdated={() => reloadAllState()}
                onNavigateTab={(tab) => setActiveTab(tab)}
                onBackToMobileList={() => setMobileChatView('list')}
              />
            )}

            {activeTab === 'community' && (
              <CommunityFeed
                characters={characters}
                assetUrls={assetUrls}
                appSettings={appSettings}
                onAssetsUpdated={() => reloadAllState()}
              />
            )}

            {activeTab === 'characters' && (
              <CharacterManager
                userProfile={userProfile}
                autoOpenPersonaEditor={autoOpenPersonaEditor}
                onPersonaEditorHandled={() => setAutoOpenPersonaEditor(false)}
                onUserProfileUpdated={(updatedProfile) => setUserProfile(updatedProfile)}
                onOpenChatWithCharacter={handleOpenChatWithCharacter}
                onDataChanged={() => reloadAllState()}
              />
            )}

            {activeTab === 'settings' && (
              <SettingsPanel
                appSettings={appSettings}
                onSettingsUpdated={(updated) => setAppSettings(updated)}
                onNavigateCharacters={() => setActiveTab('characters')}
              />
            )}

            {activeTab === 'report' && <VerificationReportModal />}
          </main>
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar (4 Main Tabs: 채팅, 커뮤니티, 캐릭터, 설정) */}
      <nav className="md:hidden h-14 bg-slate-950/95 border-t border-indigo-500/30 grid grid-cols-4 items-center shrink-0 z-30">
        <button
          type="button"
          onClick={() => {
            setActiveTab('chat');
            setMobileChatView('list');
          }}
          className={`h-full flex flex-col items-center justify-center text-[10px] font-medium ${
            activeTab === 'chat' ? 'text-pink-400' : 'text-slate-400'
          }`}
        >
          <MessageSquare size={17} />
          <span className="mt-0.5">채팅방</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('community')}
          className={`h-full flex flex-col items-center justify-center text-[10px] font-medium ${
            activeTab === 'community' ? 'text-pink-400' : 'text-slate-400'
          }`}
        >
          <Globe size={17} />
          <span className="mt-0.5">커뮤니티</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('characters')}
          className={`h-full flex flex-col items-center justify-center text-[10px] font-medium ${
            activeTab === 'characters' ? 'text-pink-400' : 'text-slate-400'
          }`}
        >
          <Users size={17} />
          <span className="mt-0.5">캐릭터 관리</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`h-full flex flex-col items-center justify-center text-[10px] font-medium ${
            activeTab === 'settings' ? 'text-pink-400' : 'text-slate-400'
          }`}
        >
          <Settings size={17} />
          <span className="mt-0.5">환경설정</span>
        </button>
      </nav>

      {/* Section 2: First-Run Welcome Notice Modal (Shown Once on Initial Run) */}
      {showFirstRunWelcome && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg p-6 rounded-2xl bg-slate-900 border-2 border-pink-500/50 space-y-5 shadow-2xl">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-pink-500/20 text-pink-300 text-xs font-semibold">
                <Sparkles size={13} />
                <span>환영 안내문</span>
              </div>
              <h3 className="text-lg sm:text-xl font-extrabold text-white">
                러비러비톡에 오신 것을 환영합니다!
              </h3>
            </div>

            <div className="space-y-3 text-xs sm:text-sm text-slate-200 leading-relaxed">
              <p>
                러비러비톡은 AI 캐릭터와 자유롭게 대화하고 이야기를 만들어가는 채팅 앱입니다.
              </p>
              <p>
                처음 이용하시는 분은 환경설정에서 API 키를 등록한 후 이용해 주세요.
              </p>
              <p>
                프로그램의 기능이나 사용 방법이 궁금하시다면 안내 도우미 라비에게 질문해 주세요. 라비가 이용 방법을 친절하게 안내해 드립니다.
              </p>
              <p className="font-semibold text-pink-200">
                러비러비톡에서 당신만의 이야기를 시작해 보세요!
              </p>
            </div>

            <div className="pt-2 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => handleDismissWelcome('chat')}
                className="min-h-[42px] px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-100"
              >
                둘러보기
              </button>
              <button
                type="button"
                onClick={() => handleDismissWelcome('settings')}
                className="min-h-[42px] px-5 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-xs font-bold text-white shadow-lg shadow-pink-600/30"
              >
                설정으로 이동
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Section 3: Persona Creation Prompt Modal (Shown only when starting real AI character chat without persona) */}
      {showPersonaPromptModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 rounded-2xl bg-slate-900 border-2 border-emerald-500/50 space-y-5 shadow-2xl">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-semibold">
                <UserCircle2 size={14} />
                <span>나의 분신 안내</span>
              </div>
              <h3 className="text-lg font-extrabold text-white">당신은 어떤 사람인가요?</h3>
            </div>

            <div className="space-y-2.5 text-xs sm:text-sm text-slate-200 leading-relaxed">
              <p>
                캐릭터들이 당신을 알아볼 수 있도록 이야기 속에서 사용할 나의 분신을 만들어 주세요.
              </p>
              <p>
                실제 자신의 모습을 소개하거나 새로운 세계관 속 인물이 되어도 좋습니다.
              </p>
            </div>

            <div className="pt-2 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowPersonaPromptModal(false)}
                className="min-h-[42px] px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200"
              >
                돌아가기
              </button>
              <button
                type="button"
                onClick={handleGoCreatePersona}
                className="min-h-[42px] px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-lg shadow-emerald-600/30"
              >
                나의 분신 만들기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create New Chat Room Modal */}
      {showNewRoomModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateNewRoom}
            className="w-full max-w-md p-5 rounded-2xl bg-slate-900 border border-indigo-500/40 space-y-4 shadow-2xl"
          >
            <h3 className="text-base font-bold text-white">새 채팅방 생성</h3>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">대화할 캐릭터 선택</label>
              <select
                value={newRoomCharId}
                onChange={(e) => setNewRoomCharId(e.target.value)}
                className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-slate-950 border border-indigo-500/30 text-xs text-white"
              >
                {characters
                  .filter((c) => c.id !== GUIDE_RAVI_ID)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">채팅방 이름 (선택)</label>
              <input
                type="text"
                value={newRoomTitle}
                onChange={(e) => setNewRoomTitle(e.target.value)}
                placeholder="비워두면 캐릭터 이름으로 자동 설정됩니다"
                className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-slate-950 border border-indigo-500/30 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">초기 대화 모드</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setNewRoomMode('daily')}
                  className={`min-h-[40px] px-3 py-2 rounded-xl border text-xs font-semibold ${
                    newRoomMode === 'daily'
                      ? 'bg-indigo-600 border-indigo-400 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  일상 모드
                </button>
                <button
                  type="button"
                  onClick={() => setNewRoomMode('story')}
                  className={`min-h-[40px] px-3 py-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1 ${
                    newRoomMode === 'story'
                      ? 'bg-pink-600 border-pink-400 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <BookOpen size={13} />
                  <span>스토리 모드</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNewRoomModal(false)}
                className="min-h-[40px] px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-300"
              >
                취소
              </button>
              <button
                type="submit"
                className="min-h-[40px] px-5 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-xs font-semibold text-white"
              >
                채팅방 만들기
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
