import React, { useState, useEffect, useRef } from 'react';
import {
  CustomizationSettings,
  Asset,
  ThemeMode,
  BubbleStyle,
} from '../core/types';
import { storageService } from '../storage/storageService';
import {
  Palette,
  Frame,
  Image as ImageIcon,
  RotateCcw,
  Save,
  Upload,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Info,
} from 'lucide-react';

interface CustomizationPanelProps {
  customization: CustomizationSettings;
  onCustomizationSaved: (updated: CustomizationSettings) => void;
}

const THEME_OPTIONS: { id: ThemeMode; label: string; desc: string }[] = [
  { id: 'dark-indigo', label: '다크 인디고 (기본)', desc: '깊은 인디고와 네온 바이올렛 글래스 테마' },
  { id: 'black', label: '사이버 블랙', desc: '고대비 블랙 캔버스와 시안 포인트 테마' },
  { id: 'violet', label: '로열 바이올렛', desc: '풍부한 퍼플 톤과 네온 마젠타 테마' },
  { id: 'neon-pink', label: '네온 핑크', desc: '사이버 핑크 하이라이트 테마' },
  { id: 'neon-blue', label: '네온 블루', desc: '홀로그램 블루 및 딥 네이비 테마' },
];

const BUBBLE_OPTIONS: { id: BubbleStyle; label: string; desc: string }[] = [
  { id: 'glass', label: '반투명 글래스 (기본)', desc: '배경이 은은하게 투과되는 글래스모피즘 말풍선' },
  { id: 'neon', label: '사이버 네온 보더', desc: '네온 핑크/블루 발광 테두리 말풍선' },
  { id: 'solid', label: '솔리드 고대비', desc: '가독성을 극대화한 불투명 단색 말풍선' },
];

export const CustomizationPanel: React.FC<CustomizationPanelProps> = ({
  customization,
  onCustomizationSaved,
}) => {
  const [theme, setTheme] = useState<ThemeMode>(customization.theme);
  const [frameAssetId, setFrameAssetId] = useState<string>(customization.frameAssetId);
  const [chatBackgroundAssetId, setChatBackgroundAssetId] = useState<string>(customization.chatBackgroundAssetId);
  const [bubbleStyle, setBubbleStyle] = useState<BubbleStyle>(customization.bubbleStyle);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const frameFileInputRef = useRef<HTMLInputElement>(null);
  const chatBgFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTheme(customization.theme);
    setFrameAssetId(customization.frameAssetId);
    setChatBackgroundAssetId(customization.chatBackgroundAssetId);
    setBubbleStyle(customization.bubbleStyle);
    loadAssets();
  }, [customization]);

  const loadAssets = async () => {
    const all = await storageService.getAllAssets();
    setAssets(all);
  };

  const frameAssets = assets.filter((a) => a.type === 'frame');
  const chatBgAssets = assets.filter((a) => a.type === 'chat-bg' || a.type === 'background');

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

      // Immediately persist selection so reload preserves it even if user forgets to click save
      const updated = await storageService.saveCustomizationSettings({
        theme,
        frameAssetId: asset.id,
        cornerAssetId: customization.cornerAssetId,
        appBackgroundAssetId: customization.appBackgroundAssetId,
        chatBackgroundAssetId,
        bubbleStyle,
        customStickers: customization.customStickers,
      });
      onCustomizationSaved(updated);

      setStatusMsg({
        type: 'success',
        text: deduplicated
          ? `동일한 콘텐츠 해시 이미지가 이미 존재하여 기존 프레임 에셋(${asset.id})을 즉시 적용하고 로컬 저장했습니다.`
          : `새 외부 프레임 PNG 에셋(${asset.name})을 "assets" 스토어에 저장하고 즉시 적용했습니다.`,
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

      const updated = await storageService.saveCustomizationSettings({
        theme,
        frameAssetId,
        cornerAssetId: customization.cornerAssetId,
        appBackgroundAssetId: customization.appBackgroundAssetId,
        chatBackgroundAssetId: asset.id,
        bubbleStyle,
        customStickers: customization.customStickers,
      });
      onCustomizationSaved(updated);

      setStatusMsg({
        type: 'success',
        text: deduplicated
          ? `동일한 콘텐츠 해시 배경 이미지가 이미 존재하여 기존 에셋(${asset.id})을 즉시 적용하고 저장했습니다.`
          : `새 채팅방 배경 에셋(${asset.name})을 "assets" 스토어에 등록하고 즉시 적용했습니다.`,
      });
    } catch (err) {
      setStatusMsg({
        type: 'error',
        text: err instanceof Error ? err.message : '채팅방 배경 등록 실패',
      });
    }
    e.target.value = '';
  };

  const handleSaveCustomization = async () => {
    const updated = await storageService.saveCustomizationSettings({
      theme,
      frameAssetId,
      cornerAssetId: customization.cornerAssetId,
      appBackgroundAssetId: customization.appBackgroundAssetId,
      chatBackgroundAssetId,
      bubbleStyle,
      customStickers: customization.customStickers,
    });
    onCustomizationSaved(updated);
    setStatusMsg({
      type: 'success',
      text: '꾸미기 및 PNG 스킨 설정이 IndexedDB "settings" 스토어에 저장되었습니다. 새로고침 후에도 유지됩니다.',
    });
  };

  const handleResetDefault = async () => {
    const reset = await storageService.resetCustomizationToDefault();
    onCustomizationSaved(reset);
    setStatusMsg({
      type: 'info',
      text: '외부 프레임, 채팅방 배경, 테마가 기본 디자인으로 복원되었습니다. (채팅 기록·캐릭터·커뮤니티 데이터는 변경되지 않고 100% 보존됨)',
    });
  };

  const handleDeleteCustomAsset = async (assetId: string) => {
    const res = await storageService.deleteAssetSafely(assetId, false);
    if (!res.deleted) {
      setStatusMsg({ type: 'error', text: res.reason || '에셋 삭제 불가' });
      return;
    }
    await loadAssets();
    setStatusMsg({ type: 'info', text: `에셋(${assetId})이 안전하게 삭제되었습니다.` });
  };

  const selectedFrameAsset = assets.find((a) => a.id === frameAssetId);
  const selectedChatBgAsset = assets.find((a) => a.id === chatBackgroundAssetId);

  return (
    <div className="flex flex-col h-full bg-slate-950/75 text-slate-100 overflow-y-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-indigo-500/30 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">PNG 스킨 및 전체 외형 꾸미기</h2>
          <p className="text-xs text-slate-400 mt-1">
            외부 프레임(9-slice), 채팅방 배경, 테마, 말풍선 외형을 교체합니다. 스킨 변경 시에도 캐릭터·채팅·커뮤니티 데이터는 절대 삭제되거나 변경되지 않습니다.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleResetDefault}
            className="min-h-[40px] px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-indigo-500/30 text-xs font-medium text-slate-200 flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <RotateCcw size={14} className="text-sky-400" />
            <span>기본 디자인으로 복원</span>
          </button>

          <button
            type="button"
            onClick={handleSaveCustomization}
            className="min-h-[40px] px-5 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-xs font-semibold text-white flex items-center gap-1.5 shadow-lg shadow-pink-600/20 transition-colors whitespace-nowrap"
          >
            <Save size={15} />
            <span>변경 사항 로컬 저장</span>
          </button>
        </div>
      </div>

      {/* Status Notification */}
      {statusMsg && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3 ${
            statusMsg.type === 'error'
              ? 'bg-red-950/70 border-red-500/40 text-red-200'
              : statusMsg.type === 'success'
              ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-200'
              : 'bg-indigo-950/70 border-indigo-500/40 text-indigo-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMsg.type === 'error' ? <AlertCircle size={15} /> : <CheckCircle2 size={15} />}
            <span>{statusMsg.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMsg(null)}
            className="text-xs text-slate-300 hover:text-white"
          >
            닫기
          </button>
        </div>
      )}

      {/* 1. External 9-Slice Frame Replacement & 2. Chat Room Background Replacement */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Frame Replacement Card */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-indigo-500/30 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Frame size={17} className="text-pink-400" />
              <h3 className="text-base font-bold text-white">1. 외부 프레임 PNG 스킨 교체 (9-Slice)</h3>
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
              className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white flex items-center gap-1.5"
            >
              <Upload size={13} />
              <span>사용자 PNG 프레임 등록</span>
            </button>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            투명 배경 PNG, WebP, GIF, SVG를 지원하며, CSS 9-slice 테두리 및 오버레이 방식으로 화면 크기에 따른 왜곡을 최소화합니다.
          </p>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">적용할 프레임 에셋 선택</label>
            <select
              value={frameAssetId}
              onChange={(e) => setFrameAssetId(e.target.value)}
              className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-slate-950 border border-indigo-500/40 text-xs text-white"
            >
              <option value="none">외부 프레임 장식 사용 안 함</option>
              {frameAssets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.isDefault ? '기본 내장' : '사용자 등록'} · ID: {a.id})
                </option>
              ))}
            </select>
          </div>

          {selectedFrameAsset && (
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-4">
              <img
                src={selectedFrameAsset.dataUrl}
                alt={selectedFrameAsset.name}
                referrerPolicy="no-referrer"
                className="w-20 h-20 rounded-xl border border-indigo-500/30 object-contain bg-slate-900 p-1 shrink-0"
              />
              <div className="text-xs space-y-1 min-w-0">
                <div className="font-bold text-white truncate">{selectedFrameAsset.name}</div>
                <div className="text-slate-400 font-mono text-[11px] truncate">
                  Asset ID: {selectedFrameAsset.id}
                </div>
                <div className="text-slate-500 font-mono text-[11px] truncate">
                  SHA-256: {selectedFrameAsset.contentHash.slice(0, 18)}...
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Chat Room Background Replacement Card */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-indigo-500/30 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ImageIcon size={17} className="text-sky-400" />
              <h3 className="text-base font-bold text-white">2. 채팅방 배경 이미지 교체</h3>
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
              className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white flex items-center gap-1.5"
            >
              <Upload size={13} />
              <span>배경 이미지 등록</span>
            </button>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            채팅방 중앙 대화 공간의 배경 이미지를 교체합니다. 텍스트 가독성을 보호하기 위해 자동 명도 스크림이 함께 적용됩니다.
          </p>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">적용할 채팅방 배경 에셋 선택</label>
            <select
              value={chatBackgroundAssetId}
              onChange={(e) => setChatBackgroundAssetId(e.target.value)}
              className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-slate-950 border border-indigo-500/40 text-xs text-white"
            >
              <option value="none">단색 기본 배경 (이미지 없음)</option>
              {chatBgAssets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.isDefault ? '기본 내장' : '사용자 등록'} · ID: {a.id})
                </option>
              ))}
            </select>
          </div>

          {selectedChatBgAsset && (
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-4">
              <img
                src={selectedChatBgAsset.dataUrl}
                alt={selectedChatBgAsset.name}
                referrerPolicy="no-referrer"
                className="w-28 h-20 rounded-xl border border-indigo-500/30 object-cover shrink-0"
              />
              <div className="text-xs space-y-1 min-w-0">
                <div className="font-bold text-white truncate">{selectedChatBgAsset.name}</div>
                <div className="text-slate-400 font-mono text-[11px] truncate">
                  Asset ID: {selectedChatBgAsset.id}
                </div>
                <div className="text-slate-500 font-mono text-[11px] truncate">
                  SHA-256: {selectedChatBgAsset.contentHash.slice(0, 18)}...
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Theme Mode & Speech Bubble Outer Style */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
          <div className="flex items-center gap-2">
            <Palette size={17} className="text-indigo-400" />
            <h3 className="text-sm font-bold text-white">3. 기본 사이버 컬러 테마 선택</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {THEME_OPTIONS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTheme(t.id)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  theme === t.id
                    ? 'bg-indigo-950/90 border-pink-500 text-white shadow-md'
                    : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:border-indigo-500/40'
                }`}
              >
                <div className="text-xs font-bold">{t.label}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">{t.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
          <h3 className="text-sm font-bold text-white">4. 채팅 말풍선 외형 스타일</h3>
          <div className="space-y-2.5">
            {BUBBLE_OPTIONS.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setBubbleStyle(b.id)}
                className={`w-full p-3 rounded-xl border text-left transition-all ${
                  bubbleStyle === b.id
                    ? 'bg-indigo-950/90 border-pink-500 text-white'
                    : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:border-indigo-500/40'
                }`}
              >
                <div className="text-xs font-bold">{b.label}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">{b.desc}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Asset Specifications & IndexedDB 'assets' Store Inspector */}
      <div className="p-5 rounded-2xl bg-slate-900/90 border border-indigo-500/30 space-y-4">
        <div className="flex items-center gap-2">
          <Info size={16} className="text-sky-400" />
          <h3 className="text-sm font-bold text-white">
            에셋 저장 위치 및 권장 규격 안내 (IndexedDB &quot;assets&quot; 스토어)
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <div className="font-bold text-indigo-300">외부 프레임 (9-Slice PNG)</div>
            <p className="text-slate-400">권장 규격: 300×300px 이상 정사각형 투명 배경 PNG 또는 SVG (가장자리 24~36px 슬라이스 영역)</p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <div className="font-bold text-pink-300">채팅방 배경 이미지</div>
            <p className="text-slate-400">권장 규격: 1280×720px 이상 (16:9 가로형 또는 모바일 겸용 패턴 이미지, PNG/WebP/GIF 지원)</p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <div className="font-bold text-sky-300">캐릭터 프로필 & 스티커</div>
            <p className="text-slate-400">권장 규격: 160×160px ~ 512×512px (1:1 비율 투명 PNG 또는 일러스트)</p>
          </div>
        </div>

        {/* Registered Assets List with Reference Integrity Protection */}
        <div className="pt-2">
          <div className="text-xs font-bold text-slate-300 mb-2">
            현재 &quot;assets&quot; 스토어에 분리 저장된 에셋 목록 ({assets.length}개 · 콘텐츠 해시 중복 식별 적용)
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto pr-1">
            {assets.map((a) => (
              <div
                key={a.id}
                className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2.5 text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={a.dataUrl}
                    alt={a.name}
                    referrerPolicy="no-referrer"
                    className="w-10 h-10 rounded-lg border border-slate-700 object-cover shrink-0 bg-slate-900"
                  />
                  <div className="min-w-0">
                    <div className="font-semibold text-white truncate">{a.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono truncate">
                      {a.type} · ID: {a.id}
                    </div>
                  </div>
                </div>
                {!a.isDefault && (
                  <button
                    type="button"
                    onClick={() => handleDeleteCustomAsset(a.id)}
                    className="p-1.5 text-slate-400 hover:text-red-400 shrink-0"
                    title="참조 여부 확인 후 안전 삭제"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
