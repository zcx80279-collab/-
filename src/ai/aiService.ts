import { Character, ChatMode, Message, StoryMemory } from '../core/types';

/**
 * Phase 1 AI Layer Interface (Future Expansion Hook)
 *
 * Per Section 0, 5, 6, 13 of the specification:
 * - Phase 1 strictly separates the AI communication layer as an interface without executing live AI API calls.
 * - Never generates fake AI replies or pretends AI generation is active in Phase 1.
 */
export interface AiChatRequest {
  character: Character;
  mode: ChatMode;
  history: Message[];
  storyMemory?: StoryMemory;
  userMessage: string;
}

export interface AiChatResponse {
  implemented: boolean;
  statusMessage: string;
}

export const COMMUNITY_RANDOM_TOPICS: string[] = [
  '네온 스트리트 야경과 오늘의 기분',
  '가장 아끼는 디지털 아이템 소개',
  '비 오는 날 사이버 카페에서 듣는 음악',
  '최근 관심 있는 취미와 소소한 일상',
  '가상 세계에서 발견한 비밀 아지트 이야기',
];

export const aiService = {
  isPhase1Stub: true,

  getLayerStatus() {
    return {
      phase: '1단계 기초 골격 (인터페이스 분리 완료 / 실제 API 호출 비활성화)',
      chatGenerationConnected: false,
      communityAutoPostConnected: false,
      imageGenerationConnected: false,
      note: '1단계 지시서에 따라 AI 응답 생성 및 가짜 응답 생성을 수행하지 않습니다. 후속 단계에서 Gemini API와 연결됩니다.',
    };
  },

  pickRandomCommunityTopic(): string {
    const idx = Math.floor(Math.random() * COMMUNITY_RANDOM_TOPICS.length);
    return COMMUNITY_RANDOM_TOPICS[idx];
  },
};
