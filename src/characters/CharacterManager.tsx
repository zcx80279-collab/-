import React, { useState, useEffect, useRef } from 'react';
import { Character, Asset, GUIDE_RAVI_ID, CURRENT_SCHEMA_VERSION } from '../core/types';
import { storageService } from '../storage/storageService';
import { DEFAULT_AVATARS } from '../core/defaultAssets';
import {
  UserPlus,
  Edit3,
  Trash2,
  Lock,
  Upload,
  Download,
  FileJson,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  X,
  Save,
} from 'lucide-react';

interface CharacterManagerProps {
  onOpenChatWithCharacter: (characterId: string) => void;
  onDataChanged: () => void;
}

export const CharacterManager: React.FC<CharacterManagerProps> = ({
  onOpenChatWithCharacter,
  onDataChanged,
}) => {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [avatarAssets, setAvatarAssets] = useState<Asset[]>([]);
  const [assetUrls, setAssetUrls] = useState<Record<string, string>>({});
  const [editingChar, setEditingChar] = useState<Character | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [avatarAssetId, setAvatarAssetId] = useState('sample-luna-avatar');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [description, setDescription] = useState('');
  const [customPersonality, setCustomPersonality] = useState('');
  const [customNote, setCustomNote] = useState('');

  // Custom modal confirmation for safe character deletion (no window.alert / window.confirm)
  const [deleteTarget, setDeleteTarget] = useState<Character | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const jsonImportRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadCharactersAndAssets();
  }, []);

  const loadCharactersAndAssets = async () => {
    const [chars, allAssets] = await Promise.all([
      storageService.getAllCharacters(),
      storageService.getAllAssets(),
    ]);
    setCharacters(chars);
    const avatars = allAssets.filter((a) => a.type === 'avatar');
    setAvatarAssets(avatars);

    const urlMap: Record<string, string> = {};
    for (const a of allAssets) {
      urlMap[a.id] = a.dataUrl;
    }
    setAssetUrls(urlMap);
  };

  const handleStartCreate = () => {
    setIsCreating(true);
    setEditingChar(null);
    setName('');
    setAvatarAssetId(avatarAssets[0]?.id || 'sample-luna-avatar');
    setSystemPrompt('');
    setDescription('');
    setCustomPersonality('');
    setCustomNote('');
    setFeedbackMsg(null);
  };

  const handleStartEdit = (char: Character) => {
    if (char.id === GUIDE_RAVI_ID || char.isSystemGuide) {
      setFeedbackMsg({
        type: 'error',
        text: '기본 내장 캐릭터인 [안내 라비]는 시스템 보호 규칙에 따라 이름 및 고유 설정을 수정할 수 없습니다.',
      });
      return;
    }
    setIsCreating(false);
    setEditingChar(char);
    setName(char.name);
    setAvatarAssetId(char.avatarAssetId);
    setSystemPrompt(char.systemPrompt);
    setDescription(char.description);
    setCustomPersonality(String(char.customSettings?.personality || ''));
    setCustomNote(String(char.customSettings?.note || ''));
    setFeedbackMsg(null);
  };

  const handleUploadAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { asset, deduplicated } = await storageService.registerAssetFromFile(
        file,
        'avatar',
        `프로필: ${file.name}`
      );
      await loadCharactersAndAssets();
      setAvatarAssetId(asset.id);
      setFeedbackMsg({
        type: 'info',
        text: deduplicated
          ? `동일한 콘텐츠 해시(${asset.contentHash.slice(0, 10)}...) 이미지가 이미 "assets" 스토어에 존재하여 중복 저장 없이 기존 에셋 ID(${asset.id})를 연결했습니다.`
          : `새 프로필 이미지가 "assets" 스토어에 등록되었습니다 (에셋 ID: ${asset.id}).`,
      });
    } catch (err) {
      setFeedbackMsg({
        type: 'error',
        text: err instanceof Error ? err.message : '프로필 이미지 등록 실패',
      });
    }
    e.target.value = '';
  };

  const handleSaveCharacter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFeedbackMsg({ type: 'error', text: '캐릭터 이름을 입력해 주세요.' });
      return;
    }

    try {
      const now = Date.now();
      const charToSave: Character = {
        id: editingChar ? editingChar.id : `char-${now}-${Math.random().toString(36).substring(2, 6)}`,
        name: name.trim(),
        avatarAssetId,
        systemPrompt: systemPrompt.trim() || `${name.trim()}의 기본 캐릭터 프롬프트입니다.`,
        description: description.trim() || '사용자 정의 AI 캐릭터',
        customSettings: {
          personality: customPersonality.trim(),
          note: customNote.trim(),
        },
        createdAt: editingChar ? editingChar.createdAt : now,
        updatedAt: now,
        schemaVersion: CURRENT_SCHEMA_VERSION,
        isSystemGuide: false,
      };

      await storageService.saveCharacter(charToSave);
      await loadCharactersAndAssets();
      onDataChanged();
      setIsCreating(false);
      setEditingChar(null);
      setFeedbackMsg({
        type: 'success',
        text: `[${charToSave.name}] 캐릭터 정보가 IndexedDB "characters" 스토어에 안전하게 저장되었습니다.`,
      });
    } catch (err) {
      setFeedbackMsg({
        type: 'error',
        text: err instanceof Error ? err.message : '캐릭터 저장 중 오류가 발생했습니다.',
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const result = await storageService.deleteCharacterPreservingRecords(deleteTarget.id);
      const deletedName = deleteTarget.name;
      setDeleteTarget(null);
      await loadCharactersAndAssets();
      onDataChanged();
      setFeedbackMsg({
        type: 'info',
        text: `[${deletedName}] 캐릭터 프로필이 삭제되었습니다. 데이터 보호 원칙에 따라 연결된 채팅방(${result.preservedRooms}개), 대화 메시지(${result.preservedMessages}건), 스토리 중요 기억(${result.preservedStories}건)은 삭제되지 않고 보존되었습니다.`,
      });
    } catch (err) {
      setFeedbackMsg({
        type: 'error',
        text: err instanceof Error ? err.message : '캐릭터 삭제 실패',
      });
    }
  };

  const handleExportCharacterJson = (char: Character) => {
    const exportPayload = {
      format: 'lovy-character-v1',
      exportedAt: new Date().toISOString(),
      character: char,
    };
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `character-${char.name.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportCharacterJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const rawChar = parsed.character || parsed;
      if (!rawChar.name || typeof rawChar.name !== 'string') {
        throw new Error('올바른 캐릭터 JSON 형식이 아닙니다.');
      }
      const now = Date.now();
      const importedChar: Character = {
        id: `char-import-${now}`,
        name: `${rawChar.name} (가져옴)`,
        avatarAssetId: assetUrls[rawChar.avatarAssetId] ? rawChar.avatarAssetId : 'sample-luna-avatar',
        systemPrompt: String(rawChar.systemPrompt || ''),
        description: String(rawChar.description || ''),
        customSettings: typeof rawChar.customSettings === 'object' && rawChar.customSettings ? rawChar.customSettings : {},
        createdAt: now,
        updatedAt: now,
        schemaVersion: CURRENT_SCHEMA_VERSION,
        isSystemGuide: false,
      };
      await storageService.saveCharacter(importedChar);
      await loadCharactersAndAssets();
      onDataChanged();
      setFeedbackMsg({
        type: 'success',
        text: `[${importedChar.name}] 캐릭터 파일을 성공적으로 가져왔습니다.`,
      });
    } catch (err) {
      setFeedbackMsg({
        type: 'error',
        text: err instanceof Error ? err.message : '캐릭터 파일 가져오기 오류',
      });
    }
    e.target.value = '';
  };

  return (
    <div className="flex flex-col h-full bg-slate-950/75 text-slate-100 overflow-y-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-indigo-500/30 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">캐릭터 등록 및 관리</h2>
          <p className="text-xs text-slate-400 mt-1">
            캐릭터 데이터와 채팅·스토리 기록은 분리 저장되며, 캐릭터 삭제 시에도 기존 대화 및 스토리 기록은 자동 보존됩니다.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <input
            ref={jsonImportRef}
            type="file"
            accept=".json,application/json"
            onChange={handleImportCharacterJson}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => jsonImportRef.current?.click()}
            className="min-h-[40px] px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-indigo-500/30 text-xs font-medium text-indigo-200 flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
          >
            <FileJson size={14} className="text-sky-400" />
            <span>캐릭터 JSON 가져오기</span>
          </button>

          <button
            type="button"
            onClick={handleStartCreate}
            className="min-h-[40px] px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-xs font-semibold text-white flex items-center gap-1.5 shadow-lg shadow-pink-600/20 transition-colors whitespace-nowrap shrink-0"
          >
            <UserPlus size={15} />
            <span>새 캐릭터 추가</span>
          </button>
        </div>
      </div>

      {/* Status Notification Banner */}
      {feedbackMsg && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3 ${
            feedbackMsg.type === 'error'
              ? 'bg-red-950/60 border-red-500/40 text-red-200'
              : feedbackMsg.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
              : 'bg-indigo-950/60 border-indigo-500/40 text-indigo-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 size={15} className="shrink-0" />
            <span>{feedbackMsg.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMsg(null)}
            className="p-1 hover:bg-white/10 rounded-lg"
            aria-label="알림 닫기"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Create / Edit Form Modal or Section */}
      {(isCreating || editingChar) && (
        <form
          onSubmit={handleSaveCharacter}
          className="p-5 rounded-2xl bg-slate-900/95 border border-pink-500/40 space-y-4 shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white">
              {isCreating ? '새 AI 캐릭터 등록' : `캐릭터 수정: ${editingChar?.name}`}
            </h3>
            <button
              type="button"
              onClick={() => {
                setIsCreating(false);
                setEditingChar(null);
              }}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg"
            >
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">캐릭터 이름 *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="예: 네온 토끼 미유"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-indigo-500/30 text-sm text-white focus:outline-none focus:border-pink-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">한 줄 설명 (캐릭터 소개)</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="예: 사이버 시티의 해커 토끼 동료"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-indigo-500/30 text-sm text-white focus:outline-none focus:border-pink-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  프로필 이미지 에셋 선택 (assets 스토어 ID 참조)
                </label>
                <div className="flex items-center gap-3">
                  <img
                    src={assetUrls[avatarAssetId] || DEFAULT_AVATARS.luna}
                    alt="선택된 프로필"
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 rounded-xl border border-pink-500/50 object-cover shrink-0"
                  />
                  <select
                    value={avatarAssetId}
                    onChange={(e) => setAvatarAssetId(e.target.value)}
                    className="flex-1 px-3 py-2.5 rounded-xl bg-slate-950 border border-indigo-500/30 text-xs text-white focus:outline-none"
                  >
                    {avatarAssets.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.id})
                      </option>
                    ))}
                  </select>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/webp,image/gif,image/jpeg,image/svg+xml"
                    onChange={handleUploadAvatarFile}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="min-h-[40px] px-3 py-2 rounded-xl bg-indigo-950 hover:bg-indigo-900 border border-indigo-500/40 text-xs text-indigo-200 flex items-center gap-1 shrink-0"
                  >
                    <Upload size={13} />
                    <span>PNG 등록</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  기본 프롬프트 (캐릭터 성격·말투·커뮤니티 공용 프롬프트)
                </label>
                <textarea
                  rows={3}
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder="캐릭터의 기본 성격, 말투, 배경 설정을 입력하세요. (향후 채팅 및 커뮤니티 댓글 작성에 공용으로 활용됩니다)"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-indigo-500/30 text-xs text-white focus:outline-none focus:border-pink-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">사용자 지정 설정: 성격 키워드</label>
                  <input
                    type="text"
                    value={customPersonality}
                    onChange={(e) => setCustomPersonality(e.target.value)}
                    placeholder="예: 다정함, 츤데레, 호기심"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-indigo-500/30 text-xs text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">사용자 지정 설정: 메모</label>
                  <input
                    type="text"
                    value={customNote}
                    onChange={(e) => setCustomNote(e.target.value)}
                    placeholder="추가 커스텀 설정 메모"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-indigo-500/30 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => {
                setIsCreating(false);
                setEditingChar(null);
              }}
              className="min-h-[40px] px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300"
            >
              취소
            </button>
            <button
              type="submit"
              className="min-h-[40px] px-5 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-xs font-semibold text-white flex items-center gap-1.5"
            >
              <Save size={14} />
              <span>캐릭터 저장</span>
            </button>
          </div>
        </form>
      )}

      {/* Delete Confirmation Dialog (Data Protection Guarantee) */}
      {deleteTarget && (
        <div className="p-5 rounded-2xl bg-slate-900 border-2 border-amber-500/60 space-y-3 shadow-2xl">
          <div className="flex items-start gap-3">
            <AlertTriangle size={22} className="text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white">
                [{deleteTarget.name}] 캐릭터를 삭제하시겠습니까? (데이터 보존 정책 안내)
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                러비러비톡 데이터 보호 정책(지시서 3항)에 따라, 캐릭터를 삭제하더라도 해당 캐릭터와 나눈{' '}
                <strong className="text-amber-300">채팅 기록, 채팅방, 스토리 모드 중요 기억, 커뮤니티 작성 글은 자동 삭제되지 않고 안전하게 보존</strong>됩니다.
                삭제된 캐릭터를 참조하는 기존 채팅방은 [삭제된 캐릭터 (기록 보존됨)] 상태로 오류 없이 열람할 수 있습니다.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              className="min-h-[40px] px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleConfirmDelete}
              className="min-h-[40px] px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-semibold text-white flex items-center gap-1.5"
            >
              <Trash2 size={14} />
              <span>대화 기록을 보존하고 캐릭터만 삭제</span>
            </button>
          </div>
        </div>
      )}

      {/* Character Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {characters.map((char) => {
          const isGuide = char.id === GUIDE_RAVI_ID || char.isSystemGuide;
          const avatarSrc = assetUrls[char.avatarAssetId] || DEFAULT_AVATARS.ravi;

          return (
            <div
              key={char.id}
              className={`p-5 rounded-2xl border flex flex-col justify-between gap-4 transition-colors ${
                isGuide
                  ? 'bg-indigo-950/40 border-indigo-500/40'
                  : 'bg-slate-900/90 border-slate-800 hover:border-indigo-500/40'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={avatarSrc}
                      alt={char.name}
                      referrerPolicy="no-referrer"
                      className="w-14 h-14 rounded-2xl border border-indigo-500/40 object-cover shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-white truncate">{char.name}</h3>
                        {isGuide && (
                          <span className="text-[11px] text-pink-400 font-medium shrink-0">
                            · 시스템 고정
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">{char.description}</p>
                      <div className="text-[11px] text-slate-500 font-mono mt-1 tabular-nums">
                        ID: {char.id} · v{char.schemaVersion} · Asset: {char.avatarAssetId}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs text-slate-300 space-y-1.5">
                  <div className="font-semibold text-indigo-300 text-[11px]">기본 프롬프트</div>
                  <p className="line-clamp-2 text-slate-300 leading-relaxed">{char.systemPrompt}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => onOpenChatWithCharacter(char.id)}
                  className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-indigo-600/90 hover:bg-indigo-500 text-xs font-semibold text-white flex items-center gap-1.5 transition-colors"
                >
                  <MessageSquare size={13} />
                  <span>{isGuide ? '안내 라비 채널 열기' : '대화방 이동'}</span>
                </button>

                {isGuide ? (
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 px-2.5 py-1.5 rounded-lg bg-slate-950/60 border border-slate-800">
                    <Lock size={12} className="text-pink-400" />
                    <span>삭제·수정 보호됨</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleExportCharacterJson(char)}
                      title="캐릭터 JSON 내보내기"
                      className="min-h-[38px] px-2.5 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 flex items-center gap-1"
                    >
                      <Download size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStartEdit(char)}
                      className="min-h-[38px] px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs text-indigo-300 flex items-center gap-1"
                    >
                      <Edit3 size={13} />
                      <span>수정</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(char)}
                      className="min-h-[38px] px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-red-950/70 border border-slate-800 hover:border-red-500/40 text-xs text-red-400 flex items-center gap-1"
                    >
                      <Trash2 size={13} />
                      <span>삭제</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
