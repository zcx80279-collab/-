import {
  Character,
  ChatMode,
  Message,
  MessageSegment,
  NarratorSceneType,
  RoomCharacterPromptOverride,
  StoryMemory,
  UserProfile,
} from '../core/types';

export interface AiChatRequest {
  character: Character;
  roomPromptOverride?: RoomCharacterPromptOverride | null;
  userProfile?: UserProfile | null;
  mode: ChatMode;
  history: Message[];
  storyMemory?: StoryMemory | null;
  makjangMode?: boolean;
  currentSceneType?: NarratorSceneType;
  userMessage: string;
}

export interface AiChatResponse {
  narratorEnabled: boolean;
  makjangMode: boolean;
  sceneType: NarratorSceneType;
  segments: MessageSegment[];
}

export const COMMUNITY_RANDOM_TOPICS: string[] = [
  '네온 스트리트 야경과 오늘의 기분',
  '가장 아끼는 디지털 아이템 소개',
  '비 오는 날 사이버 카페에서 듣는 음악',
  '최근 관심 있는 취미와 소소한 일상',
  '가상 세계에서 발견한 비밀 아지트 이야기',
];

export const aiService = {
  isPhase1Stub: false,

  getLayerStatus() {
    return {
      phase: '2차 추가 개선 패치: 자동 사회자 · 채팅방별 설정 · 막장 모드 단일 API 연동 완료',
      chatGenerationConnected: true,
      communityAutoPostConnected: false,
      imageGenerationConnected: false,
      note: '일반 사회자 자동 판단 또는 채팅방별 막장 모드 연출, 장면 묘사 및 캐릭터 대사를 단일 API 호출로 처리하며, 채팅방별 프롬프트 수정값은 원본과 중복 전송하지 않고 빈 추억의 한조각·프로필 이미지는 API 요청에서 제외합니다.',
    };
  },

  pickRandomCommunityTopic(): string {
    const idx = Math.floor(Math.random() * COMMUNITY_RANDOM_TOPICS.length);
    return COMMUNITY_RANDOM_TOPICS[idx];
  },

  /**
   * Executes a single API call to generate scene routing / Makjang narration
   * and character dialogue response.
   *
   * Token & Privacy Optimizations:
   * - Never sends profile avatar image data to the API.
   * - Omits empty optional "나의 분신" user profile fields.
   * - Completely omits `keyMemories` ("추억의 한조각") from payload if empty.
   * - Resolves room prompt overrides once so original and override prompts are never duplicated.
   * - Local `makjangMode` flag ensures Makjang prompt is sent ONLY when enabled for this room.
   */
  async generateChatResponse(req: AiChatRequest): Promise<AiChatResponse> {
    const {
      character,
      roomPromptOverride,
      userProfile,
      mode,
      history,
      storyMemory,
      makjangMode = false,
      currentSceneType = 'daily',
      userMessage,
    } = req;

    const characterPayload: Record<string, string> = {
      name: character.name,
    };
    if (character.description?.trim()) {
      characterPayload.description = character.description.trim();
    }

    // Resolve character info & personality: room override takes precedence without duplicating original
    const overrideInfo = roomPromptOverride?.characterInfoAndPersonality?.trim();
    if (overrideInfo) {
      characterPayload.systemPrompt = overrideInfo;
    } else {
      if (character.systemPrompt?.trim()) {
        characterPayload.systemPrompt = character.systemPrompt.trim();
      }
      const personality = String(character.customSettings?.personality || '').trim();
      if (personality) {
        characterPayload.personality = personality;
      }
    }

    // Resolve speech & behavior: room override takes precedence without duplicating original
    const overrideSpeech = roomPromptOverride?.speechAndBehavior?.trim();
    const resolvedSpeech =
      overrideSpeech ||
      (
        character.speechAndBehavior ||
        String(character.customSettings?.speechAndBehavior || character.customSettings?.greetingStyle || '')
      ).trim();
    if (resolvedSpeech) {
      characterPayload.speechAndBehavior = resolvedSpeech;
    }

    // Resolve worldview: room override takes precedence without duplicating original
    const overrideWorldView = roomPromptOverride?.worldView?.trim();
    const resolvedWorldView =
      overrideWorldView || (character.worldView || storyMemory?.worldView || '').trim();
    if (resolvedWorldView) {
      characterPayload.worldView = resolvedWorldView;
    }

    // Build userProfile ("나의 분신") payload without avatarAssetId/image data and without empty optional fields
    let userProfilePayload:
      | {
          name: string;
          appearance?: string;
          personality?: string;
          bio?: string;
          additionalInfo?: string;
        }
      | undefined;
    if (userProfile && userProfile.name?.trim()) {
      userProfilePayload = {
        name: userProfile.name.trim(),
      };
      if (userProfile.appearance?.trim()) {
        userProfilePayload.appearance = userProfile.appearance.trim();
      }
      if (userProfile.personality?.trim()) {
        userProfilePayload.personality = userProfile.personality.trim();
      }
      if (userProfile.bio?.trim()) {
        userProfilePayload.bio = userProfile.bio.trim();
      }
      if (userProfile.additionalInfo?.trim()) {
        userProfilePayload.additionalInfo = userProfile.additionalInfo.trim();
      }
    }

    // Only include keyMemories ("추억의 한조각") if non-empty
    const nonEmptyMemories = (storyMemory?.keyMemories || [])
      .map((m) => m.trim())
      .filter(Boolean);

    const requestPayload: Record<string, unknown> = {
      character: characterPayload,
      makjangMode: Boolean(makjangMode),
      currentSceneType,
      mode,
      history: history.slice(-10).map((m) => ({
        sender: m.sender,
        content: m.content,
        segments: m.segments,
      })),
      userMessage: userMessage.trim(),
    };

    if (userProfilePayload) {
      requestPayload.userProfile = userProfilePayload;
    }
    if (nonEmptyMemories.length > 0) {
      requestPayload.keyMemories = nonEmptyMemories;
    }

    const response = await fetch('/api/chat/respond', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestPayload),
    });

    let data: Partial<AiChatResponse> & { error?: string } = {};
    try {
      data = await response.json();
    } catch {
      if (!response.ok) {
        throw new Error(`서버 응답 오류가 발생했습니다 (HTTP ${response.status}).`);
      }
      throw new Error('서버 응답 데이터를 해석할 수 없습니다.');
    }

    if (!response.ok) {
      throw new Error(data.error || `AI 응답 생성 요청에 실패했습니다 (HTTP ${response.status}).`);
    }

    return data as AiChatResponse;
  },
};
