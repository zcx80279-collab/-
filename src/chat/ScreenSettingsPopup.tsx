import React, { useState, useRef } from 'react';
import {
  ChatRoom,
  CustomizationSettings,
  ChatDisplayPreferences,
  FullSkinSlicedAssets,
  BubbleCustomization,
} from '../core/types';
import { storageService } from '../storage/storageService';
import {
  SKIN_LAYOUT_REGIONS,
  downloadGuidelinePng,
  sliceFullSkinPngFile,
  SlicedSkinPreviewResult,
} from '../customization/pngSkinSystem';
import {
  X,
  SlidersHorizontal,
  Download,
  Upload,
  RotateCcw,
  Check,
  Eye,
  Palette,
  MessageSquare,
  Globe,
  Sparkles,
  Info,
} from 'lucide-react';

interface ScreenSettingsPopupProps {
  isOpen: boolean;
  onClose: () => void;
  displayPreferences: ChatDisplayPreferences;
  onChangeDisplayPreferences: (next: ChatDisplayPreferences) => Promise<void>;
  globalCustomization: CustomizationSettings;
  activeRoom: ChatRoom | null;
  activeRoomTitle: string;
  assetUrls: Record<string, string>;
  onCustomizationSaved: () => Promise<void>;
  /** Live preview callback so user sees changes immediately before applying/canceling */
  onPreviewSkinChange: (preview: {
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
  } | null) => void;
}

type CustomizeScope = 'global' | 'room';

export const ScreenSettingsPopup: React.FC<ScreenSettingsPopupProps> = ({
  isOpen,
  onClose,
  displayPreferences,
  onChangeDisplayPreferences,
  globalCustomization,
  activeRoom,
  activeRoomTitle,
  assetUrls,
  onCustomizationSaved,
  onPreviewSkinChange,
}) => {
  const [scope, setScope] = useState<CustomizeScope>('global');
  const [activeSubTab, setActiveSubTab] = useState<'display' | 'skin' | 'bubbles'>('display');
  const [statusNotice, setStatusNotice] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Pending full-screen 1920x1080 sliced preview
  const [pendingSlice, setPendingSlice] = useState<SlicedSkinPreviewResult | null>(null);
  const [showCoordDocs, setShowCoordDocs] = useState(false);

  // Pending bubble customization state for current scope
  const getInitialBubbles = (targetScope: CustomizeScope): BubbleCustomization => {
    const src =
      targetScope === 'room' && activeRoom?.customization?.bubbles
        ? activeRoom.customization.bubbles
        : globalCustomization.bubbles;
    return {
      opponentBubbleAssetId: src?.opponentBubbleAssetId,
      userBubbleAssetId: src?.userBubbleAssetId,
      opponentTextColor: src?.opponentTextColor || '#f0f9ff',
      userTextColor: src?.userTextColor || '#fdf4ff',
    };
  };

  const [pendingBubbles, setPendingBubbles] = useState<BubbleCustomization>(() =>
    getInitialBubbles('global')
  );
  const [pendingOpponentBubbleUrl, setPendingOpponentBubbleUrl] = useState<string | undefined>(undefined);
  const [pendingUserBubbleUrl, setPendingUserBubbleUrl] = useState<string | undefined>(undefined);
  const [pendingOpponentFile, setPendingOpponentFile] = useState<File | null>(null);
  const [pendingUserFile, setPendingUserFile] = useState<File | null>(null);

  const fullSkinInputRef = useRef<HTMLInputElement>(null);
  const opponentBubbleInputRef = useRef<HTMLInputElement>(null);
  const userBubbleInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const hasRoomCustomSkin = Boolean(
    activeRoom?.customization?.fullSkin?.outerFrameAssetId ||
      activeRoom?.customization?.fullSkin?.friendListAssetId ||
      activeRoom?.customization?.fullSkin?.chatBgAssetId ||
      activeRoom?.customization?.fullSkin?.inputBarAssetId
  );

  const switchScope = (nextScope: CustomizeScope) => {
    setScope(nextScope);
    setPendingSlice(null);
    setPendingOpponentFile(null);
    setPendingUserFile(null);
    setPendingOpponentBubbleUrl(undefined);
    setPendingUserBubbleUrl(undefined);
    setPendingBubbles(getInitialBubbles(nextScope));
    onPreviewSkinChange(null);
    setStatusNotice(null);
  };

  const handleClose = () => {
    setPendingSlice(null);
    onPreviewSkinChange(null);
    onClose();
  };

  const handleUploadFullSkin = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);
    setStatusNotice(null);
    try {
      const sliced = await sliceFullSkinPngFile(file);
      setPendingSlice(sliced);
      onPreviewSkinChange({
        scope,
        fullSkinDataUrls: {
          outerFrame: sliced.outerFrameDataUrl,
          friendList: sliced.friendListDataUrl,
          chatBg: sliced.chatBgDataUrl,
          inputBar: sliced.inputBarDataUrl,
        },
        bubbles: pendingBubbles,
        bubbleDataUrls: {
          opponent: pendingOpponentBubbleUrl,
          user: pendingUserBubbleUrl,
        },
      });
      setStatusNotice({
        type: 'info',
        text: `1920×1080 기준으로 4개 영역을 자동 분리했습니다. (원본: ${sliced.sourceWidth}×${sliced.sourceHeight}) 미리보기를 확인 후 [적용 및 저장]을 눌러주세요.`,
      });
    } catch (err) {
      setStatusNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'PNG 자동 분리 중 오류가 발생했습니다.',
      });
    } finally {
      setIsProcessing(false);
      e.target.value = '';
    }
  };

  const handleSelectBubbleFile = async (
    target: 'opponent' | 'user',
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      if (target === 'opponent') {
        setPendingOpponentFile(file);
        setPendingOpponentBubbleUrl(dataUrl);
      } else {
        setPendingUserFile(file);
        setPendingUserBubbleUrl(dataUrl);
      }
      onPreviewSkinChange({
        scope,
        fullSkinDataUrls: pendingSlice
          ? {
              outerFrame: pendingSlice.outerFrameDataUrl,
              friendList: pendingSlice.friendListDataUrl,
              chatBg: pendingSlice.chatBgDataUrl,
              inputBar: pendingSlice.inputBarDataUrl,
            }
          : undefined,
        bubbles: pendingBubbles,
        bubbleDataUrls: {
          opponent: target === 'opponent' ? dataUrl : pendingOpponentBubbleUrl,
          user: target === 'user' ? dataUrl : pendingUserBubbleUrl,
        },
      });
      setStatusNotice({
        type: 'info',
        text: `${target === 'opponent' ? '상대방' : '사용자'} 말풍선 PNG가 미리보기에 반영되었습니다.`,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleTextColorChange = (target: 'opponent' | 'user', color: string) => {
    const nextBubbles: BubbleCustomization = {
      ...pendingBubbles,
      ...(target === 'opponent' ? { opponentTextColor: color } : { userTextColor: color }),
    };
    setPendingBubbles(nextBubbles);
    onPreviewSkinChange({
      scope,
      fullSkinDataUrls: pendingSlice
        ? {
            outerFrame: pendingSlice.outerFrameDataUrl,
            friendList: pendingSlice.friendListDataUrl,
            chatBg: pendingSlice.chatBgDataUrl,
            inputBar: pendingSlice.inputBarDataUrl,
          }
        : undefined,
      bubbles: nextBubbles,
      bubbleDataUrls: {
        opponent: pendingOpponentBubbleUrl,
        user: pendingUserBubbleUrl,
      },
    });
  };

  const handleApplyAndSave = async () => {
    if (scope === 'room' && !activeRoom) {
      setStatusNotice({ type: 'error', text: '선택된 채팅방이 없습니다.' });
      return;
    }

    setIsProcessing(true);
    setStatusNotice(null);
    try {
      let savedFullSkin: FullSkinSlicedAssets | undefined =
        scope === 'room' ? activeRoom?.customization?.fullSkin : globalCustomization.fullSkin;

      if (pendingSlice) {
        const tag = scope === 'room' ? `room-${activeRoom?.id}` : 'global';
        const [srcReg, frameReg, listReg, bgReg, inputReg] = await Promise.all([
          storageService.registerAssetFromDataUrl(
            pendingSlice.sourceDataUrl,
            'full-skin',
            `전체 스킨 원본 (${tag})`,
            '1920x1080'
          ),
          storageService.registerAssetFromDataUrl(
            pendingSlice.outerFrameDataUrl,
            'frame',
            `외곽 프레임 (${tag})`,
            '1920x1080'
          ),
          storageService.registerAssetFromDataUrl(
            pendingSlice.friendListDataUrl,
            'friend-list-bg',
            `왼쪽 친구 목록 (${tag})`,
            '550x976'
          ),
          storageService.registerAssetFromDataUrl(
            pendingSlice.chatBgDataUrl,
            'chat-bg',
            `오른쪽 채팅 배경 (${tag})`,
            '1286x804'
          ),
          storageService.registerAssetFromDataUrl(
            pendingSlice.inputBarDataUrl,
            'input-bar-bg',
            `하단 입력창 (${tag})`,
            '1244x76'
          ),
        ]);

        savedFullSkin = {
          sourceAssetId: srcReg.asset.id,
          outerFrameAssetId: frameReg.asset.id,
          friendListAssetId: listReg.asset.id,
          chatBgAssetId: bgReg.asset.id,
          inputBarAssetId: inputReg.asset.id,
        };
      }

      const nextBubbles: BubbleCustomization = { ...pendingBubbles };
      if (pendingOpponentFile) {
        const { asset } = await storageService.registerAssetFromFile(
          pendingOpponentFile,
          'bubble-opponent',
          `상대방 말풍선: ${pendingOpponentFile.name}`
        );
        nextBubbles.opponentBubbleAssetId = asset.id;
      }
      if (pendingUserFile) {
        const { asset } = await storageService.registerAssetFromFile(
          pendingUserFile,
          'bubble-user',
          `사용자 말풍선: ${pendingUserFile.name}`
        );
        nextBubbles.userBubbleAssetId = asset.id;
      }

      if (scope === 'global') {
        // Updating global design NEVER overwrites individual room designs
        await storageService.saveCustomizationSettings({
          theme: globalCustomization.theme,
          frameAssetId: globalCustomization.frameAssetId,
          cornerAssetId: globalCustomization.cornerAssetId,
          appBackgroundAssetId: globalCustomization.appBackgroundAssetId,
          chatBackgroundAssetId: globalCustomization.chatBackgroundAssetId,
          bubbleStyle: globalCustomization.bubbleStyle,
          customStickers: globalCustomization.customStickers,
          fullSkin: savedFullSkin,
          bubbles: nextBubbles,
        });
      } else if (activeRoom) {
        await storageService.updateRoomSettings(activeRoom.id, {
          customization: {
            ...(activeRoom.customization || {}),
            fullSkin: savedFullSkin,
            bubbles: nextBubbles,
          },
        });
      }

      setPendingSlice(null);
      setPendingOpponentFile(null);
      setPendingUserFile(null);
      setPendingOpponentBubbleUrl(undefined);
      setPendingUserBubbleUrl(undefined);
      onPreviewSkinChange(null);
      await onCustomizationSaved();

      setStatusNotice({
        type: 'success',
        text:
          scope === 'global'
            ? '공용 디자인이 저장되었습니다. (개별 설정된 채팅방 디자인은 유지됩니다)'
            : `[${activeRoomTitle}] 채팅방 전용 디자인이 저장되었습니다.`,
      });
    } catch (err) {
      setStatusNotice({
        type: 'error',
        text: err instanceof Error ? err.message : '디자인 저장 중 오류가 발생했습니다.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetToDefault = async () => {
    setIsProcessing(true);
    try {
      if (scope === 'global') {
        await storageService.saveCustomizationSettings({
          theme: globalCustomization.theme,
          frameAssetId: 'default-frame-indigo',
          cornerAssetId: 'none',
          appBackgroundAssetId: 'none',
          chatBackgroundAssetId: 'default-chat-bg-night',
          bubbleStyle: globalCustomization.bubbleStyle,
          customStickers: globalCustomization.customStickers,
          fullSkin: undefined,
          bubbles: undefined,
        });
      } else if (activeRoom) {
        await storageService.updateRoomSettings(activeRoom.id, {
          clearCustomization: true,
        });
      }
      setPendingSlice(null);
      setPendingOpponentFile(null);
      setPendingUserFile(null);
      setPendingOpponentBubbleUrl(undefined);
      setPendingUserBubbleUrl(undefined);
      setPendingBubbles({
        opponentTextColor: '#f0f9ff',
        userTextColor: '#fdf4ff',
      });
      onPreviewSkinChange(null);
      await onCustomizationSaved();
      setStatusNotice({
        type: 'success',
        text:
          scope === 'global'
            ? '공용 화면이 기본 사이버토끼 디자인으로 복원되었습니다.'
            : `[${activeRoomTitle}] 개별 디자인을 해제하여 공용 디자인을 따르도록 복원했습니다.`,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const currentSavedFullSkin =
    scope === 'room' ? activeRoom?.customization?.fullSkin : globalCustomization.fullSkin;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-start p-3 sm:p-6 bg-black/45 backdrop-blur-[2px]"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="mt-10 sm:mt-14 sm:ml-6 w-full max-w-[440px] max-h-[82vh] flex flex-col rounded-2xl bg-[#110824]/98 border border-fuchsia-400/55 shadow-[0_0_32px_rgba(232,121,249,0.28)] overflow-hidden text-slate-100">
        {/* Popup Header */}
        <div className="px-4 py-3 bg-gradient-to-r from-[#1f0b3a] via-[#15082b] to-[#0f1636] border-b border-fuchsia-500/35 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={16} className="text-fuchsia-300" />
            <h3 className="text-sm font-bold text-white">화면 설정 및 커스터마이징</h3>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="설정 팝업 닫기"
            className="p-1.5 rounded-lg bg-slate-900/80 hover:bg-fuchsia-950/80 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>

        {/* Sub-Navigation Pills */}
        <div className="px-3.5 pt-3 pb-2 flex items-center gap-1.5 border-b border-indigo-500/25 shrink-0">
          <button
            type="button"
            onClick={() => setActiveSubTab('display')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1 ${
              activeSubTab === 'display'
                ? 'bg-fuchsia-600/85 text-white shadow-[0_0_12px_rgba(217,70,239,0.4)]'
                : 'bg-slate-900/70 text-slate-300 hover:text-white'
            }`}
          >
            <Eye size={13} />
            <span>표시 설정</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('skin')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1 ${
              activeSubTab === 'skin'
                ? 'bg-fuchsia-600/85 text-white shadow-[0_0_12px_rgba(217,70,239,0.4)]'
                : 'bg-slate-900/70 text-slate-300 hover:text-white'
            }`}
          >
            <Palette size={13} />
            <span>화면 PNG</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('bubbles')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1 ${
              activeSubTab === 'bubbles'
                ? 'bg-fuchsia-600/85 text-white shadow-[0_0_12px_rgba(217,70,239,0.4)]'
                : 'bg-slate-900/70 text-slate-300 hover:text-white'
            }`}
          >
            <MessageSquare size={13} />
            <span>말풍선</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {statusNotice && (
            <div
              className={`p-2.5 rounded-xl text-xs leading-relaxed border ${
                statusNotice.type === 'success'
                  ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-200'
                  : statusNotice.type === 'error'
                  ? 'bg-red-950/70 border-red-500/50 text-red-200'
                  : 'bg-cyan-950/70 border-cyan-400/50 text-cyan-100'
              }`}
            >
              {statusNotice.text}
            </div>
          )}

          {/* TAB 1: DISPLAY SETTINGS */}
          {activeSubTab === 'display' && (
            <div className="space-y-3">
              <div className="text-[11px] font-semibold text-fuchsia-300 uppercase tracking-wider">
                친구 목록 표시 설정
              </div>

              <label className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-950/75 border border-indigo-500/30 cursor-pointer">
                <div>
                  <div className="text-xs font-bold text-white">상세 상태 메시지 표시</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    OFF 시 상태 메시지 영역을 숨기고 카드를 컴팩트하게 정렬합니다.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={displayPreferences.showStatusMessage}
                  onChange={(e) =>
                    onChangeDisplayPreferences({
                      ...displayPreferences,
                      showStatusMessage: e.target.checked,
                    })
                  }
                  className="w-4 h-4 accent-fuchsia-500 cursor-pointer shrink-0"
                />
              </label>

              <label className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-950/75 border border-indigo-500/30 cursor-pointer">
                <div>
                  <div className="text-xs font-bold text-white">접속 상태 표시</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    접속 중(초록) · 휴식 중(초승달/노랑) · 오프라인(회색) 가상 상태를 표시합니다.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={displayPreferences.showPresenceStatus}
                  onChange={(e) =>
                    onChangeDisplayPreferences({
                      ...displayPreferences,
                      showPresenceStatus: e.target.checked,
                    })
                  }
                  className="w-4 h-4 accent-fuchsia-500 cursor-pointer shrink-0"
                />
              </label>

              <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/25 text-[11px] text-slate-300 leading-relaxed">
                <strong className="text-cyan-300">꾸미기 안내:</strong> 상단의{' '}
                <strong>[화면 PNG]</strong>와 <strong>[말풍선]</strong> 탭에서 공용 화면과 현재 채팅방의 디자인을 각각 독립적으로 꾸밀 수 있습니다.
              </div>
            </div>
          )}

          {/* TAB 2 & 3 SHARED SCOPE SWITCHER */}
          {(activeSubTab === 'skin' || activeSubTab === 'bubbles') && (
            <div className="space-y-2">
              <div className="text-[11px] font-semibold text-fuchsia-300">꾸미기 적용 대상</div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => switchScope('global')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    scope === 'global'
                      ? 'bg-fuchsia-950/70 border-fuchsia-400 text-white shadow-[0_0_12px_rgba(232,121,249,0.25)]'
                      : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    <Globe size={13} className="text-cyan-300" />
                    <span>공용 화면 꾸미기</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">모든 채팅방 기본 적용</div>
                </button>
                <button
                  type="button"
                  disabled={!activeRoom}
                  onClick={() => switchScope('room')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer disabled:opacity-40 ${
                    scope === 'room'
                      ? 'bg-fuchsia-950/70 border-fuchsia-400 text-white shadow-[0_0_12px_rgba(232,121,249,0.25)]'
                      : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold truncate">
                    <Sparkles size={13} className="text-fuchsia-300 shrink-0" />
                    <span className="truncate">현재 채팅방 꾸미기</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                    {activeRoom
                      ? hasRoomCustomSkin
                        ? `${activeRoomTitle} (전용 적용 중)`
                        : `${activeRoomTitle} (공용 사용 중)`
                      : '선택된 방 없음'}
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: FULL-SCREEN 1920x1080 PNG SKIN */}
          {activeSubTab === 'skin' && (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-slate-950/80 border border-cyan-500/30 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-bold text-white">전체 화면 PNG 등록 (1920×1080px)</div>
                    <div className="text-[11px] text-slate-400">
                      한 장의 PNG(알파 채널 지원)를 등록하면 4개 영역으로 자동 분리됩니다.
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={downloadGuidelinePng}
                    className="min-h-[38px] px-3 py-2 rounded-xl bg-cyan-950/80 hover:bg-cyan-900/80 border border-cyan-400/50 text-xs font-semibold text-cyan-200 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Download size={13} />
                    <span>가이드라인 PNG 저장</span>
                  </button>

                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => fullSkinInputRef.current?.click()}
                    className="min-h-[38px] px-3 py-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-pink-500 hover:from-fuchsia-500 hover:to-pink-400 text-xs font-bold text-white flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Upload size={13} />
                    <span>완성 PNG 등록</span>
                  </button>
                </div>

                <input
                  ref={fullSkinInputRef}
                  type="file"
                  accept="image/png,image/webp"
                  onChange={handleUploadFullSkin}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => setShowCoordDocs(!showCoordDocs)}
                  className="text-[11px] text-cyan-300 hover:text-cyan-200 flex items-center gap-1 cursor-pointer"
                >
                  <Info size={12} />
                  <span>{showCoordDocs ? '자동 분리 좌표 숨기기' : '자동 분리 확정 좌표 보기 (1920×1080)'}</span>
                </button>

                {showCoordDocs && (
                  <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1 text-[10px] font-mono text-slate-300">
                    {Object.values(SKIN_LAYOUT_REGIONS).map((reg) => (
                      <div key={reg.key} className="flex items-center justify-between gap-2">
                        <span className="text-fuchsia-300 font-sans font-semibold">{reg.label}</span>
                        <span>
                          x:{reg.x}, y:{reg.y}, {reg.width}×{reg.height}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Sliced 4-Region Preview */}
              {(pendingSlice || currentSavedFullSkin?.outerFrameAssetId) && (
                <div className="space-y-2">
                  <div className="text-[11px] font-semibold text-cyan-300">
                    {pendingSlice ? '자동 분리 미리보기 (미저장)' : '현재 적용된 PNG 영역'}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      {
                        label: '전체 외곽 프레임',
                        url:
                          pendingSlice?.outerFrameDataUrl ||
                          (currentSavedFullSkin?.outerFrameAssetId
                            ? assetUrls[currentSavedFullSkin.outerFrameAssetId]
                            : ''),
                      },
                      {
                        label: '왼쪽 친구 목록',
                        url:
                          pendingSlice?.friendListDataUrl ||
                          (currentSavedFullSkin?.friendListAssetId
                            ? assetUrls[currentSavedFullSkin.friendListAssetId]
                            : ''),
                      },
                      {
                        label: '오른쪽 채팅 배경',
                        url:
                          pendingSlice?.chatBgDataUrl ||
                          (currentSavedFullSkin?.chatBgAssetId
                            ? assetUrls[currentSavedFullSkin.chatBgAssetId]
                            : ''),
                      },
                      {
                        label: '하단 메시지 입력창',
                        url:
                          pendingSlice?.inputBarDataUrl ||
                          (currentSavedFullSkin?.inputBarAssetId
                            ? assetUrls[currentSavedFullSkin.inputBarAssetId]
                            : ''),
                      },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="p-1.5 rounded-lg bg-slate-950/90 border border-indigo-500/30 space-y-1"
                      >
                        <div className="h-14 rounded bg-[#080515] overflow-hidden flex items-center justify-center">
                          {item.url ? (
                            <img
                              src={item.url}
                              alt={item.label}
                              className="max-w-full max-h-full object-contain"
                            />
                          ) : (
                            <span className="text-[10px] text-slate-500">기본</span>
                          )}
                        </div>
                        <div className="text-[10px] text-center text-slate-300 truncate">
                          {item.label}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SPEECH BUBBLE CUSTOMIZATION (9-SLICE PNG + TEXT COLOR) */}
          {activeSubTab === 'bubbles' && (
            <div className="space-y-3">
              {/* Opponent Bubble */}
              <div className="p-3 rounded-xl bg-slate-950/80 border border-cyan-500/35 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-cyan-300">상대방 말풍선 (9-slice)</span>
                  <button
                    type="button"
                    onClick={() => opponentBubbleInputRef.current?.click()}
                    className="px-2.5 py-1 rounded-lg bg-cyan-950 hover:bg-cyan-900 border border-cyan-400/50 text-[11px] font-semibold text-cyan-200 flex items-center gap-1 cursor-pointer"
                  >
                    <Upload size={11} />
                    <span>PNG 교체</span>
                  </button>
                </div>
                <input
                  ref={opponentBubbleInputRef}
                  type="file"
                  accept="image/png,image/webp"
                  onChange={(e) => handleSelectBubbleFile('opponent', e)}
                  className="hidden"
                />
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-slate-300">상대방 메시지 글자색</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={pendingBubbles.opponentTextColor || '#f0f9ff'}
                      onChange={(e) => handleTextColorChange('opponent', e.target.value)}
                      className="w-7 h-7 rounded border border-slate-700 bg-transparent cursor-pointer"
                    />
                    <span className="font-mono text-[11px] text-slate-300">
                      {pendingBubbles.opponentTextColor || '#f0f9ff'}
                    </span>
                  </div>
                </div>
              </div>

              {/* User Bubble */}
              <div className="p-3 rounded-xl bg-slate-950/80 border border-fuchsia-500/35 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-fuchsia-300">사용자 말풍선 (9-slice)</span>
                  <button
                    type="button"
                    onClick={() => userBubbleInputRef.current?.click()}
                    className="px-2.5 py-1 rounded-lg bg-fuchsia-950 hover:bg-fuchsia-900 border border-fuchsia-400/50 text-[11px] font-semibold text-fuchsia-200 flex items-center gap-1 cursor-pointer"
                  >
                    <Upload size={11} />
                    <span>PNG 교체</span>
                  </button>
                </div>
                <input
                  ref={userBubbleInputRef}
                  type="file"
                  accept="image/png,image/webp"
                  onChange={(e) => handleSelectBubbleFile('user', e)}
                  className="hidden"
                />
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-slate-300">사용자 메시지 글자색</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={pendingBubbles.userTextColor || '#fdf4ff'}
                      onChange={(e) => handleTextColorChange('user', e.target.value)}
                      className="w-7 h-7 rounded border border-slate-700 bg-transparent cursor-pointer"
                    />
                    <span className="font-mono text-[11px] text-slate-300">
                      {pendingBubbles.userTextColor || '#fdf4ff'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions (Apply / Cancel / Restore Default) */}
        {(activeSubTab === 'skin' || activeSubTab === 'bubbles') && (
          <div className="px-4 py-3 bg-[#0c061a] border-t border-fuchsia-500/30 flex items-center justify-between gap-2 shrink-0">
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleResetToDefault}
              className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-300 flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              <RotateCcw size={13} />
              <span>기본 복원</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleApplyAndSave}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-pink-500 hover:from-fuchsia-500 hover:to-pink-400 text-xs font-bold text-white flex items-center gap-1 shadow-[0_0_14px_rgba(236,72,153,0.45)] cursor-pointer disabled:opacity-50"
              >
                <Check size={13} />
                <span>적용 및 저장</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
