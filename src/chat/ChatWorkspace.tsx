import React, { useState, useEffect, useRef } from 'react';
import {
  ChatRoom,
  Character,
  Message,
  StoryMemory,
  ChatMode,
  BubbleStyle,
  BubbleCustomization,
  UserProfile,
  CustomizationSettings,
  GUIDE_RAVI_ID,
} from '../core/types';
import { storageService } from '../storage/storageService';
import { aiService } from '../ai/aiService';
import { DEFAULT_AVATARS, CYBER_RABBIT_WATERMARK_SVG } from '../core/defaultAssets';
import { GuideRaviChat } from '../guide/GuideRaviChat';
import { ChatRoomSettingsModal } from './ChatRoomSettingsModal';
import { CyberSpeechBubble } from './CyberSpeechBubble';
import {
  Send,
  BookOpen,
  Sparkles,
  Bookmark,
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  Save,
  SlidersHorizontal,
  Settings,
  ArrowLeft,
  ShieldAlert,
  CheckCircle2,
  HeartHandshake,
  UserCheck,
  Loader2,
  Flame,
} from 'lucide-react';

interface ChatWorkspaceProps {
  activeRoom: ChatRoom | null;
  charactersMap: Record<string, Character>;
  assetUrls: Record<string, string>;
  globalCustomization: CustomizationSettings;
  chatBackgroundUrl: string;
  customInputBarUrl?: string;
  bubbleStyle: BubbleStyle;
  bubbleCustomization?: BubbleCustomization;
  userProfile: UserProfile | null;
  onRequireUserProfile: () => void;
  onRoomUpdated: () => Promise<void> | void;
  onNavigateTab: (tab: 'chat' | 'community' | 'characters' | 'settings' | 'report') => void;
  onBackToMobileList?: () => void;
}

export const ChatWorkspace: React.FC<ChatWorkspaceProps> = ({
  activeRoom,
  charactersMap,
  assetUrls,
  globalCustomization,
  chatBackgroundUrl,
  customInputBarUrl,
  bubbleCustomization,
  userProfile,
  onRequireUserProfile,
  onRoomUpdated,
  onNavigateTab,
  onBackToMobileList,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [currentMode, setCurrentMode] = useState<ChatMode>('daily');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // 추억의 한조각 (User-managed memories) drawer state
  const [storyMemory, setStoryMemory] = useState<StoryMemory | null>(null);
  const [keyMemories, setKeyMemories] = useState<string[]>([]);
  const [newMemoryInput, setNewMemoryInput] = useState('');
  const [editingMemoryIdx, setEditingMemoryIdx] = useState<number | null>(null);
  const [editingMemoryText, setEditingMemoryText] = useState('');
  const [memorySaveStatus, setMemorySaveStatus] = useState<string | null>(null);
  const [showMemoriesDrawer, setShowMemoriesDrawer] = useState(false);
  const [showRoomSettingsModal, setShowRoomSettingsModal] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeRoom) {
      setCurrentMode(activeRoom.mode);
      setAiError(null);
      loadRoomMessagesAndMemories(activeRoom);
    }
  }, [activeRoom?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, currentMode, isGenerating]);

  const loadRoomMessagesAndMemories = async (room: ChatRoom) => {
    const [msgs, story] = await Promise.all([
      storageService.getMessagesByRoom(room.id),
      storageService.getStoryMemory(room.characterId),
    ]);
    setMessages(msgs);
    setStoryMemory(story);
    setKeyMemories(story.keyMemories || []);
    setEditingMemoryIdx(null);
  };

  if (!activeRoom) {
    return (
      <div className="flex flex-col items-center justify-center h-full cyber-chat-grid text-slate-300 p-6 text-center">
        <p className="text-sm font-medium">
          좌측 친구 목록에서 캐릭터를 선택하거나 새 채팅방을 생성해 주세요.
        </p>
      </div>
    );
  }

  // Guide Ravi's official guide room (never uses AI API; choice-only guidance preserved)
  if (activeRoom.characterId === GUIDE_RAVI_ID) {
    return (
      <GuideRaviChat
        onNavigateTab={onNavigateTab}
        onBackToMobileList={onBackToMobileList}
        customChatBgUrl={chatBackgroundUrl || undefined}
        customInputBarUrl={customInputBarUrl}
        bubbleCustomization={bubbleCustomization}
        assetUrls={assetUrls}
      />
    );
  }

  const character = charactersMap[activeRoom.characterId];
  const isDeletedCharacter = !character;
  const charName = character ? character.name : `삭제된 캐릭터 (${activeRoom.characterId})`;
  const charAvatarUrl = character
    ? assetUrls[character.avatarAssetId] || DEFAULT_AVATARS.luna
    : DEFAULT_AVATARS.ravi;

  const resolvedInfoAndPersonality = (
    activeRoom.promptOverride?.characterInfoAndPersonality ||
    character?.systemPrompt ||
    ''
  ).trim();
  const resolvedWorldView = (
    activeRoom.promptOverride?.worldView ||
    character?.worldView ||
    storyMemory?.worldView ||
    ''
  ).trim();
  const resolvedSpeech = (
    activeRoom.promptOverride?.speechAndBehavior ||
    character?.speechAndBehavior ||
    String(character?.customSettings?.speechAndBehavior || character?.customSettings?.greetingStyle || '')
  ).trim();
  const isMakjangActive = Boolean(activeRoom.makjangMode);

  const handleSwitchMode = async (mode: ChatMode) => {
    setCurrentMode(mode);
    await storageService.updateRoomMode(activeRoom.id, mode);
    onRoomUpdated();
  };

  const persistMemoriesList = async (updatedList: string[], statusMsg: string) => {
    if (!storyMemory) return;
    const saved = await storageService.saveStoryMemory({
      ...storyMemory,
      keyMemories: updatedList,
    });
    setStoryMemory(saved);
    setKeyMemories(saved.keyMemories || []);
    setMemorySaveStatus(statusMsg);
    setTimeout(() => setMemorySaveStatus(null), 3000);
  };

  const handleAddKeyMemory = async () => {
    const trimmed = newMemoryInput.trim();
    if (!trimmed) return;
    const next = [...keyMemories, trimmed];
    setNewMemoryInput('');
    await persistMemoriesList(next, '추억의 한조각이 저장되었습니다.');
  };

  const handleStartEditMemory = (index: number) => {
    setEditingMemoryIdx(index);
    setEditingMemoryText(keyMemories[index]);
  };

  const handleSaveEditMemory = async (index: number) => {
    const trimmed = editingMemoryText.trim();
    if (!trimmed) return;
    const next = keyMemories.map((item, idx) => (idx === index ? trimmed : item));
    setEditingMemoryIdx(null);
    setEditingMemoryText('');
    await persistMemoriesList(next, '추억의 한조각이 수정되었습니다.');
  };

  const handleRemoveKeyMemory = async (index: number) => {
    const next = keyMemories.filter((_, idx) => idx !== index);
    if (editingMemoryIdx === index) {
      setEditingMemoryIdx(null);
    }
    await persistMemoriesList(next, '추억의 한조각이 삭제되었습니다.');
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const userText = inputText.trim();
    if (!userText || isGenerating) return;

    if (!userProfile) {
      onRequireUserProfile();
      return;
    }

    setAiError(null);
    setInputText('');

    const userMsg = await storageService.addMessage({
      roomId: activeRoom.id,
      sender: 'user',
      content: userText,
      mode: currentMode,
      isSavedFromCleanup: currentMode === 'story',
    });

    const afterUserMsgs = await storageService.getMessagesByRoom(activeRoom.id);
    setMessages(afterUserMsgs);
    onRoomUpdated();

    if (character) {
      setIsGenerating(true);
      try {
        const modeHistory = afterUserMsgs.filter(
          (m) => m.mode === currentMode && m.id !== userMsg.id
        );

        const aiResult = await aiService.generateChatResponse({
          character,
          roomPromptOverride: activeRoom.promptOverride || null,
          userProfile,
          mode: currentMode,
          history: modeHistory,
          storyMemory: storyMemory ? { ...storyMemory, keyMemories } : null,
          makjangMode: Boolean(activeRoom.makjangMode),
          currentSceneType: activeRoom.lastNarratorType || 'daily',
          userMessage: userText,
        });

        const combinedContent = aiResult.segments
          .map((seg) => (seg.type === 'narrator' ? `[사회자 묘사] ${seg.text}` : seg.text))
          .join('\n');

        await storageService.addMessage({
          roomId: activeRoom.id,
          sender: 'character',
          content: combinedContent,
          segments: aiResult.segments,
          narratorSceneType: aiResult.sceneType,
          mode: currentMode,
          isSavedFromCleanup: currentMode === 'story',
        });

        const finalMsgs = await storageService.getMessagesByRoom(activeRoom.id);
        setMessages(finalMsgs);
        onRoomUpdated();
      } catch (err) {
        setAiError(err instanceof Error ? err.message : 'AI 응답 생성 중 오류가 발생했습니다.');
      } finally {
        setIsGenerating(false);
      }
    }
  };

  const handleToggleBookmark = async (msgId: string) => {
    await storageService.toggleMessageBookmark(msgId);
    const updatedMsgs = await storageService.getMessagesByRoom(activeRoom.id);
    setMessages(updatedMsgs);
  };

  const filteredMessages = messages.filter((m) => m.mode === currentMode);

  return (
    <div className="relative flex h-full w-full overflow-hidden">
      {/* Main Chat Pane */}
      <div
        className="flex-1 flex flex-col h-full min-w-0 relative cyber-chat-grid bg-cover bg-center"
        style={
          chatBackgroundUrl
            ? {
                backgroundImage: `url("${chatBackgroundUrl}")`,
              }
            : undefined
        }
      >
        {/* Subtle readability scrim only when custom background PNG is applied */}
        {chatBackgroundUrl && (
          <div className="absolute inset-0 bg-[#080515]/45 pointer-events-none z-0" />
        )}

        {/* Subtle Sparkle Stars (matching reference image) */}
        {!chatBackgroundUrl && (
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden z-0">
            <span className="absolute top-[22%] right-[5%] text-cyan-300/70 text-xs">✦</span>
            <span className="absolute top-[40%] left-[7%] text-fuchsia-400/60 text-[10px]">✦</span>
            <span className="absolute top-[60%] right-[5%] text-cyan-300/75 text-sm">✦</span>
            <span className="absolute bottom-[22%] right-[24%] text-fuchsia-400/60 text-[10px]">✦</span>
          </div>
        )}

        {/* Center Translucent Cyber Rabbit OS Mascot Watermark */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center justify-center z-0"
        >
          <div
            className="w-[240px] sm:w-[300px] opacity-[0.22] select-none"
            dangerouslySetInnerHTML={{ __html: CYBER_RABBIT_WATERMARK_SVG }}
          />
        </div>

        {/* Chat Header */}
        <div
          className={`relative z-10 px-4 sm:px-6 py-3 backdrop-blur-xs border-b flex flex-wrap items-center justify-between gap-2 shrink-0 transition-colors ${
            isMakjangActive
              ? 'bg-red-950/55 border-red-500/60'
              : 'bg-[#0c071e]/65 border-fuchsia-500/25'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            {onBackToMobileList && (
              <button
                type="button"
                onClick={onBackToMobileList}
                className="md:hidden p-2 rounded-xl bg-slate-900/80 border border-fuchsia-500/40 text-slate-200 flex items-center justify-center shrink-0"
                aria-label="채팅 목록으로 돌아가기"
              >
                <ArrowLeft size={16} />
              </button>
            )}
            <img
              src={charAvatarUrl}
              alt={charName}
              referrerPolicy="no-referrer"
              className={`w-9 h-9 rounded-full object-cover shrink-0 ${
                isMakjangActive
                  ? 'border-2 border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'
                  : 'border border-fuchsia-400/70 shadow-[0_0_10px_rgba(232,121,249,0.45)]'
              }`}
            />
            <div className="min-w-0 flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-extrabold tracking-tight text-white truncate">
                {charName}
              </h2>
              {isMakjangActive && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-red-600/40 border border-red-500/80 text-[11px] font-bold text-red-200 shrink-0">
                  <Flame size={12} className="text-red-400" />
                  <span>극적 상황 연출 중</span>
                </span>
              )}
              {isDeletedCharacter && (
                <span className="text-[11px] text-amber-300 font-medium shrink-0">
                  · 삭제된 캐릭터 (기록 보존됨)
                </span>
              )}
            </div>
          </div>

          {/* Mode Switcher, Memories Drawer & Chat Room Settings */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="flex items-center p-0.5 rounded-xl bg-[#120826]/90 border border-fuchsia-500/35">
              <button
                type="button"
                onClick={() => handleSwitchMode('daily')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  currentMode === 'daily'
                    ? 'bg-cyan-600/85 text-white shadow-[0_0_8px_rgba(34,211,238,0.4)]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                일상
              </button>
              <button
                type="button"
                onClick={() => handleSwitchMode('story')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors flex items-center gap-1 whitespace-nowrap cursor-pointer ${
                  currentMode === 'story'
                    ? 'bg-fuchsia-600/90 text-white shadow-[0_0_8px_rgba(232,121,249,0.4)]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <BookOpen size={11} />
                <span>스토리</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowMemoriesDrawer((prev) => !prev)}
              title="추억의 한조각"
              className="px-2.5 py-1.5 rounded-xl bg-[#150a2d]/90 hover:bg-[#231048] border border-indigo-400/35 text-[11px] font-semibold text-indigo-200 flex items-center gap-1 whitespace-nowrap cursor-pointer"
            >
              <SlidersHorizontal size={12} />
              <span className="hidden sm:inline">추억({keyMemories.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setShowRoomSettingsModal(true)}
              title="채팅방 설정 (프롬프트 · 추억의 한조각 · 막장 모드)"
              aria-label="채팅방 설정 열기"
              className={`p-2 rounded-xl border text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer ${
                isMakjangActive
                  ? 'bg-red-950/80 hover:bg-red-900/80 border-red-500/50 text-red-200'
                  : 'bg-[#150a2d]/90 hover:bg-[#231048] border-fuchsia-400/40 text-fuchsia-200'
              }`}
            >
              <Settings size={14} />
            </button>
          </div>
        </div>

        {/* Notices */}
        {(isDeletedCharacter || aiError) && (
          <div className="relative z-10 px-4 sm:px-6 pt-3 space-y-2 shrink-0">
            {isDeletedCharacter && (
              <div className="p-3 rounded-xl bg-amber-950/80 border border-amber-500/40 text-xs text-amber-200 flex items-center gap-2">
                <ShieldAlert size={15} className="text-amber-400 shrink-0" />
                <span>
                  이 캐릭터는 캐릭터 목록에서 삭제되었으나, 데이터 보호 정책에 따라 기존 채팅 메시지와 추억의 한조각이 안전하게 보존되어 열람이 가능합니다.
                </span>
              </div>
            )}

            {aiError && (
              <div className="p-3 rounded-xl bg-red-950/80 border border-red-500/40 text-xs text-red-200 flex items-center justify-between gap-2">
                <span>{aiError}</span>
                <button
                  type="button"
                  onClick={() => setAiError(null)}
                  className="text-red-300 hover:text-white shrink-0 cursor-pointer"
                >
                  닫기
                </button>
              </div>
            )}
          </div>
        )}

        {/* Messages Scroll Area */}
        <div className="relative z-10 flex-1 overflow-y-auto px-4 sm:px-7 py-5 space-y-5 cyber-scrollbar">
          {filteredMessages.length === 0 ? (
            <div className="my-12 p-5 rounded-2xl bg-[#130928]/80 border border-fuchsia-500/30 max-w-md mx-auto text-center space-y-2 backdrop-blur-xs">
              <Sparkles size={20} className="text-fuchsia-400 mx-auto" />
              <h3 className="text-sm font-bold text-white">
                {charName}와의 {currentMode === 'daily' ? '일상 대화' : '스토리 대화'}를 시작해 보세요
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                캐릭터의 성격, 말투, 세계관과 나의 분신 정보를 자동으로 참조하여 대화를 진행합니다.
              </p>
            </div>
          ) : (
            filteredMessages.map((msg) => {
              const isUser = msg.sender === 'user';
              const timeText = new Date(msg.timestamp).toLocaleTimeString('ko-KR', {
                hour: '2-digit',
                minute: '2-digit',
              });

              if (isUser) {
                return (
                  <div key={msg.id} className="flex flex-col items-end">
                    <CyberSpeechBubble
                      variant="user"
                      bubbleCustomization={bubbleCustomization}
                      assetUrls={assetUrls}
                    >
                      {msg.content}
                    </CyberSpeechBubble>
                    <div className="mt-1.5 mr-1 flex items-center gap-2.5 text-[11px] text-slate-400 tabular-nums">
                      <span>{timeText}</span>
                      {currentMode === 'daily' && (
                        <button
                          type="button"
                          onClick={() => handleToggleBookmark(msg.id)}
                          className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                            msg.isSavedFromCleanup
                              ? 'bg-fuchsia-500/30 text-fuchsia-200 font-semibold'
                              : 'hover:bg-white/10 text-slate-400'
                          }`}
                        >
                          <Bookmark size={10} />
                          <span>{msg.isSavedFromCleanup ? '보존됨' : '보존'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              }

              const segments =
                msg.segments && msg.segments.length > 0
                  ? msg.segments
                  : [
                      {
                        type: (msg.sender === 'narrator' ? 'narrator' : 'dialogue') as
                          | 'narrator'
                          | 'dialogue',
                        text: msg.content,
                      },
                    ];

              return (
                <div key={msg.id} className="space-y-3">
                  {segments.map((seg, segIdx) => {
                    if (seg.type === 'narrator') {
                      return (
                        <div
                          key={`${msg.id}-seg-${segIdx}`}
                          className="my-2 px-4 py-3 rounded-xl bg-[#140a2b]/85 border-l-4 border-fuchsia-400 border-y border-r border-indigo-500/25 text-xs sm:text-sm text-slate-200 leading-relaxed"
                        >
                          <div className="text-[11px] font-bold text-fuchsia-300 mb-1 flex items-center gap-1.5">
                            <Sparkles size={12} />
                            <span>사회자 묘사</span>
                          </div>
                          <div className="whitespace-pre-wrap break-words text-slate-200">
                            {seg.text}
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={`${msg.id}-seg-${segIdx}`} className="flex items-start gap-3">
                        <img
                          src={charAvatarUrl}
                          alt={charName}
                          referrerPolicy="no-referrer"
                          className="w-9 h-9 rounded-full border border-cyan-400/65 shadow-[0_0_10px_rgba(34,211,238,0.4)] object-cover shrink-0 mt-1"
                        />
                        <div className="flex flex-wrap items-end gap-2.5 max-w-[88%] sm:max-w-[78%]">
                          <CyberSpeechBubble
                            variant="opponent"
                            bubbleCustomization={bubbleCustomization}
                            assetUrls={assetUrls}
                            className="max-w-full"
                          >
                            {seg.text}
                          </CyberSpeechBubble>
                          {segIdx === segments.length - 1 && (
                            <div className="flex items-center gap-2 pb-1 text-[11px] text-slate-400 tabular-nums shrink-0">
                              <span>{timeText}</span>
                              {currentMode === 'daily' && (
                                <button
                                  type="button"
                                  onClick={() => handleToggleBookmark(msg.id)}
                                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                                    msg.isSavedFromCleanup
                                      ? 'bg-fuchsia-500/30 text-fuchsia-200 font-semibold'
                                      : 'hover:bg-white/10 text-slate-400'
                                  }`}
                                >
                                  <Bookmark size={10} />
                                  <span>{msg.isSavedFromCleanup ? '보존됨' : '보존'}</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}

          {isGenerating && (
            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-[#130a2b]/90 border border-cyan-400/40 w-fit text-xs text-cyan-200">
              <Loader2 size={14} className="animate-spin text-fuchsia-400" />
              <span>
                {isMakjangActive
                  ? `막장 모드 장면 연출 및 ${charName}의 응답을 생성하고 있습니다...`
                  : `${charName}의 응답을 생성하고 있습니다...`}
              </span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Bottom Message Input Bar (Matches 13943.png: Neon pink border, left +, center input, right glowing pink send) */}
        <form onSubmit={handleSendMessage} className="relative z-10 px-4 sm:px-6 py-3 shrink-0">
          <div
            className="cyber-input-shell h-[54px] rounded-full px-2 flex items-center gap-2.5"
            style={
              customInputBarUrl
                ? {
                    backgroundImage: `url("${customInputBarUrl}")`,
                    backgroundSize: '100% 100%',
                    backgroundRepeat: 'no-repeat',
                    borderColor: 'transparent',
                  }
                : undefined
            }
          >
            <button
              type="button"
              onClick={() => setShowRoomSettingsModal(true)}
              title="채팅방 부가 설정 및 추억의 한조각"
              aria-label="첨부 및 채팅방 설정"
              className="w-10 h-10 rounded-full bg-[#1d0c3b] hover:bg-[#31135f] border border-fuchsia-400/75 text-white flex items-center justify-center shadow-[0_0_12px_rgba(232,121,249,0.4)] transition-all shrink-0 cursor-pointer"
            >
              <Plus size={19} />
            </button>

            <input
              type="text"
              value={inputText}
              disabled={isGenerating}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="메시지를 입력하세요..."
              className="flex-1 bg-transparent px-2 text-sm text-white placeholder:text-slate-400 focus:outline-none disabled:opacity-60"
            />

            <button
              type="submit"
              disabled={isGenerating || !inputText.trim()}
              aria-label="메시지 전송"
              className="w-10 h-10 rounded-full bg-gradient-to-tr from-fuchsia-600 to-pink-500 hover:from-fuchsia-500 hover:to-pink-400 disabled:opacity-45 text-white flex items-center justify-center shadow-[0_0_16px_rgba(236,72,153,0.6)] transition-all shrink-0 cursor-pointer"
            >
              <Send size={17} />
            </button>
          </div>
        </form>
      </div>

      {/* Slide-Over Drawer for 추억의 한조각 & Character Reference (keeps 2-column layout clean like 13943.png) */}
      {showMemoriesDrawer && (
        <aside className="fixed inset-y-0 right-0 z-40 w-80 sm:w-96 flex flex-col h-full bg-[#100822]/98 border-l border-fuchsia-500/40 text-slate-100 overflow-y-auto p-4 space-y-5 shadow-2xl">
          <div className="flex items-center justify-between border-b border-fuchsia-500/25 pb-3">
            <div className="flex items-center gap-2">
              <HeartHandshake size={16} className="text-fuchsia-400" />
              <h3 className="text-sm font-bold text-white">추억의 한조각 및 참조 정보</h3>
            </div>
            <button
              type="button"
              onClick={() => setShowMemoriesDrawer(false)}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  src={charAvatarUrl}
                  alt={charName}
                  referrerPolicy="no-referrer"
                  className="w-10 h-10 rounded-xl border border-indigo-500/40 object-cover shrink-0"
                />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate">{charName}</div>
                  <div className="text-[11px] text-slate-400 truncate">
                    {activeRoom.promptOverride
                      ? '이 채팅방 전용 프롬프트 적용 중'
                      : character
                      ? '캐릭터 기본 설정 자동 참조 중'
                      : '삭제된 캐릭터 (기록 보존됨)'}
                  </div>
                </div>
              </div>
              {character && (
                <button
                  type="button"
                  onClick={() => setShowRoomSettingsModal(true)}
                  className="px-2.5 py-1.5 rounded-lg bg-indigo-950 hover:bg-indigo-900 border border-indigo-500/40 text-[11px] font-medium text-indigo-200 shrink-0 cursor-pointer"
                >
                  방 설정
                </button>
              )}
            </div>

            {character && (
              <div className="pt-2 border-t border-slate-800/80 text-xs space-y-1.5">
                <div>
                  <span className="text-[11px] font-semibold text-indigo-300">성격 및 정보: </span>
                  <span className="text-slate-300 line-clamp-2">{resolvedInfoAndPersonality}</span>
                </div>
                {resolvedSpeech && (
                  <div>
                    <span className="text-[11px] font-semibold text-pink-300">말투 및 행동: </span>
                    <span className="text-slate-300 line-clamp-2">{resolvedSpeech}</span>
                  </div>
                )}
                {resolvedWorldView && (
                  <div>
                    <span className="text-[11px] font-semibold text-sky-300">세계관 설정: </span>
                    <span className="text-slate-300 line-clamp-3 whitespace-pre-line">
                      {resolvedWorldView}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800 flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <UserCheck size={14} className="text-emerald-400 shrink-0" />
              <div className="truncate">
                <span className="text-slate-400">나의 분신: </span>
                <strong className="text-white">{userProfile?.name || '미등록'}</strong>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('characters')}
              className="text-[11px] text-emerald-300 hover:text-white underline shrink-0 cursor-pointer"
            >
              분신 관리
            </button>
          </div>

          <div className="space-y-3 flex-1 flex flex-col min-h-0">
            <div>
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-pink-300 flex items-center gap-1.5">
                  <BookOpen size={14} />
                  <span>추억의 한조각</span>
                </h4>
                <span className="text-[11px] text-slate-400">선택 입력</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                기억하고 싶은 사건, 약속, 관계 변화 등을 직접 기록하세요.
              </p>
            </div>

            {memorySaveStatus && (
              <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-xs text-emerald-200 flex items-center gap-1.5">
                <CheckCircle2 size={14} className="shrink-0" />
                <span>{memorySaveStatus}</span>
              </div>
            )}

            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={newMemoryInput}
                onChange={(e) => setNewMemoryInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddKeyMemory();
                  }
                }}
                placeholder="기억하고 싶은 사건이나 약속 입력..."
                className="flex-1 min-h-[38px] px-3 py-1.5 rounded-xl bg-slate-950 border border-indigo-500/30 text-xs text-white focus:outline-none focus:border-pink-500"
              />
              <button
                type="button"
                onClick={handleAddKeyMemory}
                className="min-h-[38px] px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <Plus size={13} />
                <span>기록</span>
              </button>
            </div>

            <div className="space-y-2 flex-1 overflow-y-auto pr-1">
              {keyMemories.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-950/60 border border-dashed border-slate-800 text-center text-xs text-slate-500">
                  등록된 추억의 한조각이 없습니다.
                </div>
              ) : (
                keyMemories.map((mem, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-slate-950/90 border border-indigo-500/20 text-xs text-slate-200 flex items-start justify-between gap-2"
                  >
                    {editingMemoryIdx === idx ? (
                      <div className="flex-1 flex items-center gap-1.5">
                        <input
                          type="text"
                          value={editingMemoryText}
                          onChange={(e) => setEditingMemoryText(e.target.value)}
                          className="flex-1 px-2 py-1 rounded bg-slate-900 border border-pink-500/50 text-xs text-white"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveEditMemory(idx)}
                          className="p-1 text-emerald-400 hover:text-emerald-300 cursor-pointer"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingMemoryIdx(null)}
                          className="p-1 text-slate-400 hover:text-white cursor-pointer"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="flex-1 leading-relaxed break-words">{mem}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleStartEditMemory(idx)}
                            className="p-1 text-slate-400 hover:text-indigo-300 cursor-pointer"
                          >
                            <Edit3 size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveKeyMemory(idx)}
                            className="p-1 text-slate-400 hover:text-red-400 cursor-pointer"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>

            {storyMemory && (
              <button
                type="button"
                onClick={() => persistMemoriesList(keyMemories, '추억의 한조각이 저장되었습니다.')}
                className="w-full min-h-[38px] px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Save size={13} />
                <span>수동 저장</span>
              </button>
            )}
          </div>
        </aside>
      )}

      {/* Existing Chat Room Settings Modal */}
      {showRoomSettingsModal && (
        <ChatRoomSettingsModal
          room={activeRoom}
          character={character || null}
          globalCustomization={globalCustomization}
          keyMemories={keyMemories}
          onSaveMemories={persistMemoriesList}
          onRoomSettingsChanged={onRoomUpdated}
          onClose={() => setShowRoomSettingsModal(false)}
        />
      )}
    </div>
  );
};
