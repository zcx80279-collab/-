import React, { useState, useEffect, useRef } from 'react';
import { storageService } from '../storage/storageService';
import { Message, Character, GUIDE_RAVI_ID, GUIDE_RAVI_ROOM_ID } from '../core/types';
import { DEFAULT_AVATARS } from '../core/defaultAssets';
import { ShieldCheck, HelpCircle, FolderOpen, Lock, CheckCircle2, MessageSquare } from 'lucide-react';

interface GuideRaviChatProps {
  onNavigateTab: (tab: 'chat' | 'community' | 'characters' | 'settings' | 'report') => void;
}

export interface GuideOption {
  id: string;
  number: number;
  title: string;
  answer: string;
}

/**
 * Built-in Guide Ravi Fixed Options (Section 4 of Spec)
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
      '• 저장 항목: 고유 ID, 이름, 프로필 이미지 에셋 ID(avatarAssetId), 기본 프롬프트, 캐릭터 설명, 사용자 지정 설정, 생성/수정 시각, 데이터 구조 버전(schemaVersion: 1).\n' +
      '• 데이터 보호 정책: 캐릭터를 삭제하더라도 해당 캐릭터와 나눈 기존 채팅방, 메시지 기록, 스토리 중요 기억은 자동 삭제되지 않고 안전하게 보존됩니다.\n' +
      '• 캐릭터 설정 JSON 내보내기 및 가져오기(Import/Export) 기능을 통해 데이터를 백업하거나 공유할 수 있습니다.',
  },
  {
    id: 'ravi-opt-3',
    number: 3,
    title: '일상 모드와 스토리 모드',
    answer:
      '각 캐릭터 채팅방 상단에서 [일상 모드]와 [스토리 모드]를 언제든 전환할 수 있습니다.\n\n' +
      '• 일상 모드: 일반적인 일상 대화 공간입니다. 각 메시지의 북마크(보존) 버튼을 눌러 향후 도입될 3일 단위 자동 기록 정리 대상에서 영구 제외할 수 있습니다. (1단계에서는 자동 삭제가 실행되지 않습니다.)\n' +
      '• 스토리 모드: 일상 모드와 분리된 몰입형 대화 공간입니다. 우측(또는 상단 스토리 설정 패널)에서 [세계관], [관계 설명], [시작 상황]과 사용자가 직접 추가·수정·삭제하는 [중요 기억]을 글자 수 제한 없이 관리할 수 있으며, 스토리 기록은 자동 삭제가 영구 금지됩니다.',
  },
  {
    id: 'ravi-opt-4',
    number: 4,
    title: '커뮤니티 이용 방법',
    answer:
      '[커뮤니티]는 실제 사용자 간 게시판이 아니라, 등록된 AI 캐릭터들이 활동하는 가상 SNS 공간입니다.\n\n' +
      '• 1단계에서는 화면 구조 검증을 위한 [예시 데이터]와 사용자가 직접 작성·테스트하는 [사용자 데이터]가 명확한 배지와 필터로 구분됩니다.\n' +
      '• 상단의 [예시 데이터만 일괄 삭제] 버튼을 눌러 예시 게시글을 지우더라도 사용자가 작성한 게시글과 댓글은 전혀 영향을 받지 않습니다.\n' +
      '• 이미지 첨부 시 기본 이미지 라이브러리에서 선택하거나 새 이미지를 등록할 수 있으며, 모든 이미지는 중복 없이 IndexedDB의 "assets" 스토어 ID로만 참조됩니다.',
  },
  {
    id: 'ravi-opt-5',
    number: 5,
    title: 'PNG 파일 위치 및 교체 방법',
    answer:
      '각 채팅방 우측 상단의 [설정 아이콘] → [PNG 꾸미기] 탭에서 채팅방별 배경, 외부 프레임(9-slice), 말풍선 스타일, 컬러 테마를 독립적으로 교체하고 복원할 수 있습니다.\n\n' +
      '• 실제 코드 및 에셋 저장 위치:\n' +
      '  - 기본 내장 에셋 정의: /src/core/defaultAssets.ts\n' +
      '  - 채팅방 설정 및 스킨 관리 모듈: /src/chat/ChatRoomSettingsModal.tsx\n' +
      '  - 런타임 바이너리 저장소: IndexedDB "lovy_lovy_talk_db" 내 "assets" 오브젝트 스토어 (Blob + SHA-256 콘텐츠 해시 중복 방지)\n' +
      '• 투명 배경 PNG, WebP, GIF, SVG 파일을 업로드하면 즉시 "assets" 스토어에 등록되며, 한 채팅방의 배경이나 프레임을 변경해도 다른 채팅방이나 채팅 기록에는 영향을 주지 않습니다.',
  },
  {
    id: 'ravi-opt-6',
    number: 6,
    title: '다른 앱 안내',
    answer:
      '안내 라비는 사전 등록된 고정 안내문만 출력하는 선택지 전용 안내 봇입니다. (AI API 호출 및 자유 대화 생성 금지)\n\n' +
      '• 일반적인 자유 대화나 일상 비서 기능이 필요하신 경우, 별도의 독립 프로젝트인 [AI 비서 라비] 앱을 이용해 주세요.\n' +
      '• 또한 [사이버토끼 OS] 및 [사이버 다이어리] 프로젝트와 러비러비톡은 완전히 분리된 독립 프로젝트로 운영되어 서로의 파일이나 설정에 영향을 주지 않습니다. (외부 앱의 별도 설치 주소는 확정 전이므로 임의 링크를 표시하지 않습니다.)',
  },
];

export const GuideRaviChat: React.FC<GuideRaviChatProps> = ({ onNavigateTab }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [guideChar, setGuideChar] = useState<Character | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string>(DEFAULT_AVATARS.ravi);
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
    <div className="flex flex-col h-full bg-slate-950/75 text-slate-100 overflow-hidden">
      {/* Guide Ravi Header */}
      <div className="px-5 py-3.5 bg-slate-900/90 border-b border-indigo-500/30 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-indigo-950 border border-indigo-400/40 p-0.5 shrink-0 overflow-hidden">
            <img
              src={avatarUrl}
              alt={guideChar?.name || '안내 라비'}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover rounded-[10px]"
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-white truncate">{guideChar?.name || '안내 라비'}</h2>
              <span className="text-xs text-indigo-300 font-medium">
                · 시스템 고정 안내 봇 · 삭제/수정 불가
              </span>
            </div>
            <p className="text-xs text-slate-400 truncate">
              사전 등록된 안내문만 제공하는 선택지형 안내 채널입니다 (AI API 호출 없음)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-300 shrink-0">
          <Lock size={14} className="text-pink-400" />
          <span>자유 입력 비활성화</span>
        </div>
      </div>

      {/* Messages View */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        <div className="p-3.5 rounded-xl bg-indigo-950/50 border border-indigo-500/30 text-xs text-indigo-200 leading-relaxed flex items-start gap-2.5">
          <ShieldCheck size={16} className="text-sky-400 shrink-0 mt-0.5" />
          <div>
            <strong className="font-semibold text-white">안내 라비 운영 규칙:</strong> 안내 라비는 최초 실행 시 자동 등록되며 삭제하거나 고유 설정을 변경할 수 없습니다. 등록되지 않은 답변을 임의 생성하거나 AI API를 호출하지 않습니다.
          </div>
        </div>

        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'} items-start gap-2.5`}>
              {!isUser && (
                <img
                  src={avatarUrl}
                  alt="안내 라비"
                  referrerPolicy="no-referrer"
                  className="w-8 h-8 rounded-lg border border-indigo-400/40 object-cover shrink-0 mt-1"
                />
              )}
              <div
                className={`max-w-[88%] sm:max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${
                  isUser
                    ? 'bg-indigo-600/90 text-white border border-indigo-400/30 rounded-tr-xs'
                    : 'bg-slate-900/95 text-slate-100 border border-indigo-500/30 rounded-tl-xs shadow-lg'
                }`}
              >
                {msg.content}
                <div className="text-[11px] mt-1.5 text-slate-400 text-right tabular-nums">
                  {new Date(msg.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Fixed 6 Choice Buttons Panel (No free-chat input allowed for Guide Ravi) */}
      <div className="p-4 bg-slate-900/95 border-t border-indigo-500/30 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-200">
            <HelpCircle size={15} className="text-pink-400" />
            <span>질문 선택지 (항목을 누르면 고정 안내문이 출력됩니다)</span>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('characters')}
            className="text-xs text-sky-400 hover:text-sky-300 font-medium flex items-center gap-1 transition-colors whitespace-nowrap shrink-0"
          >
            <FolderOpen size={13} />
            <span>캐릭터 관리 · 나의 분신 바로가기</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {GUIDE_RAVI_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => handleSelectOption(opt)}
              className="min-h-[44px] px-3.5 py-2.5 rounded-xl bg-slate-950/90 hover:bg-indigo-950/80 border border-indigo-500/30 hover:border-pink-500/50 text-left text-xs font-medium text-slate-100 transition-colors flex items-center justify-between gap-2 group"
            >
              <span className="truncate">
                <strong className="text-pink-400 font-mono mr-1.5">{opt.number}.</strong>
                {opt.title}
              </span>
              <MessageSquare size={13} className="text-indigo-400 group-hover:text-pink-400 shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
