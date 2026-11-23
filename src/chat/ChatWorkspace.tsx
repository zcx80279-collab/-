import React, { useState, useEffect, useRef } from 'react';
import {
  ChatRoom,
  Character,
  Message,
  StoryMemory,
  ChatMode,
  BubbleStyle,
  UserProfile,
  CustomizationSettings,
  GUIDE_RAVI_ID,
} from '../core/types';
import { storageService } from '../storage/storageService';
import { aiService } from '../ai/aiService';
import { DEFAULT_AVATARS } from '../core/defaultAssets';
import { GuideRaviChat } from '../guide/GuideRaviChat';
import { ChatRoomSettingsModal } from './ChatRoomSettingsModal';
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
  bubbleStyle: BubbleStyle;
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
  bubbleStyle,
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

  // 추억의 한조각 (User-managed memories) states
  const [storyMemory, setStoryMemory] = useState<StoryMemory | null>(null);
  const [keyMemories, setKeyMemories] = useState<string[]>([]);
  const [newMemoryInput, setNewMemoryInput] = useState('');
  const [editingMemoryIdx, setEditingMemoryIdx] = useState<number | null>(null);
  const [editingMemoryText, setEditingMemoryText] = useState('');
  const [memorySaveStatus, setMemorySaveStatus] = useState<string | null>(null);
  const [showMobileRightDrawer, setShowMobileRightDrawer] = useState(false);
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
      <div className="flex flex-col items-center justify-center h-full bg-slate-950/80 text-slate-400 p-6 text-center">
        <p className="text-sm font-medium text-slate-300">
          좌측 목록에서 채팅방을 선택하거나 새 대화방을 생성해 주세요.
        </p>
      </div>
    );
  }

  // Guide Ravi's official guide room (never uses AI API)
  if (activeRoom.characterId === GUIDE_RAVI_ID) {
    return (
      <div className="flex flex-col h-full">
        {onBackToMobileList && (
          <div className="md:hidden px-4 py-2.5 bg-slate-900 border-b border-indigo-500/30 flex items-center">
            <button
              type="button"
              onClick={onBackToMobileList}
              className="min-h-[38px] px-3 py-1.5 rounded-xl bg-slate-800 text-xs font-medium text-slate-200 flex items-center gap-1.5"
            >
              <ArrowLeft size={14} />
              <span>채팅 목록으로</span>
            </button>
          </div>
        )}
        <div className="flex-1 min-h-0">
          <GuideRaviChat onNavigateTab={onNavigateTab} />
        </div>
      </div>
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

    // Require 「나의 분신」 before starting actual AI character chat
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

    // If character still exists, generate response (single API call for narrator/makjang + character)
    if (character) {
      setIsGenerating(true);
      try {
        const modeHistory = afterUserMsgs
          .filter((m) => m.mode === currentMode && m.id !== userMsg.id);

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

  const getBubbleClass = (isUser: boolean) => {
    if (bubbleStyle === 'neon') {
      return isUser
        ? 'bg-slate-950/90 text-pink-100 border-2 border-pink-500 shadow-[0_0_12px_rgba(236,72,153,0.35)]'
        : 'bg-slate-950/90 text-sky-100 border-2 border-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.3)]';
    }
    if (bubbleStyle === 'solid') {
      return isUser
        ? 'bg-indigo-600 text-white border border-indigo-500'
        : 'bg-slate-800 text-slate-100 border border-slate-700';
    }
    return isUser
      ? 'bg-indigo-600/80 backdrop-blur-md text-white border border-indigo-400/40'
      : 'bg-slate-900/85 backdrop-blur-md text-slate-100 border border-indigo-500/30';
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Center Chat Area */}
      <div
        className="flex-1 flex flex-col h-full min-w-0 relative bg-cover bg-center"
        style={
          chatBackgroundUrl
            ? {
                backgroundImage: `url("${chatBackgroundUrl}")`,
              }
            : undefined
        }
      >
        {/* Dark Readability Scrim over custom chat background */}
        <div className="absolute inset-0 bg-slate-950/65 pointer-events-none" />

        {/* Chat Header */}
        <div
          className={`relative z-10 px-4 sm:px-5 py-3 backdrop-blur-md border-b flex flex-wrap items-center justify-between gap-3 shrink-0 transition-colors ${
            isMakjangActive
              ? 'bg-red-950/50 border-red-500/60 shadow-[inset_0_1px_0_rgba(239,68,68,0.4)]'
              : 'bg-slate-900/90 border-indigo-500/30'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {onBackToMobileList && (
              <button
                type="button"
                onClick={onBackToMobileList}
                className="md:hidden min-h-[38px] min-w-[38px] p-2 rounded-xl bg-slate-800 text-slate-200 flex items-center justify-center shrink-0"
                aria-label="채팅 목록으로 돌아가기"
              >
                <ArrowLeft size={16} />
              </button>
            )}
            <img
              src={charAvatarUrl}
              alt={charName}
              referrerPolicy="no-referrer"
              className={`w-10 h-10 rounded-xl object-cover shrink-0 ${
                isMakjangActive ? 'border-2 border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'border border-indigo-400/50'
              }`}
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-bold text-white truncate">{charName}</h2>
                {isMakjangActive && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-red-600/40 border border-red-500/80 text-[11px] font-extrabold text-red-200 shadow-[0_0_15px_rgba(239,68,68,0.4)] animate-pulse shrink-0">
                    <Flame size={13} className="text-red-400 animate-bounce" />
                    <span className="bg-gradient-to-r from-red-200 via-amber-200 to-red-200 bg-clip-text text-transparent">
                      극적 상황 연출 중
                    </span>
                  </div>
                )}
                {isDeletedCharacter && (
                  <span className="text-[11px] text-amber-300 font-medium shrink-0">
                    · 삭제된 캐릭터 (기록 보존됨)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 truncate">
                {activeRoom.promptOverride
                  ? '이 채팅방 전용 캐릭터·세계관 프롬프트 적용 중'
                  : character?.description || '캐릭터 설정 및 세계관 자동 참조 중'}
              </p>
            </div>
          </div>

          {/* Mode Switcher, Memories Drawer (mobile/tablet) & Chat Room Settings Icon */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="flex items-center p-1 rounded-xl bg-slate-950 border border-indigo-500/30">
              <button
                type="button"
                onClick={() => handleSwitchMode('daily')}
                className={`min-h-[32px] px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                  currentMode === 'daily'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                일상 모드
              </button>
              <button
                type="button"
                onClick={() => handleSwitchMode('story')}
                className={`min-h-[32px] px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 whitespace-nowrap ${
                  currentMode === 'story'
                    ? 'bg-pink-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <BookOpen size={12} />
                <span>스토리 모드</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowMobileRightDrawer(!showMobileRightDrawer)}
              className="xl:hidden min-h-[36px] px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-indigo-500/30 text-xs font-medium text-indigo-200 flex items-center gap-1.5 whitespace-nowrap"
            >
              <SlidersHorizontal size={13} />
              <span>추억의 한조각</span>
            </button>

            <button
              type="button"
              onClick={() => setShowRoomSettingsModal(true)}
              title="채팅방 설정 (PNG 꾸미기 · 프롬프트 · 추억의 한조각 · 막장 모드)"
              aria-label="채팅방 설정 열기"
              className={`min-h-[36px] px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                isMakjangActive
                  ? 'bg-red-950/80 hover:bg-red-900/80 border-red-500/50 text-red-200'
                  : 'bg-slate-800 hover:bg-slate-700 border-indigo-500/40 text-slate-100'
              }`}
            >
              <Settings size={15} className={isMakjangActive ? 'text-red-400' : 'text-pink-400'} />
              <span className="hidden sm:inline">채팅방 설정</span>
            </button>
          </div>
        </div>

        {/* Notices */}
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
                className="text-red-300 hover:text-white shrink-0"
              >
                닫기
              </button>
            </div>
          )}
        </div>

        {/* Messages Scroll Area */}
        <div className="relative z-10 flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {filteredMessages.length === 0 ? (
            <div className="my-12 p-6 rounded-2xl bg-slate-900/80 border border-indigo-500/20 max-w-md mx-auto text-center space-y-2">
              <Sparkles size={22} className="text-pink-400 mx-auto" />
              <h3 className="text-sm font-bold text-white">
                {charName}와의 {currentMode === 'daily' ? '일상 대화' : '스토리 대화'}를 시작해 보세요
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                캐릭터의 성격, 말투, 세계관과 나의 분신 정보를 자동으로 참조하여 대화를 진행합니다.
                {isMakjangActive
                  ? ' 현재 이 채팅방은 막장 모드가 활성화되어 있습니다.'
                  : ' 대화 상황에 따라 일반 사회자가 자연스럽게 장면을 연출합니다.'}
              </p>
            </div>
          ) : (
            filteredMessages.map((msg) => {
              const isUser = msg.sender === 'user';

              if (isUser) {
                return (
                  <div key={msg.id} className="flex justify-end items-start gap-2.5">
                    <div
                      className={`max-w-[85%] sm:max-w-[70%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${getBubbleClass(
                        true
                      )}`}
                    >
                      <div className="text-[11px] font-bold text-pink-200 mb-0.5">
                        {userProfile?.name || '사용자'}
                      </div>
                      <div className="whitespace-pre-line break-words">{msg.content}</div>
                      <div className="flex items-center justify-end gap-3 mt-1.5 text-[11px] text-slate-300/80 tabular-nums">
                        <span>
                          {new Date(msg.timestamp).toLocaleTimeString('ko-KR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {currentMode === 'daily' && (
                          <button
                            type="button"
                            onClick={() => handleToggleBookmark(msg.id)}
                            className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors ${
                              msg.isSavedFromCleanup
                                ? 'bg-pink-500/30 text-pink-200 font-semibold'
                                : 'hover:bg-white/10 text-slate-300'
                            }`}
                          >
                            <Bookmark size={11} />
                            <span>{msg.isSavedFromCleanup ? '보존됨' : '보존'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }

              // Character / Narrator response rendering (Requirement 9: Visually distinguish narrator scene description vs character dialogue bubble)
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
                <div key={msg.id} className="space-y-2.5">
                  {segments.map((seg, segIdx) => {
                    if (seg.type === 'narrator') {
                      // Scene description block (NOT a character speech bubble)
                      return (
                        <div
                          key={`${msg.id}-seg-${segIdx}`}
                          className="my-2 px-4 py-3 rounded-xl bg-slate-900/75 border-l-4 border-pink-500/70 border-y border-r border-indigo-500/20 text-xs sm:text-sm text-slate-200 leading-relaxed shadow-sm"
                        >
                          <div className="text-[11px] font-bold text-pink-300 mb-1 flex items-center gap-1.5">
                            <Sparkles size={12} />
                            <span>사회자 묘사</span>
                          </div>
                          <div className="whitespace-pre-line break-words text-slate-200">
                            {seg.text}
                          </div>
                        </div>
                      );
                    }

                    // Character dialogue speech bubble
                    return (
                      <div
                        key={`${msg.id}-seg-${segIdx}`}
                        className="flex justify-start items-start gap-2.5"
                      >
                        <img
                          src={charAvatarUrl}
                          alt={charName}
                          referrerPolicy="no-referrer"
                          className="w-8 h-8 rounded-lg border border-indigo-400/40 object-cover shrink-0 mt-1"
                        />
                        <div
                          className={`max-w-[85%] sm:max-w-[70%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${getBubbleClass(
                            false
                          )}`}
                        >
                          <div className="text-xs font-bold text-sky-300 mb-1">{charName}</div>
                          <div className="whitespace-pre-line break-words">{seg.text}</div>
                          {segIdx === segments.length - 1 && (
                            <div className="flex items-center justify-end gap-3 mt-1.5 text-[11px] text-slate-400 tabular-nums">
                              <span>
                                {new Date(msg.timestamp).toLocaleTimeString('ko-KR', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                              {currentMode === 'daily' && (
                                <button
                                  type="button"
                                  onClick={() => handleToggleBookmark(msg.id)}
                                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors ${
                                    msg.isSavedFromCleanup
                                      ? 'bg-pink-500/30 text-pink-200 font-semibold'
                                      : 'hover:bg-white/10 text-slate-400'
                                  }`}
                                >
                                  <Bookmark size={11} />
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
            <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-slate-900/80 border border-indigo-500/30 w-fit text-xs text-indigo-200">
              <Loader2 size={14} className="animate-spin text-pink-400" />
              <span>
                {isMakjangActive
                  ? `막장 모드 장면 연출 및 ${charName}의 응답을 생성하고 있습니다...`
                  : `장면 연출 및 ${charName}의 응답을 생성하고 있습니다...`}
              </span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Message Input Bar */}
        <form
          onSubmit={handleSendMessage}
          className="relative z-10 p-3.5 sm:p-4 bg-slate-900/95 border-t border-indigo-500/30 shrink-0"
        >
          <div className="flex items-center gap-2.5">
            <input
              type="text"
              value={inputText}
              disabled={isGenerating}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`${charName}에게 대사나 행동을 입력하세요...`}
              className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-950 border border-indigo-500/40 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-pink-500 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={isGenerating || !inputText.trim()}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-xs font-semibold text-white flex items-center gap-1.5 transition-colors shrink-0"
            >
              <Send size={14} />
              <span>전송</span>
            </button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 mt-1.5 px-1 text-[11px] text-slate-400">
            <span>
              나의 분신:{' '}
              <strong className="text-emerald-300">{userProfile?.name || '미등록'}</strong>
              {isMakjangActive && (
                <>
                  {' · '}
                  <strong className="text-red-300">막장 모드 활성화됨</strong>
                </>
              )}
            </span>
            <span>
              추억의 한조각:{' '}
              {keyMemories.length > 0 ? `${keyMemories.length}개 참조 중` : '비어 있음 (API 미전송)'}
            </span>
          </div>
        </form>
      </div>

      {/* Right Column: Auto-Referenced Character Summary & 추억의 한조각 (No character/worldView inputs here per Section 2) */}
      <aside
        className={`${
          showMobileRightDrawer
            ? 'fixed inset-y-0 right-0 z-40 w-80 sm:w-96 flex'
            : 'hidden xl:flex xl:w-80 2xl:w-96'
        } flex-col h-full bg-slate-900/95 border-l border-indigo-500/30 text-slate-100 overflow-y-auto p-4 space-y-5 shrink-0 shadow-2xl`}
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <HeartHandshake size={16} className="text-pink-400" />
            <h3 className="text-sm font-bold text-white">추억의 한조각 및 참조 정보</h3>
          </div>
          {showMobileRightDrawer && (
            <button
              type="button"
              onClick={() => setShowMobileRightDrawer(false)}
              className="xl:hidden px-2.5 py-1 rounded-lg bg-slate-800 text-xs text-slate-300"
            >
              닫기
            </button>
          )}
        </div>

        {/* Read-only Character & Worldview Reference Card (Editable in CharacterManager) */}
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
                className="px-2.5 py-1.5 rounded-lg bg-indigo-950 hover:bg-indigo-900 border border-indigo-500/40 text-[11px] font-medium text-indigo-200 shrink-0"
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

        {/* User Persona ("나의 분신") Reference Badge */}
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
            className="text-[11px] text-emerald-300 hover:text-white underline shrink-0"
          >
            분신 관리
          </button>
        </div>

        {/* Requirement 3: 추억의 한조각 (User-Managed Memories) */}
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
              기억하고 싶은 사건, 약속, 관계 변화 등을 직접 기록하세요. AI는 참조만 하며 임의로 추가·수정·삭제할 수 없습니다. 비워두면 API 요청에 포함되지 않습니다.
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
              placeholder="기억하고 싶은 사건이나 약속 입력 (선택)..."
              className="flex-1 min-h-[38px] px-3 py-1.5 rounded-xl bg-slate-950 border border-indigo-500/30 text-xs text-white focus:outline-none focus:border-pink-500"
            />
            <button
              type="button"
              onClick={handleAddKeyMemory}
              className="min-h-[38px] px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white flex items-center gap-1 shrink-0"
            >
              <Plus size={13} />
              <span>기록</span>
            </button>
          </div>

          <div className="space-y-2 flex-1 overflow-y-auto pr-1">
            {keyMemories.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center space-y-1">
                <p className="text-xs text-slate-400">기록된 추억의 한조각이 없습니다.</p>
                <p className="text-[11px] text-slate-500">
                  작성하지 않은 경우 빈 상태로 유지되며 API 요청에 기억 항목을 전송하지 않습니다.
                </p>
              </div>
            ) : (
              keyMemories.map((mem, idx) => (
                <div
                  key={`${idx}-${mem.slice(0, 12)}`}
                  className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 space-y-2"
                >
                  {editingMemoryIdx === idx ? (
                    <div className="space-y-2">
                      <textarea
                        rows={2}
                        value={editingMemoryText}
                        onChange={(e) => setEditingMemoryText(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-pink-500/50 text-xs text-white focus:outline-none"
                      />
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditingMemoryIdx(null)}
                          className="px-2 py-1 rounded bg-slate-800 text-[11px] text-slate-300 flex items-center gap-1"
                        >
                          <X size={11} />
                          <span>취소</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEditMemory(idx)}
                          className="px-2.5 py-1 rounded bg-pink-600 text-[11px] font-semibold text-white flex items-center gap-1"
                        >
                          <Check size={11} />
                          <span>저장</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-2">
                      <span className="leading-relaxed break-words flex-1">• {mem}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleStartEditMemory(idx)}
                          className="p-1 text-slate-400 hover:text-indigo-300"
                          title="추억 수정"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveKeyMemory(idx)}
                          className="p-1 text-slate-500 hover:text-red-400"
                          title="추억 삭제"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          <button
            type="button"
            onClick={() => persistMemoriesList(keyMemories, '추억의 한조각이 저장되었습니다.')}
            className="w-full min-h-[40px] py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-xs font-semibold text-white flex items-center justify-center gap-1.5 shadow-lg shadow-pink-600/20 transition-colors shrink-0"
          >
            <Save size={14} />
            <span>추억의 한조각 저장</span>
          </button>
        </div>
      </aside>

      {/* Per-Room Settings Modal (PNG Customization, Room Prompts, Memories, Makjang Mode) */}
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
