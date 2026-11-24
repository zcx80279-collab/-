import React, { useState, useEffect, useMemo } from 'react';
import {
  Character,
  ChatRoom,
  CustomizationSettings,
  AppSettings,
  UserProfile,
  ThemeMode,
  PresenceStatus,
  ChatDisplayPreferences,
  BubbleCustomization,
  GUIDE_RAVI_ID,
} from './core/types';
import { seedInitialData } from './storage/db';
import { storageService } from './storage/storageService';
import { DEFAULT_AVATARS, DEFAULT_CHAT_BACKGROUNDS } from './core/defaultAssets';
import { ChatWorkspace } from './chat/ChatWorkspace';
import { CyberFrameShell, MainMenuTab } from './chat/CyberFrameShell';
import { ScreenSettingsPopup } from './chat/ScreenSettingsPopup';
import { CommunityFeed } from './community/CommunityFeed';
import { CharacterManager } from './characters/CharacterManager';
import { SettingsPanel } from './core/SettingsPanel';
import { VerificationReportModal } from './core/VerificationReportModal';
import {
  MessageSquare,
  MessageCircle,
  Users,
  Globe,
  Settings,
  Plus,
  BookOpen,
  ShieldAlert,
  Sparkles,
  UserCircle2,
  Flame,
  Search,
  SlidersHorizontal,
  Moon,
  X,
} from 'lucide-react';

type ActiveTab = MainMenuTab;

const THEME_WRAPPER_CLASSES: Record<ThemeMode, string> = {
  'dark-indigo': 'bg-[#090b1a] text-slate-100',
  black: 'bg-[#030408] text-slate-100',
  violet: 'bg-[#130924] text-slate-100',
  'neon-pink': 'bg-[#1a0718] text-slate-100',
  'neon-blue': 'bg-[#061224] text-slate-100',
};

const PRESENCE_STATES: PresenceStatus[] = ['online', 'resting', 'offline'];

function pickRandomPresence(): PresenceStatus {
  const r = Math.random();
  if (r < 0.58) return 'online';
  if (r < 0.82) return 'resting';
  return 'offline';
}

export default function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<ActiveTab>('chat');
  const [characters, setCharacters] = useState<Character[]>([]);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [assetUrls, setAssetUrls] = useState<Record<string, string>>({});
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // First-Run Welcome Notice Modal & Persona Prompt Modal
  const [showFirstRunWelcome, setShowFirstRunWelcome] = useState(false);
  const [showPersonaPromptModal, setShowPersonaPromptModal] = useState(false);
  const [autoOpenPersonaEditor, setAutoOpenPersonaEditor] = useState(false);

  // Patch 3: Friend list search, virtual presence status, screen settings popup, live skin preview
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showScreenSettings, setShowScreenSettings] = useState(false);
  const [presenceMap, setPresenceMap] = useState<Record<string, PresenceStatus>>({});
  const [skinPreview, setSkinPreview] = useState<{
    scope: 'global' | 'room';
    fullSkinDataUrls?: {
      outerFrame?: string;
      friendList?: string;
      chatBg?: string;
      inputBar?: string;
    };
    bubbles?: BubbleCustomization;
    bubbleDataUrls?: {
      opponent?: string;
      user?: string;
    };
  } | null>(null);

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
    chatDisplayPreferences: {
      showStatusMessage: true,
      showPresenceStatus: true,
    },
    schemaVersion: 2,
    updatedAt: Date.now(),
  });

  // Mobile screen transition state: 'list' (left friend list) vs 'room' (right chat view)
  const [mobileChatView, setMobileChatView] = useState<'list' | 'room'>('room');

  // New Room Modal
  const [showNewRoomModal, setShowNewRoomModal] = useState(false);
  const [newRoomCharId, setNewRoomCharId] = useState<string>('');
  const [newRoomTitle, setNewRoomTitle] = useState<string>('');
  const [newRoomMode, setNewRoomMode] = useState<'daily' | 'story'>('daily');

  useEffect(() => {
    initializeApplication();
  }, []);

  // Initialize & periodically randomize virtual presence status per character (Zero AI API calls; never blocks chat)
  useEffect(() => {
    if (characters.length === 0) return;

    setPresenceMap((prev) => {
      const next: Record<string, PresenceStatus> = { ...prev };
      for (const c of characters) {
        if (!next[c.id]) {
          next[c.id] = c.id === GUIDE_RAVI_ID ? 'online' : pickRandomPresence();
        }
      }
      return next;
    });

    const interval = window.setInterval(() => {
      setPresenceMap((prev) => {
        if (characters.length === 0) return prev;
        const next: Record<string, PresenceStatus> = { ...prev };
        // Randomly update 1~2 characters per tick for natural ambient atmosphere
        const updateCount = Math.min(2, characters.length);
        for (let i = 0; i < updateCount; i++) {
          const target = characters[Math.floor(Math.random() * characters.length)];
          if (!target) continue;
          const randomState =
            PRESENCE_STATES[Math.floor(Math.random() * PRESENCE_STATES.length)];
          next[target.id] = randomState;
        }
        return next;
      });
    }, 20000);

    return () => window.clearInterval(interval);
  }, [characters]);

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

  const charactersMap = useMemo(() => {
    const map: Record<string, Character> = {};
    for (const c of characters) {
      map[c.id] = c;
    }
    return map;
  }, [characters]);

  const activeRoom = rooms.find((r) => r.id === activeRoomId) || rooms[0] || null;

  const displayPreferences: ChatDisplayPreferences = appSettings.chatDisplayPreferences ?? {
    showStatusMessage: true,
    showPresenceStatus: true,
  };

  const handleUpdateDisplayPreferences = async (next: ChatDisplayPreferences) => {
    const updated = await storageService.saveAppSettings({
      chatDisplayPreferences: next,
    });
    setAppSettings(updated);
  };

  const handleDismissWelcome = async (targetTab: ActiveTab) => {
    const updated = await storageService.saveAppSettings({ welcomeSeen: true });
    setAppSettings(updated);
    setShowFirstRunWelcome(false);
    setActiveTab(targetTab);
  };

  const handleSelectRoom = (room: ChatRoom) => {
    // Offline virtual status NEVER blocks chatting; only user persona rule is preserved
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

  // Filtered rooms by character name ONLY (never searches chat content or external data)
  const filteredRooms = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return rooms;
    return rooms.filter((room) => {
      const char = charactersMap[room.characterId];
      const charName = (char?.name || room.title || '').toLowerCase();
      return charName.includes(q);
    });
  }, [rooms, charactersMap, searchQuery]);

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
      <div className="min-h-screen bg-[#080515] text-slate-100 flex items-center justify-center p-6">
        <div className="text-center space-y-2">
          <div className="text-base font-bold text-white">러비러비톡 (Lovy Lovy Talk) 초기화 중...</div>
          <div className="text-xs text-fuchsia-300">IndexedDB 로컬 스토리지 및 보안 스키마 검증 중</div>
        </div>
      </div>
    );
  }

  // Resolve independent Per-Room vs Global PNG Skin & Bubble Customization
  const roomFullSkin = activeRoom?.customization?.fullSkin;
  const globalFullSkin = customization.fullSkin;
  const effectiveFullSkin =
    roomFullSkin &&
    (roomFullSkin.outerFrameAssetId ||
      roomFullSkin.friendListAssetId ||
      roomFullSkin.chatBgAssetId ||
      roomFullSkin.inputBarAssetId)
      ? roomFullSkin
      : globalFullSkin;

  const previewAppliesToCurrent =
    skinPreview && (skinPreview.scope === 'global' || skinPreview.scope === 'room');

  const resolvedOuterFrameUrl =
    (previewAppliesToCurrent ? skinPreview.fullSkinDataUrls?.outerFrame : undefined) ||
    (effectiveFullSkin?.outerFrameAssetId ? assetUrls[effectiveFullSkin.outerFrameAssetId] : undefined);

  const resolvedFriendListBgUrl =
    (previewAppliesToCurrent ? skinPreview.fullSkinDataUrls?.friendList : undefined) ||
    (effectiveFullSkin?.friendListAssetId ? assetUrls[effectiveFullSkin.friendListAssetId] : undefined);

  const legacyChatBgId =
    activeRoom?.customization?.chatBackgroundAssetId !== undefined
      ? activeRoom.customization.chatBackgroundAssetId
      : customization.chatBackgroundAssetId;

  const resolvedChatBgUrl =
    (previewAppliesToCurrent ? skinPreview.fullSkinDataUrls?.chatBg : undefined) ||
    (effectiveFullSkin?.chatBgAssetId ? assetUrls[effectiveFullSkin.chatBgAssetId] : undefined) ||
    (legacyChatBgId && legacyChatBgId !== 'none' && legacyChatBgId !== 'default-chat-bg-night'
      ? assetUrls[legacyChatBgId] || DEFAULT_CHAT_BACKGROUNDS.darkNight
      : '');

  const resolvedInputBarUrl =
    (previewAppliesToCurrent ? skinPreview.fullSkinDataUrls?.inputBar : undefined) ||
    (effectiveFullSkin?.inputBarAssetId ? assetUrls[effectiveFullSkin.inputBarAssetId] : undefined);

  const savedBubbles: BubbleCustomization | undefined =
    activeRoom?.customization?.bubbles ?? customization.bubbles;

  const effectiveBubbles: BubbleCustomization | undefined =
    previewAppliesToCurrent && skinPreview.bubbles ? skinPreview.bubbles : savedBubbles;

  const effectiveAssetUrls: Record<string, string> =
    previewAppliesToCurrent && skinPreview.bubbleDataUrls
      ? {
          ...assetUrls,
          ...(skinPreview.bubbleDataUrls.opponent
            ? { '__preview_opponent_bubble__': skinPreview.bubbleDataUrls.opponent }
            : {}),
          ...(skinPreview.bubbleDataUrls.user
            ? { '__preview_user_bubble__': skinPreview.bubbleDataUrls.user }
            : {}),
        }
      : assetUrls;

  const effectiveBubblesWithPreview: BubbleCustomization | undefined =
    previewAppliesToCurrent && skinPreview.bubbleDataUrls
      ? {
          ...effectiveBubbles,
          ...(skinPreview.bubbleDataUrls.opponent
            ? { opponentBubbleAssetId: '__preview_opponent_bubble__' }
            : {}),
          ...(skinPreview.bubbleDataUrls.user
            ? { userBubbleAssetId: '__preview_user_bubble__' }
            : {}),
        }
      : effectiveBubbles;

  const effectiveBubbleStyle = activeRoom?.customization?.bubbleStyle ?? customization.bubbleStyle;
  const effectiveTheme: ThemeMode =
    (activeTab === 'chat' ? activeRoom?.customization?.theme : undefined) ?? customization.theme;

  const activeRoomChar = activeRoom ? charactersMap[activeRoom.characterId] : undefined;
  const activeRoomDisplayName =
    activeRoomChar?.name || activeRoom?.title || '선택된 채팅방';

  const renderPresenceBadge = (status: PresenceStatus) => {
    if (status === 'online') {
      return (
        <span
          title="접속 중"
          className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#22c55e] border-2 border-[#120826] shadow-[0_0_8px_rgba(34,197,94,0.85)]"
        />
      );
    }
    if (status === 'resting') {
      return (
        <span
          title="휴식 중"
          className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#facc15] border-2 border-[#120826] shadow-[0_0_8px_rgba(250,204,21,0.8)] flex items-center justify-center"
        >
          <Moon size={9} className="text-[#120826] fill-[#120826]" />
        </span>
      );
    }
    return (
      <span
        title="오프라인"
        className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-slate-500 border-2 border-[#120826]"
      />
    );
  };

  // Left Friend List Panel (Redesigned to match 13943.png)
  const friendListPanel = (
    <div
      className="flex flex-col h-full w-full bg-[#0b061a]/92 overflow-hidden"
      style={
        resolvedFriendListBgUrl
          ? {
              backgroundImage: `url("${resolvedFriendListBgUrl}")`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }
          : undefined
      }
    >
      {/* Top Action Toolbar: Magnifier (Search), Slider (Screen Settings), + 새 채팅방 */}
      <div className="px-3.5 pt-3.5 pb-2.5 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setShowSearchInput((prev) => {
                if (prev) setSearchQuery('');
                return !prev;
              });
            }}
            title="캐릭터 이름 검색"
            aria-label="캐릭터 이름 검색"
            className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
              showSearchInput || searchQuery
                ? 'bg-fuchsia-950/90 border-fuchsia-400 text-fuchsia-200 shadow-[0_0_12px_rgba(232,121,249,0.45)]'
                : 'bg-[#160b2e]/90 hover:bg-[#231147] border-indigo-400/35 text-slate-200'
            }`}
          >
            <Search size={18} />
          </button>

          <button
            type="button"
            onClick={() => setShowScreenSettings(true)}
            title="화면 설정 및 PNG 커스터마이징"
            aria-label="화면 설정 열기"
            className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
              showScreenSettings
                ? 'bg-fuchsia-950/90 border-fuchsia-400 text-fuchsia-200 shadow-[0_0_12px_rgba(232,121,249,0.45)]'
                : 'bg-[#160b2e]/90 hover:bg-[#231147] border-indigo-400/35 text-slate-200'
            }`}
          >
            <SlidersHorizontal size={18} />
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowNewRoomModal(true)}
          className="h-10 px-4 rounded-xl bg-gradient-to-r from-[#d946ef] via-[#ec4899] to-[#c026d3] hover:brightness-110 text-xs sm:text-sm font-bold text-white flex items-center gap-1.5 shadow-[0_0_18px_rgba(236,72,153,0.55)] border border-fuchsia-200/45 transition-all whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus size={16} strokeWidth={2.5} />
          <span>새 채팅방</span>
        </button>
      </div>

      {/* Inline Character Name Search Input (when toggled) */}
      {showSearchInput && (
        <div className="px-3.5 pb-2.5 shrink-0">
          <div className="flex items-center gap-2 px-3 h-9 rounded-xl bg-[#130928]/95 border border-fuchsia-400/55 shadow-[0_0_10px_rgba(232,121,249,0.2)]">
            <Search size={14} className="text-fuchsia-300 shrink-0" />
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="캐릭터 이름으로 검색..."
              className="flex-1 bg-transparent text-xs text-white placeholder:text-slate-400 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="검색어 지우기"
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Large Character Cards Vertical Scroll List */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2 cyber-scrollbar">
        {filteredRooms.length === 0 ? (
          <div className="py-10 px-4 text-center text-xs text-slate-400">
            {searchQuery.trim()
              ? `'${searchQuery.trim()}'에 해당하는 캐릭터가 없습니다.`
              : '등록된 채팅방이 없습니다.'}
          </div>
        ) : (
          filteredRooms.map((room) => {
            const char = charactersMap[room.characterId];
            const isSelected = activeRoom?.id === room.id && activeTab === 'chat';
            const avatarSrc = char
              ? assetUrls[char.avatarAssetId] || DEFAULT_AVATARS.ravi
              : DEFAULT_AVATARS.ravi;
            const displayName = char
              ? char.name
              : room.title || `삭제된 캐릭터 (${room.characterId})`;
            const presence: PresenceStatus =
              presenceMap[room.characterId] ||
              (room.characterId === GUIDE_RAVI_ID ? 'online' : 'online');
            // Status message: Patch 3 reserves display area & keeps empty if unregistered
            const statusMsg = (char?.statusMessage || '').trim();

            return (
              <button
                key={room.id}
                type="button"
                onClick={() => handleSelectRoom(room)}
                className={`w-full px-3 py-2.5 rounded-2xl text-left transition-all duration-150 flex items-center gap-3.5 cursor-pointer ${
                  isSelected ? 'cyber-friend-card-selected' : 'cyber-friend-card-default'
                }`}
              >
                {/* Large Profile Avatar + Presence Status Dot */}
                <div className="relative w-14 h-14 shrink-0">
                  <div
                    className={`w-14 h-14 rounded-full overflow-hidden p-[2px] ${
                      isSelected
                        ? 'bg-gradient-to-tr from-fuchsia-400 via-pink-400 to-cyan-300 shadow-[0_0_14px_rgba(232,121,249,0.65)]'
                        : 'bg-gradient-to-tr from-indigo-500/60 to-fuchsia-500/50'
                    }`}
                  >
                    <img
                      src={avatarSrc}
                      alt={displayName}
                      referrerPolicy="no-referrer"
                      className="w-full h-full rounded-full object-cover bg-[#120826]"
                    />
                  </div>
                  {displayPreferences.showPresenceStatus && renderPresenceBadge(presence)}
                </div>

                {/* Name & Reserved Status Message Area */}
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[15px] font-bold text-white truncate tracking-tight">
                      {displayName}
                    </span>
                    {room.makjangMode && (
                      <span title="막장 모드 활성화됨" className="shrink-0">
                        <Flame size={12} className="text-red-400" />
                      </span>
                    )}
                  </div>

                  {displayPreferences.showStatusMessage && (
                    <div className="mt-1 min-h-[18px] flex items-center gap-1.5 text-xs text-slate-300/90 truncate">
                      {statusMsg ? (
                        <>
                          {presence === 'resting' ? (
                            <Moon size={12} className="text-amber-300 shrink-0" />
                          ) : (
                            <MessageCircle size={12} className="text-slate-300 shrink-0" />
                          )}
                          <span className="truncate">{statusMsg}</span>
                        </>
                      ) : (
                        <span className="sr-only">상태 메시지 없음</span>
                      )}
                    </div>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <div
      className={`h-screen w-screen overflow-hidden flex flex-col select-none sm:select-auto ${
        activeTab === 'chat'
          ? 'bg-[#080515] text-slate-100'
          : THEME_WRAPPER_CLASSES[effectiveTheme] || THEME_WRAPPER_CLASSES['dark-indigo']
      }`}
    >
      {/* MAIN CHAT TAB: Redesigned Cyber Rabbit OS Full-Screen Shell (13943.png) */}
      {activeTab === 'chat' ? (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <CyberFrameShell
            activeTab={activeTab}
            onSelectTab={(tab) => setActiveTab(tab)}
            customOuterFrameUrl={resolvedOuterFrameUrl}
            leftPanel={friendListPanel}
            mobileChatView={mobileChatView}
            rightPanel={
              <ChatWorkspace
                activeRoom={activeRoom}
                charactersMap={charactersMap}
                assetUrls={effectiveAssetUrls}
                globalCustomization={customization}
                chatBackgroundUrl={resolvedChatBgUrl}
                customInputBarUrl={resolvedInputBarUrl}
                bubbleStyle={effectiveBubbleStyle}
                bubbleCustomization={effectiveBubblesWithPreview}
                userProfile={userProfile}
                onRequireUserProfile={() => setShowPersonaPromptModal(true)}
                onRoomUpdated={() => reloadAllState()}
                onNavigateTab={(tab) => setActiveTab(tab)}
                onBackToMobileList={() => setMobileChatView('list')}
              />
            }
          />
        </div>
      ) : activeTab === 'community' ? (
        <CommunityFeed
          characters={characters}
          assetUrls={assetUrls}
          appSettings={appSettings}
          onAssetsUpdated={() => reloadAllState()}
          onNavigate={(tab) => {
            if (tab === 'chat') setMobileChatView('list');
            setActiveTab(tab);
          }}
        />
      ) : (
        <>
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
                className="py-1 transition-colors whitespace-nowrap shrink-0 hover:text-white cursor-pointer"
              >
                채팅방
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('community')}
                className="py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer hover:text-white"
              >
                커뮤니티
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('characters')}
                className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
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
                className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
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
                className={`min-h-[36px] px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'report'
                    ? 'bg-pink-600 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                }`}
              >
                검수 보고서
              </button>
            </div>
          </header>

          <main className="flex-1 min-h-0 flex flex-col overflow-hidden">
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
        </>
      )}

      {/* Mobile Bottom Navigation Bar (4 Main Tabs: 채팅방, 커뮤니티, 캐릭터 관리, 환경설정) */}
      {activeTab !== 'community' && <nav className="md:hidden h-14 bg-[#0b061a]/95 border-t border-fuchsia-500/35 grid grid-cols-4 items-center shrink-0 z-30">
        <button
          type="button"
          onClick={() => {
            setActiveTab('chat');
            setMobileChatView('list');
          }}
          className={`h-full flex flex-col items-center justify-center text-[10px] font-semibold ${
            activeTab === 'chat' ? 'text-fuchsia-400' : 'text-slate-400'
          }`}
        >
          <MessageSquare size={17} />
          <span className="mt-0.5">채팅방</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('community')}
          className="h-full flex flex-col items-center justify-center text-[10px] font-semibold text-slate-400"
        >
          <Globe size={17} />
          <span className="mt-0.5">커뮤니티</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('characters')}
          className={`h-full flex flex-col items-center justify-center text-[10px] font-semibold ${
            activeTab === 'characters' ? 'text-fuchsia-400' : 'text-slate-400'
          }`}
        >
          <Users size={17} />
          <span className="mt-0.5">캐릭터 관리</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`h-full flex flex-col items-center justify-center text-[10px] font-semibold ${
            activeTab === 'settings' ? 'text-fuchsia-400' : 'text-slate-400'
          }`}
        >
          <Settings size={17} />
          <span className="mt-0.5">환경설정</span>
        </button>
      </nav>}

      {/* Floating Screen Settings & PNG Customization Popup (Slider Icon) */}
      <ScreenSettingsPopup
        isOpen={showScreenSettings}
        onClose={() => setShowScreenSettings(false)}
        displayPreferences={displayPreferences}
        onChangeDisplayPreferences={handleUpdateDisplayPreferences}
        globalCustomization={customization}
        activeRoom={activeRoom}
        activeRoomTitle={activeRoomDisplayName}
        assetUrls={assetUrls}
        onCustomizationSaved={() => reloadAllState()}
        onPreviewSkinChange={setSkinPreview}
      />

      {/* First-Run Welcome Notice Modal */}
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
                className="min-h-[42px] px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-100 cursor-pointer"
              >
                둘러보기
              </button>
              <button
                type="button"
                onClick={() => handleDismissWelcome('settings')}
                className="min-h-[42px] px-5 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-xs font-bold text-white shadow-lg shadow-pink-600/30 cursor-pointer"
              >
                설정으로 이동
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Persona Creation Prompt Modal */}
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
                className="min-h-[42px] px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 cursor-pointer"
              >
                돌아가기
              </button>
              <button
                type="button"
                onClick={handleGoCreatePersona}
                className="min-h-[42px] px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-lg shadow-emerald-600/30 cursor-pointer"
              >
                나의 분신 만들기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create New Chat Room Modal (Existing logic preserved) */}
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
                  className={`min-h-[40px] px-3 py-2 rounded-xl border text-xs font-semibold cursor-pointer ${
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
                  className={`min-h-[40px] px-3 py-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer ${
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
                className="min-h-[40px] px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-300 cursor-pointer"
              >
                취소
              </button>
              <button
                type="submit"
                className="min-h-[40px] px-5 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-xs font-semibold text-white cursor-pointer"
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
