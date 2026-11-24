import React, { useState, useEffect, useRef } from 'react';
import { storageService } from '../storage/storageService';
import {
  Message,
  Character,
  BubbleCustomization,
  GUIDE_RAVI_ID,
  GUIDE_RAVI_ROOM_ID,
} from '../core/types';
import { DEFAULT_AVATARS, CYBER_RABBIT_WATERMARK_SVG } from '../core/defaultAssets';
import { CyberSpeechBubble } from '../chat/CyberSpeechBubble';
import {
  RaviUpgradePromptModal,
  DEFAULT_RAVI_AI_BRIDGE_STATE,
} from '../chat/RaviUpgradePromptModal';
import {
  Plus,
  Send,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  ArrowLeft,
} from 'lucide-react';

interface GuideRaviChatProps {
  onNavigateTab: (tab: 'chat' | 'community' | 'characters' | 'settings' | 'report') => void;
  onBackToMobileList?: () => void;
  customChatBgUrl?: string;
  customInputBarUrl?: string;
  bubbleCustomization?: BubbleCustomization;
  assetUrls?: Record<string, string>;
}

export interface GuideOption {
  id: string;
  number: number;
  title: string;
  answer: string;
}

/**
 * Built-in Guide Ravi Fixed Options
 * - Strictly 6 required options
 * - No AI API calls, no free text generation, no fake external URLs, only real implemented paths.
 */
export const GUIDE_RAVI_OPTIONS: GuideOption[] = [
  {
    id: 'ravi-opt-1',
    number: 1,
    title: '러비러비톡 기본 사용법',
    answer:
      '러비러비톡(Lovy Lovy Talk)에 오신 것을 환영합니다!\n\n' +
      '• 상단(모바일은 하단) 메뉴에서 [채팅방], [커뮤니티], [캐릭터 관리], [환경설정] 화면으로 이동할 수 있습니다.\n' +
      '• [캐릭터 관리] 상단에서 「나의 분신」을 등록하면 AI 캐릭터와 사회자가 당신을 인식하며 이야기를 이어갑니다.\n' +
      '• 모든 데이터는 브라우저 내장 IndexedDB(lovy_lovy_talk_db)에 안전하게 로컬 저장되며 새로고침 후에도 그대로 유지됩니다.',
  },
  {
    id: 'ravi-opt-2',
    number: 2,
    title: '캐릭터 등록 및 관리',
    answer:
      '[캐릭터 관리] 화면에서 나만의 AI 캐릭터를 추가·수정·삭제할 수 있습니다.\n\n' +
      '• 저장 항목: 고유 ID, 이름, 프로필 이미지 에셋 ID(avatarAssetId), 기본 프롬프트, 캐릭터 설명, 사용자 지정 설정, 생성/수정 시각, 데이터 구조 버전.\n' +
      '• 데이터 보호 정책: 캐릭터를 삭제하더라도 해당 캐릭터와 나눈 기존 채팅방, 메시지 기록, 스토리 중요 기억은 자동 삭제되지 않고 안전하게 보존됩니다.\n' +
      '• 캐릭터 설정 JSON 내보내기 및 가져오기(Import/Export) 기능을 통해 데이터를 백업하거나 공유할 수 있습니다.',
  },
  {
    id: 'ravi-opt-3',
    number: 3,
    title: '일상 모드와 스토리 모드',
    answer:
      '각 캐릭터 채팅방 상단에서 [일상 모드]와 [스토리 모드]를 언제든 전환할 수 있습니다.\n\n' +
      '• 일상 모드: 일반적인 일상 대화 공간입니다. 각 메시지의 북마크(보존) 버튼을 눌러 향후 도입될 자동 기록 정리 대상에서 영구 제외할 수 있습니다.\n' +
      '• 스토리 모드: 일상 모드와 분리된 몰입형 대화 공간입니다. [추억의 한조각]을 직접 관리할 수 있으며, 스토리 기록은 자동 삭제가 영구 금지됩니다.',
  },
  {
    id: 'ravi-opt-4',
    number: 4,
    title: '커뮤니티 이용 방법',
    answer:
      '[커뮤니티]는 실제 사용자 간 게시판이 아니라, 등록된 AI 캐릭터들이 활동하는 가상 SNS 공간입니다.\n\n' +
      '• 화면 구조 검증을 위한 [예시 데이터]와 사용자가 직접 작성·테스트하는 [사용자 데이터]가 명확한 배지와 필터로 구분됩니다.\n' +
      '• 상단의 [예시 데이터만 일괄 삭제] 버튼을 눌러 예시 게시글을 지우더라도 사용자가 작성한 게시글과 댓글은 전혀 영향을 받지 않습니다.',
  },
  {
    id: 'ravi-opt-5',
    number: 5,
    title: 'PNG 파일 위치 및 교체 방법',
    answer:
      '친구 목록 상단의 [화면 설정(슬라이더)] 아이콘을 누르면 현재 화면 위에서 바로 공용 화면과 채팅방별 디자인을 꾸밀 수 있습니다.\n\n' +
      '• 1920×1080px 가이드라인 PNG를 저장한 뒤 그림 프로그램에서 디자인을 제작하고 완성된 PNG를 등록하면 4개 영역(외곽 프레임·친구 목록·채팅 배경·하단 입력창)이 자동 분리되어 적용됩니다.\n' +
      '• 상대방/사용자 말풍선 PNG(9-slice)와 글자색도 별도로 교체할 수 있으며, 모든 리소스는 IndexedDB "assets" 스토어에 안전하게 저장됩니다.',
  },
  {
    id: 'ravi-opt-6',
    number: 6,
    title: '다른 앱 안내',
    answer:
      '다른 앱에 대한 안내를 도와드릴게요!\n\n' +
      '안내 라비는 사전 등록된 고정 안내문만 출력하는 선택지 전용 안내 봇입니다. (AI API 호출 및 자유 대화 생성 금지)\n' +
      '• 일반적인 자유 대화나 개인 AI 비서 기능이 필요하신 경우, 향후 독립 앱 [라비 AI]가 설치·연동되면 업그레이드 안내를 통해 연결할 수 있습니다.\n' +
      '• [사이버토끼 OS] 및 [사이버 다이어리]와 디자인 정체성을 공유하되 완전히 독립된 프로젝트로 안전하게 운영됩니다.',
  },
];

export const GuideRaviChat: React.FC<GuideRaviChatProps> = ({
  onBackToMobileList,
  customChatBgUrl,
  customInputBarUrl,
  bubbleCustomization,
  assetUrls = {},
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [guideChar, setGuideChar] = useState<Character | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string>(DEFAULT_AVATARS.ravi);
  const [showOptionsDrawer, setShowOptionsDrawer] = useState<boolean>(true);
  // Future expansion hook (dormant in Patch 3: never forced or faked)
  const [raviBridge] = useState(DEFAULT_RAVI_AI_BRIDGE_STATE);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadGuideData();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const loadGuideData = async () => {
    const chars = await storageService.getAllCharacters();
    const ravi = chars.find((c) => c.id === GUIDE_RAVI_ID) || null;
    setGuideChar(ravi);
    if (ravi?.avatarAssetId) {
      const url = await storageService.resolveAssetUrl(ravi.avatarAssetId);
      setAvatarUrl(url);
    }
    const msgs = await storageService.getMessagesByRoom(GUIDE_RAVI_ROOM_ID);
    setMessages(msgs);
  };

  const handleSelectOption = async (option: GuideOption) => {
    await storageService.addMessage({
      roomId: GUIDE_RAVI_ROOM_ID,
      sender: 'user',
      content: `[선택지 ${option.number}] ${option.title}`,
      mode: 'daily',
    });

    await storageService.addMessage({
      roomId: GUIDE_RAVI_ROOM_ID,
      sender: 'guide',
      content: option.answer,
      mode: 'daily',
    });

    await loadGuideData();
  };

  return (
    <div
      className="relative flex flex-col h-full w-full overflow-hidden cyber-chat-grid text-slate-100"
      style={
        customChatBgUrl
          ? {
              backgroundImage: `url("${customChatBgUrl}")`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }
          : undefined
      }
    >
      {/* Subtle Sparkle Stars (matching reference image) */}
      {!customChatBgUrl && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden z-0">
          <span className="absolute top-[22%] right-[5%] text-cyan-300/70 text-xs">✦</span>
          <span className="absolute top-[40%] left-[7%] text-fuchsia-400/60 text-[10px]">✦</span>
          <span className="absolute top-[60%] right-[5%] text-cyan-300/75 text-sm">✦</span>
          <span className="absolute bottom-[22%] right-[24%] text-fuchsia-400/60 text-[10px]">✦</span>
        </div>
      )}

      {/* Center Translucent Cyber Rabbit OS Mascot Watermark (ONLY here & Guide Ravi avatar) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex items-center justify-center z-0"
      >
        <div
          className="w-[240px] sm:w-[300px] opacity-[0.22] select-none"
          dangerouslySetInnerHTML={{ __html: CYBER_RABBIT_WATERMARK_SVG }}
        />
      </div>

      {/* Chat Header (matching 13943.png: Mascot avatar + bold white title + thin divider) */}
      <div className="relative z-10 px-4 sm:px-6 py-3 border-b border-fuchsia-500/25 bg-[#0c071e]/60 backdrop-blur-xs flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {onBackToMobileList && (
            <button
              type="button"
              onClick={onBackToMobileList}
              className="md:hidden p-2 rounded-xl bg-slate-900/80 border border-fuchsia-500/40 text-slate-200 shrink-0"
              aria-label="채팅 목록으로 돌아가기"
            >
              <ArrowLeft size={16} />
            </button>
          )}
          <img
            src={avatarUrl}
            alt={guideChar?.name || '안내 라비'}
            referrerPolicy="no-referrer"
            className="w-9 h-9 rounded-full border border-fuchsia-400/70 shadow-[0_0_12px_rgba(232,121,249,0.55)] object-cover shrink-0"
          />
          <h2 className="text-base sm:text-lg font-extrabold tracking-tight text-white truncate">
            {guideChar?.name || '안내 라비'}
          </h2>
        </div>

        <button
          type="button"
          onClick={() => setShowOptionsDrawer((prev) => !prev)}
          className="px-3 py-1.5 rounded-xl bg-[#180c32]/90 hover:bg-[#26114d] border border-fuchsia-400/45 text-xs font-semibold text-fuchsia-200 flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
        >
          <HelpCircle size={13} className="text-cyan-300" />
          <span>안내 선택지</span>
          {showOptionsDrawer ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="relative z-10 flex-1 overflow-y-auto px-4 sm:px-7 py-5 space-y-5 cyber-scrollbar">
        {messages.map((msg) => {
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
                <span className="mt-1.5 mr-1 text-[11px] text-slate-400 tabular-nums">
                  {timeText}
                </span>
              </div>
            );
          }

          return (
            <div key={msg.id} className="flex items-start gap-3">
              <img
                src={avatarUrl}
                alt="안내 라비"
                referrerPolicy="no-referrer"
                className="w-9 h-9 rounded-full border border-fuchsia-400/70 shadow-[0_0_10px_rgba(232,121,249,0.5)] object-cover shrink-0 mt-1"
              />
              <div className="flex flex-wrap items-end gap-2.5 max-w-[88%] sm:max-w-[78%]">
                <CyberSpeechBubble
                  variant="opponent"
                  bubbleCustomization={bubbleCustomization}
                  assetUrls={assetUrls}
                  className="max-w-full"
                >
                  {msg.content}
                </CyberSpeechBubble>
                <span className="text-[11px] text-slate-400 tabular-nums pb-1 shrink-0">
                  {timeText}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Fixed 6 Choice Buttons Drawer (Strictly preserves Guide Ravi's choice-only guidance) */}
      {showOptionsDrawer && (
        <div className="relative z-10 px-4 sm:px-6 pt-2.5 pb-2 bg-[#0c061c]/88 border-t border-fuchsia-500/25 shrink-0">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-1.5">
            {GUIDE_RAVI_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleSelectOption(opt)}
                className="min-h-[36px] px-3 py-1.5 rounded-xl bg-[#160a2e]/90 hover:bg-[#2b1054] border border-cyan-400/35 hover:border-fuchsia-400/75 text-left text-xs font-medium text-slate-100 transition-all truncate cursor-pointer"
              >
                <span className="text-fuchsia-300 font-mono font-bold mr-1">
                  [선택지 {opt.number}]
                </span>
                <span>{opt.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Message Input Bar (Matches 13943.png visually; free-text input remains strictly disabled for Guide Ravi) */}
      <div className="relative z-10 px-4 sm:px-6 py-3 shrink-0">
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
            onClick={() => setShowOptionsDrawer((prev) => !prev)}
            title="안내 선택지 열기/접기"
            aria-label="안내 선택지 열기/접기"
            className="w-10 h-10 rounded-full bg-[#1d0c3b] hover:bg-[#31135f] border border-fuchsia-400/70 text-white flex items-center justify-center shadow-[0_0_12px_rgba(232,121,249,0.35)] transition-all shrink-0 cursor-pointer"
          >
            <Plus size={19} />
          </button>

          <input
            type="text"
            value=""
            readOnly
            disabled
            placeholder="안내 라비는 위 선택지를 눌러 이용할 수 있습니다..."
            className="flex-1 bg-transparent px-2 text-sm text-slate-400 placeholder:text-slate-400/80 focus:outline-none cursor-not-allowed"
          />

          <button
            type="button"
            disabled
            aria-label="전송 (선택지 전용)"
            className="w-10 h-10 rounded-full bg-gradient-to-tr from-fuchsia-600 to-pink-500 opacity-60 text-white flex items-center justify-center shadow-[0_0_14px_rgba(236,72,153,0.45)] shrink-0 cursor-not-allowed"
          >
            <Send size={17} />
          </button>
        </div>
      </div>

      {/* Future Expansion Hook: Independent Ravi AI Upgrade Modal (Dormant in Patch 3) */}
      <RaviUpgradePromptModal
        isOpen={raviBridge.installed && !raviBridge.connected && showUpgradePrompt}
        onLater={() => setShowUpgradePrompt(false)}
        onUpgrade={() => setShowUpgradePrompt(false)}
      />
    </div>
  );
};
