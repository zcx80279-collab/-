import React, { useState, useEffect, useRef } from 'react';
import {
  ChatRoom,
  Character,
  CustomizationSettings,
  Asset,
  ThemeMode,
  BubbleStyle,
} from '../core/types';
import { storageService } from '../storage/storageService';
import {
  X,
  Settings,
  Palette,
  Frame,
  Image as ImageIcon,
  Upload,
  RotateCcw,
  Save,
  Trash2,
  FileEdit,
  BookOpen,
  Plus,
  Edit3,
  Check,
  Flame,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface ChatRoomSettingsModalProps {
  room: ChatRoom;
  character: Character | null;
  globalCustomization: CustomizationSettings;
  keyMemories: string[];
  onSaveMemories: (updatedList: string[], statusMsg: string) => Promise<void>;
  onRoomSettingsChanged: () => Promise<void> | void;
  onClose: () => void;
}

type ModalSection = 'png' | 'prompt' | 'memories';

const THEME_OPTIONS: { id: ThemeMode; label: string; desc: string }[] = [
  { id: 'dark-indigo', label: '다크 인디고 (기본)', desc: '깊은 인디고와 네온 바이올렛 글래스' },
  { id: 'black', label: '사이버 블랙', desc: '고대비 블랙 캔버스와 시안 포인트' },
  { id: 'violet', label: '로열 바이올렛', desc: '풍부한 퍼플 톤과 네온 마젠타' },
  { id: 'neon-pink', label: '네온 핑크', desc: '사이버 핑크 하이라이트' },
  { id: 'neon-blue', label: '네온 블루', desc: '홀로그램 블루 및 딥 네이비' },
];

const BUBBLE_OPTIONS: { id: BubbleStyle; label: string; desc: string }[] = [
  { id: 'glass', label: '반투명 글래스 (기본)', desc: '배경이 은은하게 투과되는 글래스모피즘 말풍선' },
  { id: 'neon', label: '사이버 네온 보더', desc: '네온 핑크/블루 발광 테두리 말풍선' },
  { id: 'solid', label: '솔리드 고대비', desc: '가독성을 극대화한 불투명 단색 말풍선' },
];

function getDefaultCharacterInfoAndPersonality(character: Character | null): string {
  if (!character) return '';
  const parts: string[] = [];
  if (character.systemPrompt?.trim()) parts.push(character.systemPrompt.trim());
  const personality = String(character.customSettings?.personality || '').trim();
  if (personality && !parts.join('\n').includes(personality)) {
    parts.push(`성격: ${personality}`);
  }
  return parts.join('\n');
}

function getDefaultSpeechAndBehavior(character: Character | null): string {
  if (!character) return '';
  return (
    character.speechAndBehavior ||
    String(character.customSettings?.speechAndBehavior || character.customSettings?.greetingStyle || '')
  ).trim();
}

function getDefaultWorldView(character: Character | null): string {
  if (!character) return '';
  return (character.worldView || '').trim();
}

export const ChatRoomSettingsModal: React.FC<ChatRoomSettingsModalProps> = ({
  room,
  character,
  globalCustomization,
  keyMemories,
  onSaveMemories,
  onRoomSettingsChanged,
  onClose,
}) => {
  const [activeSection, setActiveSection] = useState<ModalSection>('png');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // 6-1. Room-scoped PNG Customization states (fallback to globalCustomization)
  const [theme, setTheme] = useState<ThemeMode>(room.customization?.theme ?? globalCustomization.theme);
  const [frameAssetId, setFrameAssetId] = useState<string>(
    room.customization?.frameAssetId ?? globalCustomization.frameAssetId
  );
  const [chatBackgroundAssetId, setChatBackgroundAssetId] = useState<string>(
    room.customization?.chatBackgroundAssetId ?? globalCustomization.chatBackgroundAssetId
  );
  const [bubbleStyle, setBubbleStyle] = useState<BubbleStyle>(
    room.customization?.bubbleStyle ?? globalCustomization.bubbleStyle
  );
  const [assets, setAssets] = useState<Asset[]>([]);

  // 6-2. Room-scoped Character & Worldview Prompt Override states
  const [promptInfo, setPromptInfo] = useState<string>(
    room.promptOverride?.characterInfoAndPersonality ?? getDefaultCharacterInfoAndPersonality(character)
  );
  const [promptSpeech, setPromptSpeech] = useState<string>(
    room.promptOverride?.speechAndBehavior ?? getDefaultSpeechAndBehavior(character)
  );
  const [promptWorldView, setPromptWorldView] = useState<string>(
    room.promptOverride?.worldView ?? getDefaultWorldView(character)
  );
  const [hasPromptOverride, setHasPromptOverride] = useState<boolean>(Boolean(room.promptOverride));

  // 6-3. 추억의 한조각 states
  const [newMemoryInput, setNewMemoryInput] = useState('');
  const [editingMemoryIdx, setEditingMemoryIdx] = useState<number | null>(null);
  const [editingMemoryText, setEditingMemoryText] = useState('');

  // 6-4. 막장 모드 states
  const [makjangMode, setMakjangMode] = useState<boolean>(Boolean(room.makjangMode));
  const [showMakjangWarning, setShowMakjangWarning] = useState<boolean>(false);

  const frameFileInputRef = useRef<HTMLInputElement>(null);
  const chatBgFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTheme(room.customization?.theme ?? globalCustomization.theme);
    setFrameAssetId(room.customization?.frameAssetId ?? globalCustomization.frameAssetId);
    setChatBackgroundAssetId(
      room.customization?.chatBackgroundAssetId ?? globalCustomization.chatBackgroundAssetId
    );
    setBubbleStyle(room.customization?.bubbleStyle ?? globalCustomization.bubbleStyle);
    setPromptInfo(
      room.promptOverride?.characterInfoAndPersonality ?? getDefaultCharacterInfoAndPersonality(character)
    );
    setPromptSpeech(
      room.promptOverride?.speechAndBehavior ?? getDefaultSpeechAndBehavior(character)
    );
    setPromptWorldView(room.promptOverride?.worldView ?? getDefaultWorldView(character));
    setHasPromptOverride(Boolean(room.promptOverride));
    setMakjangMode(Boolean(room.makjangMode));
    loadAssets();
  }, [room.id, room.updatedAt, globalCustomization]);

  const loadAssets = async () => {
    const all = await storageService.getAllAssets();
    setAssets(all);
  };

  const frameAssets = assets.filter((a) => a.type === 'frame');
  const chatBgAssets = assets.filter((a) => a.type === 'chat-bg' || a.type === 'background');
  const selectedFrameAsset = assets.find((a) => a.id === frameAssetId);
  const selectedChatBgAsset = assets.find((a) => a.id === chatBackgroundAssetId);

  // --- PNG Customization Handlers (Room-scoped) ---
  const persistRoomPng = async (next: {
    theme: ThemeMode;
    frameAssetId: string;
    chatBackgroundAssetId: string;
    bubbleStyle: BubbleStyle;
  }) => {
    await storageService.updateRoomSettings(room.id, {
      customization: {
        theme: next.theme,
        frameAssetId: next.frameAssetId,
        chatBackgroundAssetId: next.chatBackgroundAssetId,
        bubbleStyle: next.bubbleStyle,
      },
    });
    await onRoomSettingsChanged();
  };

  const handleUploadFrame = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { asset, deduplicated } = await storageService.registerAssetFromFile(
        file,
        'frame',
        `커스텀 프레임: ${file.name}`
      );
      await loadAssets();
      setFrameAssetId(asset.id);
      await persistRoomPng({
        theme,
        frameAssetId: asset.id,
        chatBackgroundAssetId,
        bubbleStyle,
      });
      setStatusMsg({
        type: 'success',
        text: deduplicated
          ? `동일한 이미지가 이미 등록되어 있어 중복 저장 없이 기존 프레임(${asset.name})을 현재 채팅방에 적용했습니다.`
          : `새 채팅 프레임(${asset.name})을 등록하고 현재 채팅방에 적용했습니다.`,
      });
    } catch (err) {
      setStatusMsg({
        type: 'error',
        text: err instanceof Error ? err.message : '프레임 이미지 등록 실패',
      });
    }
    e.target.value = '';
  };

  const handleUploadChatBg = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { asset, deduplicated } = await storageService.registerAssetFromFile(
        file,
        'chat-bg',
        `채팅방 배경: ${file.name}`
      );
      await loadAssets();
      setChatBackgroundAssetId(asset.id);
      await persistRoomPng({
        theme,
        frameAssetId,
        chatBackgroundAssetId: asset.id,
        bubbleStyle,
      });
      setStatusMsg({
        type: 'success',
        text: deduplicated
          ? `동일한 이미지가 이미 등록되어 있어 중복 저장 없이 기존 배경(${asset.name})을 현재 채팅방에 적용했습니다.`
          : `새 채팅방 배경(${asset.name})을 등록하고 현재 채팅방에 적용했습니다.`,
      });
    } catch (err) {
      setStatusMsg({
        type: 'error',
        text: err instanceof Error ? err.message : '채팅방 배경 등록 실패',
      });
    }
    e.target.value = '';
  };

  const handleSaveRoomPng = async () => {
    await persistRoomPng({
      theme,
      frameAssetId,
      chatBackgroundAssetId,
      bubbleStyle,
    });
    setStatusMsg({
      type: 'success',
      text: 'PNG 꾸미기 설정이 현재 채팅방에만 독립적으로 저장되었습니다. 다른 채팅방에는 영향을 주지 않습니다.',
    });
  };

  const handleResetRoomPng = async () => {
    await storageService.updateRoomSettings(room.id, { clearCustomization: true });
    setTheme(globalCustomization.theme);
    setFrameAssetId(globalCustomization.frameAssetId);
    setChatBackgroundAssetId(globalCustomization.chatBackgroundAssetId);
    setBubbleStyle(globalCustomization.bubbleStyle);
    await onRoomSettingsChanged();
    setStatusMsg({
      type: 'info',
      text: '현재 채팅방의 PNG 꾸미기를 공용 기본 설정으로 복원했습니다. (채팅 기록 및 추억의 한조각은 보존됨)',
    });
  };

  const handleDeleteCustomAsset = async (assetId: string) => {
    const res = await storageService.deleteAssetSafely(assetId, false);
    if (!res.deleted) {
      setStatusMsg({ type: 'error', text: res.reason || '에셋 삭제 불가' });
      return;
    }
    await loadAssets();
    setStatusMsg({ type: 'info', text: '사용하지 않는 이미지 에셋을 안전하게 삭제했습니다.' });
  };

  // --- Prompt Override Handlers (Room-scoped) ---
  const handleSavePromptOverride = async () => {
    await storageService.updateRoomSettings(room.id, {
      promptOverride: {
        characterInfoAndPersonality: promptInfo.trim(),
        speechAndBehavior: promptSpeech.trim(),
        worldView: promptWorldView.trim(),
      },
    });
    setHasPromptOverride(true);
    await onRoomSettingsChanged();
    setStatusMsg({
      type: 'success',
      text: '캐릭터 및 세계관 프롬프트가 현재 채팅방 전용으로 저장되었습니다. 원본 캐릭터와 다른 채팅방은 변경되지 않습니다.',
    });
  };

  const handleRestoreCharacterDefaultPrompt = async () => {
    await storageService.updateRoomSettings(room.id, { clearPromptOverride: true });
    setPromptInfo(getDefaultCharacterInfoAndPersonality(character));
    setPromptSpeech(getDefaultSpeechAndBehavior(character));
    setPromptWorldView(getDefaultWorldView(character));
    setHasPromptOverride(false);
    await onRoomSettingsChanged();
    setStatusMsg({
      type: 'info',
      text: '현재 채팅방의 프롬프트를 캐릭터 기본 설정으로 복원했습니다. 기존 채팅 기록과 추억의 한조각은 삭제되지 않았습니다.',
    });
  };

  // --- Memories Handlers ---
  const handleAddMemory = async () => {
    const trimmed = newMemoryInput.trim();
    if (!trimmed) return;
    setNewMemoryInput('');
    await onSaveMemories([...keyMemories, trimmed], '추억의 한조각이 저장되었습니다.');
    setStatusMsg({ type: 'success', text: '추억의 한조각이 추가되었습니다.' });
  };

  const handleSaveEditMemory = async (idx: number) => {
    const trimmed = editingMemoryText.trim();
    if (!trimmed) return;
    const next = keyMemories.map((item, i) => (i === idx ? trimmed : item));
    setEditingMemoryIdx(null);
    setEditingMemoryText('');
    await onSaveMemories(next, '추억의 한조각이 수정되었습니다.');
    setStatusMsg({ type: 'success', text: '추억의 한조각이 수정되었습니다.' });
  };

  const handleDeleteMemory = async (idx: number) => {
    const next = keyMemories.filter((_, i) => i !== idx);
    if (editingMemoryIdx === idx) setEditingMemoryIdx(null);
    await onSaveMemories(next, '추억의 한조각이 삭제되었습니다.');
    setStatusMsg({ type: 'info', text: '추억의 한조각이 삭제되었습니다.' });
  };

  // --- Makjang Mode Handlers ---
  const handleClickMakjangToggle = async () => {
    if (!makjangMode) {
      // Turning ON requires explicit warning confirmation
      setShowMakjangWarning(true);
    } else {
      // Turning OFF immediately returns to general narrator without deleting records/events
      await storageService.updateRoomSettings(room.id, { makjangMode: false });
      setMakjangMode(false);
      await onRoomSettingsChanged();
      setStatusMsg({
        type: 'info',
        text: '막장 모드가 해제되어 일반 사회자 시스템으로 복귀했습니다. 이미 발생한 사건과 채팅 기록은 그대로 유지됩니다.',
      });
    }
  };

  const handleConfirmEnableMakjang = async () => {
    await storageService.updateRoomSettings(room.id, { makjangMode: true });
    setMakjangMode(true);
    setShowMakjangWarning(false);
    await onRoomSettingsChanged();
    setStatusMsg({
      type: 'info',
      text: '현재 채팅방에 막장 모드가 활성화되었습니다. 다른 채팅방에는 영향을 주지 않습니다.',
    });
  };

  const roomDisplayName = room.title || (character ? `${character.name} 대화방` : '채팅방');

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="w-full max-w-3xl max-h-[92vh] rounded-2xl bg-slate-900 border border-indigo-500/40 shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-3.5 bg-slate-950/90 border-b border-indigo-500/30 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <Settings size={18} className="text-pink-400 shrink-0" />
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-white truncate">
                채팅방 설정 · {roomDisplayName}
              </h3>
              <p className="text-[11px] text-slate-400 truncate">
                이 화면의 설정은 현재 채팅방에만 독립적으로 적용됩니다.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="채팅방 설정 닫기"
            className="min-h-[36px] min-w-[36px] rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Section Tabs */}
        <div className="px-4 sm:px-6 py-2.5 bg-slate-900/95 border-b border-slate-800 flex items-center gap-2 overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => setActiveSection('png')}
            className={`min-h-[36px] px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              activeSection === 'png'
                ? 'bg-pink-600 text-white'
                : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800'
            }`}
          >
            <Palette size={13} />
            <span>PNG 꾸미기</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('prompt')}
            className={`min-h-[36px] px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              activeSection === 'prompt'
                ? 'bg-pink-600 text-white'
                : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800'
            }`}
          >
            <FileEdit size={13} />
            <span>캐릭터·세계관 프롬프트</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('memories')}
            className={`min-h-[36px] px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              activeSection === 'memories'
                ? 'bg-pink-600 text-white'
                : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800'
            }`}
          >
            <BookOpen size={13} />
            <span>추억의 한조각 ({keyMemories.length})</span>
          </button>
        </div>

        {/* Status Notification */}
        {statusMsg && (
          <div className="px-4 sm:px-6 pt-3 shrink-0">
            <div
              className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                statusMsg.type === 'error'
                  ? 'bg-red-950/70 border-red-500/40 text-red-200'
                  : statusMsg.type === 'success'
                  ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-200'
                  : 'bg-indigo-950/70 border-indigo-500/40 text-indigo-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {statusMsg.type === 'error' ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}
                <span>{statusMsg.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setStatusMsg(null)}
                className="text-slate-300 hover:text-white shrink-0"
              >
                닫기
              </button>
            </div>
          </div>
        )}

        {/* Scrollable Content Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* 6-1. PNG 꾸미기 */}
          {activeSection === 'png' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-slate-300 leading-relaxed">
                  채팅방 배경, 외부 프레임(9-Slice), 말풍선 스타일, 컬러 테마를 이 채팅방에만 독립적으로 적용합니다.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleResetRoomPng}
                    className="min-h-[36px] px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 flex items-center gap-1.5"
                  >
                    <RotateCcw size={13} className="text-sky-400" />
                    <span>기본 꾸미기로 복원</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveRoomPng}
                    className="min-h-[36px] px-4 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-xs font-semibold text-white flex items-center gap-1.5"
                  >
                    <Save size={13} />
                    <span>꾸미기 저장</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Chat Background */}
                <div className="p-4 rounded-xl bg-slate-950/90 border border-indigo-500/30 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                      <ImageIcon size={15} className="text-sky-400" />
                      <span>채팅방 배경</span>
                    </div>
                    <input
                      ref={chatBgFileInputRef}
                      type="file"
                      accept="image/png,image/webp,image/gif,image/jpeg,image/svg+xml"
                      onChange={handleUploadChatBg}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => chatBgFileInputRef.current?.click()}
                      className="min-h-[34px] px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-[11px] font-semibold text-white flex items-center gap-1"
                    >
                      <Upload size={12} />
                      <span>이미지 등록</span>
                    </button>
                  </div>

                  <select
                    value={chatBackgroundAssetId}
                    onChange={(e) => setChatBackgroundAssetId(e.target.value)}
                    className="w-full min-h-[38px] px-3 py-1.5 rounded-xl bg-slate-900 border border-indigo-500/30 text-xs text-white"
                  >
                    <option value="none">단색 기본 배경 (이미지 없음)</option>
                    {chatBgAssets.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.isDefault ? '기본 내장' : '사용자 등록'})
                      </option>
                    ))}
                  </select>

                  {selectedChatBgAsset && (
                    <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                      <img
                        src={selectedChatBgAsset.dataUrl}
                        alt={selectedChatBgAsset.name}
                        referrerPolicy="no-referrer"
                        className="w-20 h-14 rounded-lg border border-indigo-500/30 object-cover shrink-0"
                      />
                      <div className="text-[11px] min-w-0">
                        <div className="font-semibold text-white truncate">{selectedChatBgAsset.name}</div>
                        <div className="text-slate-400 font-mono truncate">ID: {selectedChatBgAsset.id}</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Chat Frame */}
                <div className="p-4 rounded-xl bg-slate-950/90 border border-indigo-500/30 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                      <Frame size={15} className="text-pink-400" />
                      <span>채팅 프레임 (9-Slice PNG)</span>
                    </div>
                    <input
                      ref={frameFileInputRef}
                      type="file"
                      accept="image/png,image/webp,image/gif,image/svg+xml"
                      onChange={handleUploadFrame}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => frameFileInputRef.current?.click()}
                      className="min-h-[34px] px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-[11px] font-semibold text-white flex items-center gap-1"
                    >
                      <Upload size={12} />
                      <span>PNG 등록</span>
                    </button>
                  </div>

                  <select
                    value={frameAssetId}
                    onChange={(e) => setFrameAssetId(e.target.value)}
                    className="w-full min-h-[38px] px-3 py-1.5 rounded-xl bg-slate-900 border border-indigo-500/30 text-xs text-white"
                  >
                    <option value="none">외부 프레임 장식 사용 안 함</option>
                    {frameAssets.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.isDefault ? '기본 내장' : '사용자 등록'})
                      </option>
                    ))}
                  </select>

                  {selectedFrameAsset && (
                    <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                      <img
                        src={selectedFrameAsset.dataUrl}
                        alt={selectedFrameAsset.name}
                        referrerPolicy="no-referrer"
                        className="w-14 h-14 rounded-lg border border-indigo-500/30 object-contain bg-slate-950 p-1 shrink-0"
                      />
                      <div className="text-[11px] min-w-0">
                        <div className="font-semibold text-white truncate">{selectedFrameAsset.name}</div>
                        <div className="text-slate-400 font-mono truncate">ID: {selectedFrameAsset.id}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Speech Bubble & Theme */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2.5">
                  <div className="text-xs font-bold text-white">말풍선 스타일</div>
                  <div className="space-y-2">
                    {BUBBLE_OPTIONS.map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setBubbleStyle(b.id)}
                        className={`w-full p-2.5 rounded-xl border text-left transition-all ${
                          bubbleStyle === b.id
                            ? 'bg-indigo-950/90 border-pink-500 text-white'
                            : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-indigo-500/40'
                        }`}
                      >
                        <div className="text-xs font-bold">{b.label}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{b.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2.5">
                  <div className="text-xs font-bold text-white">채팅방 컬러 테마</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {THEME_OPTIONS.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setTheme(t.id)}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          theme === t.id
                            ? 'bg-indigo-950/90 border-pink-500 text-white'
                            : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-indigo-500/40'
                        }`}
                      >
                        <div className="text-xs font-bold">{t.label}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{t.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Shared Asset Library (No duplicate storage across rooms) */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5">
                <div className="text-xs font-bold text-slate-200">
                  공용 등록 이미지 에셋 목록 ({assets.length}개 · 동일 이미지 중복 저장 방지 적용)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                  {assets
                    .filter((a) => a.type === 'frame' || a.type === 'chat-bg' || a.type === 'background')
                    .map((a) => (
                      <div
                        key={a.id}
                        className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <img
                            src={a.dataUrl}
                            alt={a.name}
                            referrerPolicy="no-referrer"
                            className="w-8 h-8 rounded border border-slate-700 object-cover shrink-0 bg-slate-950"
                          />
                          <div className="min-w-0">
                            <div className="text-[11px] font-semibold text-white truncate">{a.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono truncate">{a.type}</div>
                          </div>
                        </div>
                        {!a.isDefault && (
                          <button
                            type="button"
                            onClick={() => handleDeleteCustomAsset(a.id)}
                            className="p-1 text-slate-400 hover:text-red-400 shrink-0"
                            title="참조 여부 확인 후 안전 삭제"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* 6-2. 캐릭터 및 세계관 프롬프트 수정 (이 채팅방 전용) */}
          {activeSection === 'prompt' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-indigo-950/50 border border-indigo-500/30 text-xs text-indigo-100 leading-relaxed flex flex-wrap items-center justify-between gap-2">
                <div>
                  <strong className="text-white">채팅방 전용 프롬프트 설정:</strong> 여기서 수정한 내용은{' '}
                  <strong className="text-pink-300">현재 채팅방에만 적용</strong>되며 원본 캐릭터 설정이나 같은 캐릭터를 사용하는 다른 채팅방에는 영향을 주지 않습니다.
                </div>
                <span
                  className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold shrink-0 ${
                    hasPromptOverride
                      ? 'bg-pink-600/30 text-pink-200 border border-pink-500/40'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {hasPromptOverride ? '채팅방 개별 설정 적용 중' : '캐릭터 기본 설정 참조 중'}
                </span>
              </div>

              {!character ? (
                <div className="p-4 rounded-xl bg-amber-950/60 border border-amber-500/40 text-xs text-amber-200">
                  삭제된 캐릭터의 보존된 대화방입니다. 기존 채팅 기록과 추억의 한조각을 열람할 수 있습니다.
                </div>
              ) : (
                <div className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-200 mb-1">
                      캐릭터 정보 및 성격
                    </label>
                    <textarea
                      rows={4}
                      value={promptInfo}
                      onChange={(e) => setPromptInfo(e.target.value)}
                      placeholder="이 채팅방에서 적용할 캐릭터 정보, 성격, 배경을 입력하세요."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-indigo-500/30 text-xs text-white focus:outline-none focus:border-pink-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-200 mb-1">
                      말투 및 행동 특성
                    </label>
                    <textarea
                      rows={3}
                      value={promptSpeech}
                      onChange={(e) => setPromptSpeech(e.target.value)}
                      placeholder="이 채팅방에서 적용할 말투, 말버릇, 행동 특성을 입력하세요."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-indigo-500/30 text-xs text-white focus:outline-none focus:border-pink-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-200 mb-1">
                      세계관 설정
                    </label>
                    <textarea
                      rows={4}
                      value={promptWorldView}
                      onChange={(e) => setPromptWorldView(e.target.value)}
                      placeholder="이 채팅방에서 적용할 세계관, 배경, 관계 및 상황을 입력하세요."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-indigo-500/30 text-xs text-white focus:outline-none focus:border-pink-500"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleRestoreCharacterDefaultPrompt}
                      className="min-h-[38px] px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 flex items-center gap-1.5"
                    >
                      <RotateCcw size={13} className="text-sky-400" />
                      <span>캐릭터 기본 설정으로 복원</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSavePromptOverride}
                      className="min-h-[38px] px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-xs font-semibold text-white flex items-center gap-1.5"
                    >
                      <Save size={13} />
                      <span>이 채팅방에 적용 저장</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 6-3. 추억의 한조각 */}
          {activeSection === 'memories' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-300 leading-relaxed">
                기억하고 싶은 사건, 약속, 관계 변화 등을 직접 작성·수정·삭제할 수 있습니다. AI는 내용을 참조만 하며 임의로 변경하지 않으며, 비어 있다면 API 요청에 포함되지 않습니다.
              </p>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newMemoryInput}
                  onChange={(e) => setNewMemoryInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddMemory();
                    }
                  }}
                  placeholder="기억하고 싶은 사건이나 약속 입력 (선택)..."
                  className="flex-1 min-h-[40px] px-3.5 py-2 rounded-xl bg-slate-950 border border-indigo-500/30 text-xs text-white focus:outline-none focus:border-pink-500"
                />
                <button
                  type="button"
                  onClick={handleAddMemory}
                  className="min-h-[40px] px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white flex items-center gap-1 shrink-0"
                >
                  <Plus size={14} />
                  <span>기록</span>
                </button>
              </div>

              <div className="space-y-2">
                {keyMemories.length === 0 ? (
                  <div className="p-5 rounded-xl bg-slate-950/70 border border-slate-800 text-center space-y-1">
                    <p className="text-xs text-slate-400">기록된 추억의 한조각이 없습니다.</p>
                    <p className="text-[11px] text-slate-500">
                      작성하지 않아도 정상적으로 채팅할 수 있으며, 비어 있으면 API에 전송되지 않습니다.
                    </p>
                  </div>
                ) : (
                  keyMemories.map((mem, idx) => (
                    <div
                      key={`${idx}-${mem.slice(0, 12)}`}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200"
                    >
                      {editingMemoryIdx === idx ? (
                        <div className="space-y-2">
                          <textarea
                            rows={2}
                            value={editingMemoryText}
                            onChange={(e) => setEditingMemoryText(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-pink-500/50 text-xs text-white focus:outline-none"
                          />
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setEditingMemoryIdx(null)}
                              className="px-2.5 py-1 rounded-lg bg-slate-800 text-[11px] text-slate-300"
                            >
                              취소
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveEditMemory(idx)}
                              className="px-3 py-1 rounded-lg bg-pink-600 text-[11px] font-semibold text-white flex items-center gap-1"
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
                              onClick={() => {
                                setEditingMemoryIdx(idx);
                                setEditingMemoryText(mem);
                              }}
                              className="p-1.5 text-slate-400 hover:text-indigo-300"
                              title="추억 수정"
                            >
                              <Edit3 size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteMemory(idx)}
                              className="p-1.5 text-slate-500 hover:text-red-400"
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
            </div>
          )}
        </div>

        {/* 6-4. Bottom Anchored Makjang Mode Switch */}
        <div
          className={`px-4 sm:px-6 py-4 border-t shrink-0 transition-colors ${
            makjangMode
              ? 'bg-red-950/60 border-red-500/50'
              : 'bg-slate-950/95 border-indigo-500/30'
          }`}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-white">
                <Flame size={16} className={makjangMode ? 'text-red-400' : 'text-amber-400'} />
                <span>막장 모드</span>
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-md font-semibold ${
                    makjangMode
                      ? 'bg-red-600/40 text-red-200 border border-red-400/50'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {makjangMode ? 'ON · 활성화됨' : 'OFF · 기본값'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                {makjangMode
                  ? '현재 채팅방에 막장 사회자가 적용 중입니다. 해제하면 일반 사회자 시스템으로 복귀합니다.'
                  : '현재 채팅방에만 독립적으로 적용되는 특별 연출 모드입니다. 직접 활성화해야 작동합니다.'}
              </p>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={makjangMode}
              onClick={handleClickMakjangToggle}
              className={`min-h-[40px] px-4 py-2 rounded-xl text-xs font-bold transition-colors shrink-0 border ${
                makjangMode
                  ? 'bg-red-600 hover:bg-red-500 border-red-400 text-white shadow-lg shadow-red-600/30'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
              }`}
            >
              {makjangMode ? '막장 모드 ON' : '막장 모드 OFF'}
            </button>
          </div>
        </div>
      </div>

      {/* Section 9: Makjang Mode Activation Warning Popup */}
      {showMakjangWarning && (
        <div className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 rounded-2xl bg-[#1a0a0d] border-2 border-red-500/80 shadow-[0_0_40px_rgba(239,68,68,0.3)] space-y-4">
            <div className="flex items-center gap-2.5 text-red-400">
              <AlertTriangle size={22} className="shrink-0" />
              <h4 className="text-base sm:text-lg font-extrabold text-red-200">
                ⚠ 막장 모드 활성화
              </h4>
            </div>

            <div className="space-y-2.5 text-xs sm:text-sm text-red-100/90 leading-relaxed">
              <p className="font-bold text-amber-300">당신의 평화로운 일상이 위험합니다.</p>
              <p>
                막장 모드는 예측할 수 없는 사건과 갈등, 오해, 배신, 비밀 폭로 및 극적인 반전을 만들어냅니다.
              </p>
              <p>
                평화로운 일상이 한순간에 아침 드라마로 변할 수 있으며, 등장인물들의 관계와 이야기의 방향이 크게 달라질 수 있습니다.
              </p>
              <p>
                시작된 사건은 결말을 향해 진행되며, 행복한 결말은 보장하지 않습니다.
              </p>
              <p>
                막장 모드를 해제하더라도 이미 발생한 사건이 자동으로 사라지지는 않습니다.
              </p>
              <p className="font-semibold text-white pt-1">
                그래도 이 혼란을 감당하시겠습니까?
              </p>
            </div>

            <div className="pt-2 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowMakjangWarning(false)}
                className="min-h-[42px] px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-semibold text-slate-100"
              >
                평화롭게 살래요
              </button>
              <button
                type="button"
                onClick={handleConfirmEnableMakjang}
                className="min-h-[42px] px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 border border-red-400 text-xs font-bold text-white shadow-lg shadow-red-600/30"
              >
                파국으로 가자
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
