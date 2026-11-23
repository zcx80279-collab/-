import React, { useState, useEffect, useRef } from 'react';
import {
  Character,
  Asset,
  UserProfile,
  MigratedWorldViewRecord,
  GUIDE_RAVI_ID,
  CURRENT_SCHEMA_VERSION,
} from '../core/types';
import { storageService } from '../storage/storageService';
import { DEFAULT_AVATARS } from '../core/defaultAssets';
import {
  UserPlus,
  UserCircle2,
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
  Globe,
  Sparkles,
} from 'lucide-react';

interface CharacterManagerProps {
  userProfile: UserProfile | null;
  autoOpenPersonaEditor?: boolean;
  onPersonaEditorHandled?: () => void;
  onUserProfileUpdated: (profile: UserProfile) => void;
  onOpenChatWithCharacter: (characterId: string) => void;
  onDataChanged: () => void;
}

export const CharacterManager: React.FC<CharacterManagerProps> = ({
  userProfile,
  autoOpenPersonaEditor = false,
  onPersonaEditorHandled,
  onUserProfileUpdated,
  onOpenChatWithCharacter,
  onDataChanged,
}) => {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [avatarAssets, setAvatarAssets] = useState<Asset[]>([]);
  const [assetUrls, setAssetUrls] = useState<Record<string, string>>({});
  const [editingChar, setEditingChar] = useState<Character | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Form states (Requirement 2: 캐릭터 이름, 프로필 이미지, 캐릭터 정보 및 성격, 말투 및 행동 특성, 세계관 설정)
  const [name, setName] = useState('');
  const [avatarAssetId, setAvatarAssetId] = useState('sample-luna-avatar');
  const [description, setDescription] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [customPersonality, setCustomPersonality] = useState('');
  const [speechAndBehavior, setSpeechAndBehavior] = useState('');
  const [worldView, setWorldView] = useState('');
  const [customNote, setCustomNote] = useState('');
  const [migratedConflicts, setMigratedConflicts] = useState<MigratedWorldViewRecord[]>([]);

  // 「나의 분신」 (User Persona) form states
  const [isEditingPersona, setIsEditingPersona] = useState(false);
  const [personaName, setPersonaName] = useState(userProfile?.name || '');
  const [personaAvatarId, setPersonaAvatarId] = useState(userProfile?.avatarAssetId || 'none');
  const [personaAppearance, setPersonaAppearance] = useState(userProfile?.appearance || '');
  const [personaPersonality, setPersonaPersonality] = useState(userProfile?.personality || '');
  const [personaBioAndExtra, setPersonaBioAndExtra] = useState(
    [userProfile?.bio, userProfile?.additionalInfo].filter(Boolean).join('\n\n')
  );
  const personaFileInputRef = useRef<HTMLInputElement>(null);
  const personaSectionRef = useRef<HTMLDivElement>(null);

  // Custom modal confirmation for safe character deletion
  const [deleteTarget, setDeleteTarget] = useState<Character | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const jsonImportRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadCharactersAndAssets();
  }, []);

  useEffect(() => {
    setPersonaName(userProfile?.name || '');
    setPersonaAvatarId(userProfile?.avatarAssetId || 'none');
    setPersonaAppearance(userProfile?.appearance || '');
    setPersonaPersonality(userProfile?.personality || '');
    setPersonaBioAndExtra(
      [userProfile?.bio, userProfile?.additionalInfo].filter(Boolean).join('\n\n')
    );
  }, [userProfile]);

  useEffect(() => {
    if (autoOpenPersonaEditor) {
      setIsEditingPersona(true);
      setIsCreating(false);
      setEditingChar(null);
      setTimeout(() => {
        personaSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
      onPersonaEditorHandled?.();
    }
  }, [autoOpenPersonaEditor]);

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

  const handleUploadPersonaAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { asset } = await storageService.registerAssetFromFile(
        file,
        'avatar',
        `나의 분신: ${file.name}`
      );
      await loadCharactersAndAssets();
      setPersonaAvatarId(asset.id);
      setFeedbackMsg({
        type: 'info',
        text: '나의 분신 프로필 이미지가 로컬 "assets" 스토어에 등록되었습니다. (매 대화 시 API에는 전송되지 않습니다.)',
      });
    } catch (err) {
      setFeedbackMsg({
        type: 'error',
        text: err instanceof Error ? err.message : '프로필 이미지 등록 실패',
      });
    }
    e.target.value = '';
  };

  const handleSavePersona = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personaName.trim()) {
      setFeedbackMsg({ type: 'error', text: '이름 또는 닉네임을 입력해 주세요.' });
      return;
    }
    try {
      const saved = await storageService.saveUserProfile({
        name: personaName.trim(),
        avatarAssetId: personaAvatarId !== 'none' ? personaAvatarId : undefined,
        appearance: personaAppearance.trim(),
        personality: personaPersonality.trim(),
        bio: personaBioAndExtra.trim(),
        additionalInfo: '',
      });
      onUserProfileUpdated(saved);
      onDataChanged();
      setIsEditingPersona(false);
      setFeedbackMsg({
        type: 'success',
        text: `「나의 분신」 (${saved.name}) 정보가 저장되었습니다. 모든 AI 캐릭터와 사회자가 대화 시 이 정보를 참조합니다.`,
      });
    } catch (err) {
      setFeedbackMsg({
        type: 'error',
        text: err instanceof Error ? err.message : '나의 분신 저장 중 오류가 발생했습니다.',
      });
    }
  };

  const handleStartCreate = () => {
    setIsCreating(true);
    setEditingChar(null);
    setName('');
    setAvatarAssetId(avatarAssets[0]?.id || 'sample-luna-avatar');
    setDescription('');
    setSystemPrompt('');
    setCustomPersonality('');
    setSpeechAndBehavior('');
    setWorldView('');
    setCustomNote('');
    setMigratedConflicts([]);
    setFeedbackMsg(null);
  };

  const handleStartEdit = async (char: Character) => {
    if (char.id === GUIDE_RAVI_ID || char.isSystemGuide) {
      setFeedbackMsg({
        type: 'error',
        text: '기본 내장 캐릭터인 [안내 라비]는 시스템 보호 규칙에 따라 이름 및 고유 설정을 수정할 수 없습니다.',
      });
      return;
    }

    // Check if there is any legacy story setting to display or migrate safely
    const story = await storageService.getStoryMemory(char.id);
    const legacyParts: string[] = [];
    if (story.worldView?.trim()) legacyParts.push(story.worldView.trim());
    if (story.relationships?.trim()) legacyParts.push(`[관계 설정] ${story.relationships.trim()}`);
    if (story.startingSituation?.trim()) legacyParts.push(`[시작 상황] ${story.startingSituation.trim()}`);
    const combinedLegacy = legacyParts.join('\n');

    let resolvedWorldView = (char.worldView || '').trim();
    const conflicts: MigratedWorldViewRecord[] = [...(char.migratedWorldViews || [])];

    if (!resolvedWorldView && combinedLegacy) {
      resolvedWorldView = combinedLegacy;
    } else if (
      resolvedWorldView &&
      combinedLegacy &&
      resolvedWorldView !== combinedLegacy &&
      !resolvedWorldView.includes(combinedLegacy)
    ) {
      const alreadyInConflicts = conflicts.some((c) => c.worldView === story.worldView);
      if (!alreadyInConflicts) {
        conflicts.push({
          sourceId: story.id,
          worldView: story.worldView,
          relationships: story.relationships,
          startingSituation: story.startingSituation,
          migratedAt: Date.now(),
        });
      }
    }

    setIsCreating(false);
    setEditingChar(char);
    setName(char.name);
    setAvatarAssetId(char.avatarAssetId);
    setDescription(char.description);
    setSystemPrompt(char.systemPrompt);
    setCustomPersonality(String(char.customSettings?.personality || ''));
    setSpeechAndBehavior(
      char.speechAndBehavior ||
        String(char.customSettings?.speechAndBehavior || char.customSettings?.greetingStyle || '')
    );
    setWorldView(resolvedWorldView);
    setCustomNote(String(char.customSettings?.note || ''));
    setMigratedConflicts(conflicts);
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

  const handleMergeConflictingWorldView = (record: MigratedWorldViewRecord) => {
    const parts: string[] = [];
    if (record.worldView?.trim()) parts.push(record.worldView.trim());
    if (record.relationships?.trim()) parts.push(`[관계 설정] ${record.relationships.trim()}`);
    if (record.startingSituation?.trim()) parts.push(`[시작 상황] ${record.startingSituation.trim()}`);
    const extraText = parts.join('\n');
    setWorldView((prev) => (prev.trim() ? `${prev.trim()}\n\n${extraText}` : extraText));
    setMigratedConflicts((prev) => prev.filter((item) => item.sourceId !== record.sourceId));
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
        systemPrompt: systemPrompt.trim() || `${name.trim()}의 기본 캐릭터 설정입니다.`,
        description: description.trim() || '사용자 정의 AI 캐릭터',
        speechAndBehavior: speechAndBehavior.trim(),
        worldView: worldView.trim(),
        migratedWorldViews: migratedConflicts,
        customSettings: {
          ...(editingChar?.customSettings || {}),
          personality: customPersonality.trim(),
          speechAndBehavior: speechAndBehavior.trim(),
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
        text: `[${charToSave.name}] 캐릭터 정보, 말투/행동 특성 및 세계관 설정이 안전하게 저장되었습니다.`,
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
        text: `[${deletedName}] 캐릭터 프로필이 삭제되었습니다. 데이터 보호 원칙에 따라 연결된 채팅방(${result.preservedRooms}개), 대화 메시지(${result.preservedMessages}건), 추억의 한조각(${result.preservedStories}건)은 삭제되지 않고 보존되었습니다.`,
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
      format: 'lovy-character-v2',
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
        speechAndBehavior: String(rawChar.speechAndBehavior || rawChar.customSettings?.speechAndBehavior || ''),
        worldView: String(rawChar.worldView || ''),
        customSettings:
          typeof rawChar.customSettings === 'object' && rawChar.customSettings ? rawChar.customSettings : {},
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
          <h2 className="text-xl font-bold text-white tracking-tight">캐릭터 생성 및 관리</h2>
          <p className="text-xs text-slate-400 mt-1">
            캐릭터 정보, 성격, 말투 및 행동 특성, 세계관 설정은 캐릭터에 귀속되며 모든 채팅방에서 자동으로 참조됩니다.
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

      {/* Section 4: Dedicated 「나의 분신」 Management Area (Visually Distinct from AI Characters) */}
      <section
        ref={personaSectionRef}
        className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/35 via-slate-900/95 to-pink-950/25 border-2 border-emerald-500/40 space-y-4 shadow-xl"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-500/20 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center shrink-0">
              <UserCircle2 size={20} className="text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-white">나의 분신</h3>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                  사용자 프로필
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                AI 캐릭터와 사회자가 당신을 알아볼 수 있도록 이야기 속에서 사용할 나의 분신을 관리합니다.
              </p>
            </div>
          </div>

          {!isEditingPersona && (
            <button
              type="button"
              onClick={() => setIsEditingPersona(true)}
              className="min-h-[38px] px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 shrink-0"
            >
              <Edit3 size={14} />
              <span>{userProfile ? '나의 분신 수정' : '나의 분신 만들기'}</span>
            </button>
          )}
        </div>

        {isEditingPersona ? (
          <form onSubmit={handleSavePersona} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-emerald-200 mb-1">
                    이름 또는 닉네임 (필수) *
                  </label>
                  <input
                    type="text"
                    required
                    value={personaName}
                    onChange={(e) => setPersonaName(e.target.value)}
                    placeholder="캐릭터들이 부를 이름 또는 닉네임을 입력하세요"
                    className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-slate-950 border border-emerald-500/40 text-xs text-white focus:outline-none focus:border-pink-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    프로필 이미지 (선택 · 로컬 표시 전용, 매 대화 API에 전송되지 않음)
                  </label>
                  <div className="flex items-center gap-2.5">
                    {personaAvatarId !== 'none' && assetUrls[personaAvatarId] ? (
                      <img
                        src={assetUrls[personaAvatarId]}
                        alt="나의 분신 프로필"
                        referrerPolicy="no-referrer"
                        className="w-11 h-11 rounded-xl border border-emerald-400/50 object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-xl border border-slate-700 bg-slate-950 flex items-center justify-center text-[10px] text-slate-500 shrink-0">
                        미선택
                      </div>
                    )}
                    <select
                      value={personaAvatarId}
                      onChange={(e) => setPersonaAvatarId(e.target.value)}
                      className="flex-1 min-h-[40px] px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none"
                    >
                      <option value="none">선택 안 함 (빈 상태 유지)</option>
                      {avatarAssets.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                    <input
                      ref={personaFileInputRef}
                      type="file"
                      accept="image/png,image/webp,image/gif,image/jpeg,image/svg+xml"
                      onChange={handleUploadPersonaAvatar}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => personaFileInputRef.current?.click()}
                      className="min-h-[40px] px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-emerald-500/40 text-xs text-emerald-200 flex items-center gap-1 shrink-0"
                    >
                      <Upload size={13} />
                      <span>이미지 등록</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    외모 (선택)
                  </label>
                  <textarea
                    rows={2}
                    value={personaAppearance}
                    onChange={(e) => setPersonaAppearance(e.target.value)}
                    placeholder="머리색, 분위기, 복장 등 외모 특징을 자유롭게 입력하세요 (비워두면 빈 상태 유지)"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    성격 (선택)
                  </label>
                  <textarea
                    rows={2}
                    value={personaPersonality}
                    onChange={(e) => setPersonaPersonality(e.target.value)}
                    placeholder="성격이나 말투, 행동 스타일을 입력하세요 (비워두면 빈 상태 유지)"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    자기소개 및 추가 설정 (선택)
                  </label>
                  <textarea
                    rows={4}
                    value={personaBioAndExtra}
                    onChange={(e) => setPersonaBioAndExtra(e.target.value)}
                    placeholder="실제 자신의 모습이나 세계관 속 직업·배경·취향 등을 자유롭게 입력하세요 (입력하지 않은 정보는 AI가 임의로 확정하지 않습니다)"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800">
              <span className="text-[11px] text-slate-400">
                입력하지 않은 선택 항목은 빈 상태로 유지되며, 프로필 이미지는 대화 API에 전송되지 않습니다.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingPersona(false)}
                  className="min-h-[38px] px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="min-h-[38px] px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white flex items-center gap-1.5"
                >
                  <Save size={14} />
                  <span>나의 분신 저장</span>
                </button>
              </div>
            </div>
          </form>
        ) : userProfile ? (
          <div className="p-4 rounded-xl bg-slate-950/80 border border-emerald-500/25 flex flex-col sm:flex-row items-start gap-4">
            {userProfile.avatarAssetId && assetUrls[userProfile.avatarAssetId] ? (
              <img
                src={assetUrls[userProfile.avatarAssetId]}
                alt={userProfile.name}
                referrerPolicy="no-referrer"
                className="w-16 h-16 rounded-2xl border border-emerald-400/50 object-cover shrink-0"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl border border-emerald-500/30 bg-emerald-950/40 flex items-center justify-center shrink-0">
                <UserCircle2 size={28} className="text-emerald-300" />
              </div>
            )}
            <div className="flex-1 min-w-0 space-y-2 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base font-bold text-white">{userProfile.name}</span>
                <span className="text-[11px] text-emerald-300">· 모든 AI 캐릭터 및 사회자가 참조 중</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {userProfile.appearance?.trim() && (
                  <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                    <div className="text-[11px] font-semibold text-emerald-300">외모</div>
                    <p className="text-slate-200 mt-0.5 whitespace-pre-line leading-relaxed">
                      {userProfile.appearance}
                    </p>
                  </div>
                )}
                {userProfile.personality?.trim() && (
                  <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                    <div className="text-[11px] font-semibold text-pink-300">성격</div>
                    <p className="text-slate-200 mt-0.5 whitespace-pre-line leading-relaxed">
                      {userProfile.personality}
                    </p>
                  </div>
                )}
              </div>
              {(userProfile.bio?.trim() || userProfile.additionalInfo?.trim()) && (
                <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                  <div className="text-[11px] font-semibold text-sky-300">자기소개 및 추가 설정</div>
                  <p className="text-slate-200 mt-0.5 whitespace-pre-line leading-relaxed">
                    {[userProfile.bio, userProfile.additionalInfo].filter(Boolean).join('\n\n')}
                  </p>
                </div>
              )}
              {!userProfile.appearance?.trim() &&
                !userProfile.personality?.trim() &&
                !userProfile.bio?.trim() &&
                !userProfile.additionalInfo?.trim() && (
                  <p className="text-slate-400">
                    추가 선택 항목은 비어 있습니다. 필요 시 우측의 [나의 분신 수정]에서 자유롭게 입력할 수 있습니다.
                  </p>
                )}
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-slate-950/70 border border-dashed border-emerald-500/35 text-xs text-slate-300 flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="font-bold text-white">아직 등록된 나의 분신이 없습니다.</div>
              <p className="text-slate-400">
                실제 AI 캐릭터와 대화를 시작하기 전에 이름 또는 닉네임을 등록해 주세요. 안내 라비는 분신 없이도 이용할 수 있습니다.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Visual Separator between 「나의 분신」 and AI Characters */}
      <div className="flex items-center justify-between pt-2 border-t border-indigo-500/25">
        <div>
          <h3 className="text-sm font-bold text-indigo-200">AI 캐릭터 및 안내 라비 목록</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            등록된 AI 캐릭터({characters.filter((c) => c.id !== GUIDE_RAVI_ID).length}명) 및 시스템 안내 도우미 라비
          </p>
        </div>
      </div>

      {/* Create / Edit Form Section */}
      {(isCreating || editingChar) && (
        <form
          onSubmit={handleSaveCharacter}
          className="p-5 rounded-2xl bg-slate-900/95 border border-pink-500/40 space-y-4 shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white">
              {isCreating ? '새 AI 캐릭터 생성' : `캐릭터 설정 수정: ${editingChar?.name}`}
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
            {/* Left Column: Name, Profile Image, Summary & Personality */}
            <div className="space-y-3.5">
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
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  프로필 이미지 (assets 스토어 ID 참조)
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
                    <span>이미지 등록</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  한 줄 소개 (캐릭터 요약)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="예: 사이버 시티의 해커 토끼 동료"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-indigo-500/30 text-xs text-white focus:outline-none focus:border-pink-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  캐릭터 정보 및 성격 (상세 배경·성격·특징)
                </label>
                <textarea
                  rows={3}
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder="캐릭터의 상세 정보, 성격, 가치관, 좋아하는 것 등을 자유롭게 입력하세요."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-indigo-500/30 text-xs text-white focus:outline-none focus:border-pink-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">성격 키워드 (선택)</label>
                  <input
                    type="text"
                    value={customPersonality}
                    onChange={(e) => setCustomPersonality(e.target.value)}
                    placeholder="예: 다정함, 츤데레, 호기심"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-indigo-500/30 text-xs text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">추가 메모 (선택)</label>
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

            {/* Right Column: Speech & Behavior Characteristics + WorldView Setting */}
            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                  <Sparkles size={13} className="text-pink-400" />
                  <span>말투 및 행동 특성</span>
                </label>
                <textarea
                  rows={4}
                  value={speechAndBehavior}
                  onChange={(e) => setSpeechAndBehavior(e.target.value)}
                  placeholder="캐릭터의 말투(반말/존댓말, 말버릇, 어조)와 자주 하는 행동, 표정, 습관 등을 입력하세요."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-indigo-500/30 text-xs text-white focus:outline-none focus:border-pink-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                  <Globe size={13} className="text-sky-400" />
                  <span>세계관 설정 (캐릭터 귀속 · 채팅방 자동 참조)</span>
                </label>
                <textarea
                  rows={6}
                  value={worldView}
                  onChange={(e) => setWorldView(e.target.value)}
                  placeholder="캐릭터가 속한 세계관, 시대적 배경, 주요 장소, 사용자와의 기본 관계 및 시작 상황 등을 입력하세요."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-indigo-500/30 text-xs text-white focus:outline-none focus:border-pink-500"
                />
              </div>

              {/* Conflict preservation box if legacy chatroom settings differed from character worldView */}
              {migratedConflicts.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-500/40 space-y-2 text-xs">
                  <div className="font-bold text-amber-300 flex items-center gap-1.5">
                    <AlertTriangle size={14} />
                    <span>기존 채팅방에서 이전된 다른 세계관 설정 보존됨 (임의 덮어쓰기 방지)</span>
                  </div>
                  {migratedConflicts.map((rec) => (
                    <div
                      key={rec.sourceId}
                      className="p-2.5 rounded-lg bg-slate-950/90 border border-amber-500/30 space-y-1.5"
                    >
                      <p className="text-slate-200 whitespace-pre-line">{rec.worldView}</p>
                      {rec.relationships && (
                        <p className="text-slate-300">• 관계: {rec.relationships}</p>
                      )}
                      {rec.startingSituation && (
                        <p className="text-slate-300">• 시작 상황: {rec.startingSituation}</p>
                      )}
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleMergeConflictingWorldView(rec)}
                          className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-[11px] font-semibold text-white"
                        >
                          현재 세계관 아래에 병합
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
                러비러비톡 데이터 보호 정책에 따라, 캐릭터를 삭제하더라도 해당 캐릭터와 나눈{' '}
                <strong className="text-amber-300">
                  채팅 기록, 채팅방, 추억의 한조각, 커뮤니티 작성 글은 자동 삭제되지 않고 안전하게 보존
                </strong>
                됩니다.
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
          const speechText =
            char.speechAndBehavior ||
            String(char.customSettings?.speechAndBehavior || char.customSettings?.greetingStyle || '');

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
                        ID: {char.id} · v{char.schemaVersion}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs text-slate-300 space-y-2">
                  <div>
                    <div className="font-semibold text-indigo-300 text-[11px]">캐릭터 정보 및 성격</div>
                    <p className="line-clamp-2 text-slate-300 leading-relaxed mt-0.5">{char.systemPrompt}</p>
                  </div>

                  {speechText && (
                    <div className="pt-1.5 border-t border-slate-800/80">
                      <div className="font-semibold text-pink-300 text-[11px]">말투 및 행동 특성</div>
                      <p className="line-clamp-2 text-slate-300 leading-relaxed mt-0.5">{speechText}</p>
                    </div>
                  )}

                  {char.worldView && (
                    <div className="pt-1.5 border-t border-slate-800/80">
                      <div className="font-semibold text-sky-300 text-[11px]">세계관 설정</div>
                      <p className="line-clamp-2 text-slate-300 leading-relaxed mt-0.5">{char.worldView}</p>
                    </div>
                  )}
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
