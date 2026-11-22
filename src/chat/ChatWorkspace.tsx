import React, { useState, useEffect, useRef } from 'react';
import {
  ChatRoom,
  Character,
  Message,
  StoryMemory,
  ChatMode,
  BubbleStyle,
  GUIDE_RAVI_ID,
} from '../core/types';
import { storageService } from '../storage/storageService';
import { DEFAULT_AVATARS } from '../core/defaultAssets';
import { GuideRaviChat } from '../guide/GuideRaviChat';
import {
  Send,
  BookOpen,
  Sparkles,
  Bookmark,
  Plus,
  Trash2,
  Save,
  Info,
  SlidersHorizontal,
  ArrowLeft,
  ShieldAlert,
  CheckCircle2,
} from 'lucide-react';

interface ChatWorkspaceProps {
  activeRoom: ChatRoom | null;
  charactersMap: Record<string, Character>;
  assetUrls: Record<string, string>;
  chatBackgroundUrl: string;
  bubbleStyle: BubbleStyle;
  onRoomUpdated: () => void;
  onNavigateTab: (tab: 'chat' | 'community' | 'characters' | 'customization' | 'settings' | 'report') => void;
  onBackToMobileList?: () => void;
}

export const ChatWorkspace: React.FC<ChatWorkspaceProps> = ({
  activeRoom,
  charactersMap,
  assetUrls,
  chatBackgroundUrl,
  bubbleStyle,
  onRoomUpdated,
  onNavigateTab,
  onBackToMobileList,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [currentMode, setCurrentMode] = useState<ChatMode>('daily');

  // Story Mode states
  const [storyMemory, setStoryMemory] = useState<StoryMemory | null>(null);
  const [worldView, setWorldView] = useState('');
  const [relationships, setRelationships] = useState('');
  const [startingSituation, setStartingSituation] = useState('');
  const [keyMemories, setKeyMemories] = useState<string[]>([]);
  const [newMemoryInput, setNewMemoryInput] = useState('');
  const [storySaveStatus, setStorySaveStatus] = useState<string | null>(null);
  const [showMobileRightDrawer, setShowMobileRightDrawer] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeRoom) {
      setCurrentMode(activeRoom.mode);
      loadRoomMessagesAndStory(activeRoom);
    }
  }, [activeRoom?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, currentMode]);

  const loadRoomMessagesAndStory = async (room: ChatRoom) => {
    const [msgs, story] = await Promise.all([
      storageService.getMessagesByRoom(room.id),
      storageService.getStoryMemory(room.characterId),
    ]);
    setMessages(msgs);
    setStoryMemory(story);
    setWorldView(story.worldView);
    setRelationships(story.relationships);
    setStartingSituation(story.startingSituation);
    setKeyMemories(story.keyMemories || []);
  };

  if (!activeRoom) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-slate-950/80 text-slate-400 p-6 text-center">
        <p className="text-sm font-medium text-slate-300">좌측 목록에서 채팅방을 선택하거나 새 대화방을 생성해 주세요.</p>
      </div>
    );
  }

  // If the selected room is Guide Ravi's official guide room, render GuideRaviChat
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

  const handleSwitchMode = async (mode: ChatMode) => {
    setCurrentMode(mode);
    await storageService.updateRoomMode(activeRoom.id, mode);
    onRoomUpdated();
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    await storageService.addMessage({
      roomId: activeRoom.id,
      sender: 'user',
      content: inputText.trim(),
      mode: currentMode,
      isSavedFromCleanup: currentMode === 'story',
    });

    setInputText('');
    const updatedMsgs = await storageService.getMessagesByRoom(activeRoom.id);
    setMessages(updatedMsgs);
    onRoomUpdated();
  };

  const handleToggleBookmark = async (msgId: string) => {
    await storageService.toggleMessageBookmark(msgId);
    const updatedMsgs = await storageService.getMessagesByRoom(activeRoom.id);
    setMessages(updatedMsgs);
  };

  const handleAddKeyMemory = () => {
    if (!newMemoryInput.trim()) return;
    setKeyMemories((prev) => [...prev, newMemoryInput.trim()]);
    setNewMemoryInput('');
  };

  const handleRemoveKeyMemory = (index: number) => {
    setKeyMemories((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSaveStorySettings = async () => {
    if (!storyMemory) return;
    const saved = await storageService.saveStoryMemory({
      ...storyMemory,
      worldView,
      relationships,
      startingSituation,
      keyMemories,
    });
    setStoryMemory(saved);
    setStorySaveStatus('스토리 설정 및 중요 기억이 IndexedDB "stories" 스토어에 저장되었습니다.');
    setTimeout(() => setStorySaveStatus(null), 3500);
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
    // default 'glass'
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
        <div className="relative z-10 px-4 sm:px-5 py-3 bg-slate-900/90 backdrop-blur-md border-b border-indigo-500/30 flex flex-wrap items-center justify-between gap-3 shrink-0">
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
              className="w-10 h-10 rounded-xl border border-indigo-400/50 object-cover shrink-0"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white truncate">{charName}</h2>
                {isDeletedCharacter && (
                  <span className="text-[11px] text-amber-300 font-medium shrink-0">
                    · 삭제된 캐릭터 (기록 보존됨)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 truncate">
                {currentMode === 'daily'
                  ? '일상 모드 · 보존 북마크 설정 가능 (1단계 자동 삭제 미실행)'
                  : '스토리 모드 · 세계관/중요 기억 연동 · 자동 삭제 영구 금지'}
              </p>
            </div>
          </div>

          {/* Mode Switcher & Right Panel Trigger */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center p-1 rounded-xl bg-slate-950 border border-indigo-500/30">
              <button
                type="button"
                onClick={() => handleSwitchMode('daily')}
                className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
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
                className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 whitespace-nowrap ${
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
              className="xl:hidden min-h-[38px] px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-indigo-500/30 text-xs font-medium text-indigo-200 flex items-center gap-1.5 whitespace-nowrap"
            >
              <SlidersHorizontal size={13} />
              <span>캐릭터·스토리 설정</span>
            </button>
          </div>
        </div>

        {/* Phase 1 Notice Banner & Deleted Character Protection Notice */}
        <div className="relative z-10 px-4 sm:px-6 pt-3 space-y-2 shrink-0">
          {isDeletedCharacter && (
            <div className="p-3 rounded-xl bg-amber-950/80 border border-amber-500/40 text-xs text-amber-200 flex items-center gap-2">
              <ShieldAlert size={15} className="text-amber-400 shrink-0" />
              <span>
                이 캐릭터는 캐릭터 목록에서 삭제되었으나, 데이터 보호 정책에 따라 기존 채팅 메시지와 스토리 중요 기억이 안전하게 보존되어 열람 및 추가 기록이 가능합니다.
              </span>
            </div>
          )}

          {currentMode === 'story' && (startingSituation || worldView) && (
            <div className="p-3 rounded-xl bg-pink-950/60 border border-pink-500/30 text-xs text-pink-100 space-y-1">
              <div className="font-semibold text-pink-300 flex items-center gap-1.5">
                <BookOpen size={13} />
                <span>스토리 모드 배경 및 시작 상황 (기록 자동 삭제 금지 공간)</span>
              </div>
              {worldView && <p className="text-slate-200">• 세계관: {worldView}</p>}
              {startingSituation && <p className="text-slate-200">• 시작 상황: {startingSituation}</p>}
            </div>
          )}
        </div>

        {/* Messages Scroll Area */}
        <div className="relative z-10 flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5">
          {filteredMessages.length === 0 ? (
            <div className="my-12 p-6 rounded-2xl bg-slate-900/80 border border-indigo-500/20 max-w-md mx-auto text-center space-y-2">
              <Sparkles size={22} className="text-pink-400 mx-auto" />
              <h3 className="text-sm font-bold text-white">
                {currentMode === 'daily' ? '일상 모드 대화 공간' : '스토리 모드 대화 공간'}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                아직 저장된 [{currentMode === 'daily' ? '일상 모드' : '스토리 모드'}] 메시지가 없습니다. 아래 입력창에 메시지를 입력하면 IndexedDB &quot;messages&quot; 스토어에 즉시 로컬 저장됩니다.
              </p>
              <p className="text-[11px] text-indigo-300/90 pt-1">
                * 1단계 지시서 원칙: 실제 AI API 호출이나 가짜 AI 응답 자동 생성을 수행하지 않고 사용자 메시지 로컬 저장 구조를 검증합니다.
              </p>
            </div>
          ) : (
            filteredMessages.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex ${isUser ? 'justify-end' : 'justify-start'} items-start gap-2.5`}
                >
                  {!isUser && (
                    <img
                      src={charAvatarUrl}
                      alt={charName}
                      referrerPolicy="no-referrer"
                      className="w-8 h-8 rounded-lg border border-indigo-400/40 object-cover shrink-0 mt-1"
                    />
                  )}
                  <div className={`max-w-[85%] sm:max-w-[70%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${getBubbleClass(isUser)}`}>
                    <div className="whitespace-pre-line break-words">{msg.content}</div>
                    <div className="flex items-center justify-end gap-3 mt-1.5 text-[11px] text-slate-300/80 tabular-nums">
                      <span>
                        {msg.mode === 'story' ? '스토리 기록 (영구 보존)' : '일상 기록'} ·{' '}
                        {new Date(msg.timestamp).toLocaleTimeString('ko-KR', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </span>
                      {currentMode === 'daily' && (
                        <button
                          type="button"
                          onClick={() => handleToggleBookmark(msg.id)}
                          title="향후 3일 자동 정리 제외 북마크"
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
                  </div>
                </div>
              );
            })
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
              onChange={(e) => setInputText(e.target.value)}
              placeholder={
                currentMode === 'daily'
                  ? `${charName}에게 일상 메시지 입력 (로컬 IndexedDB 저장, 가짜 AI 응답 없음)...`
                  : `${charName} 스토리 모드 대사 또는 지문 입력 (영구 보존)...`
              }
              className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-950 border border-indigo-500/40 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-pink-500"
            />
            <button
              type="submit"
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white flex items-center gap-1.5 transition-colors shrink-0"
            >
              <Send size={14} />
              <span>메시지 저장</span>
            </button>
          </div>
          <div className="flex items-center justify-between mt-1.5 px-1 text-[11px] text-slate-400">
            <span>
              현재 모드: <strong className="text-indigo-300">{currentMode === 'daily' ? '일상 모드' : '스토리 모드'}</strong>
            </span>
            <span>1단계: 사용자 메시지 로컬 저장 완료 (AI 응답 생성 미호출)</span>
          </div>
        </form>
      </div>

      {/* Right Column: Character Info & Story Mode Settings / Key Memories (PC Always Visible, Mobile Drawer) */}
      <aside
        className={`${
          showMobileRightDrawer
            ? 'fixed inset-y-0 right-0 z-40 w-80 sm:w-96 flex'
            : 'hidden xl:flex xl:w-80 2xl:w-96'
        } flex-col h-full bg-slate-900/95 border-l border-indigo-500/30 text-slate-100 overflow-y-auto p-4 space-y-5 shrink-0 shadow-2xl`}
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Info size={16} className="text-pink-400" />
            <h3 className="text-sm font-bold text-white">캐릭터 정보 및 스토리 설정</h3>
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

        {/* Character Summary */}
        <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2">
          <div className="flex items-center gap-3">
            <img
              src={charAvatarUrl}
              alt={charName}
              referrerPolicy="no-referrer"
              className="w-12 h-12 rounded-xl border border-indigo-500/40 object-cover"
            />
            <div className="min-w-0">
              <div className="text-sm font-bold text-white truncate">{charName}</div>
              <div className="text-[11px] text-slate-400 truncate">
                {character ? character.description : '캐릭터 삭제됨 (대화 및 스토리 보존 상태)'}
              </div>
            </div>
          </div>
          {character && (
            <div className="pt-2 border-t border-slate-800/80 text-xs text-slate-300">
              <div className="text-[11px] font-semibold text-indigo-300 mb-1">캐릭터 기본 프롬프트</div>
              <p className="text-slate-400 leading-relaxed">{character.systemPrompt}</p>
            </div>
          )}
        </div>

        {/* Story Mode Configuration & Key Memories */}
        <div className="space-y-3.5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-pink-300 flex items-center gap-1.5">
              <BookOpen size={14} />
              <span>스토리 모드 전용 설정 (별도 저장)</span>
            </h4>
            <span className="text-[11px] text-slate-400">글자 수 제한 없음</span>
          </div>

          {storySaveStatus && (
            <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-xs text-emerald-200 flex items-center gap-1.5">
              <CheckCircle2 size={14} className="shrink-0" />
              <span>{storySaveStatus}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">세계관 설명</label>
            <textarea
              rows={2}
              value={worldView}
              onChange={(e) => setWorldView(e.target.value)}
              placeholder="스토리 모드의 배경 세계관을 자유롭게 입력하세요..."
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-indigo-500/30 text-xs text-white focus:outline-none focus:border-pink-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">사용자와의 관계 설정</label>
            <textarea
              rows={2}
              value={relationships}
              onChange={(e) => setRelationships(e.target.value)}
              placeholder="캐릭터와 사용자의 관계 설정을 입력하세요..."
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-indigo-500/30 text-xs text-white focus:outline-none focus:border-pink-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">스토리 시작 상황</label>
            <textarea
              rows={2}
              value={startingSituation}
              onChange={(e) => setStartingSituation(e.target.value)}
              placeholder="이야기가 시작되는 장면과 상황을 입력하세요..."
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-indigo-500/30 text-xs text-white focus:outline-none focus:border-pink-500"
            />
          </div>

          {/* User-Managed Key Memories */}
          <div className="pt-2 border-t border-slate-800 space-y-2.5">
            <div>
              <div className="text-xs font-bold text-indigo-200">사용자 직접 관리 중요 기억</div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                중요 기억은 AI가 임의로 작성·수정하지 않으며 사용자가 직접 관리합니다.
              </p>
            </div>

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
                placeholder="새 중요 기억 입력 (글자 수 제한 없음)..."
                className="flex-1 min-h-[38px] px-3 py-1.5 rounded-xl bg-slate-950 border border-indigo-500/30 text-xs text-white focus:outline-none focus:border-pink-500"
              />
              <button
                type="button"
                onClick={handleAddKeyMemory}
                className="min-h-[38px] px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white flex items-center gap-1 shrink-0"
              >
                <Plus size={13} />
                <span>추가</span>
              </button>
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {keyMemories.length === 0 ? (
                <p className="text-xs text-slate-500 py-2 text-center">등록된 중요 기억이 없습니다.</p>
              ) : (
                keyMemories.map((mem, idx) => (
                  <div
                    key={`${idx}-${mem.slice(0, 12)}`}
                    className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-start justify-between gap-2 text-xs text-slate-200"
                  >
                    <span className="leading-relaxed break-words">• {mem}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveKeyMemory(idx)}
                      className="p-1 text-slate-500 hover:text-red-400 shrink-0"
                      title="기억 삭제"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleSaveStorySettings}
            className="w-full min-h-[42px] py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-xs font-semibold text-white flex items-center justify-center gap-1.5 shadow-lg shadow-pink-600/20 transition-colors"
          >
            <Save size={14} />
            <span>스토리 설정 및 중요 기억 저장</span>
          </button>
        </div>
      </aside>
    </div>
  );
};
