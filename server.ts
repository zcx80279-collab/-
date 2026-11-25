import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type NormalNarratorSceneType = 'daily' | 'romance' | 'exploration' | 'combat' | 'trpg';
type NarratorSceneType = NormalNarratorSceneType | 'makjang';

interface PromptFilesCache {
  common: string;
  routing: string;
  makjang: string;
  scenes: Record<NormalNarratorSceneType, string>;
}

const NARRATOR_FILES = [
  'common.md',
  'routing.md',
  'makjang.md',
  'daily.md',
  'romance.md',
  'exploration.md',
  'combat.md',
  'trpg.md',
] as const;

let cachedPrompts: PromptFilesCache | null = null;
let cachedPromptsMtimeMax = 0;

/**
 * Loads the narrator prompt markdown files from src/prompts/narrator/*.md
 * Uses an in-memory cache with fast mtime validation so dev edits reflect immediately
 * without reading 8 files from disk on every request when unchanged.
 */
function loadNarratorPrompts(): PromptFilesCache {
  const baseDir = path.resolve(__dirname, 'src/prompts/narrator');
  let latestMtime = 0;
  for (const fileName of NARRATOR_FILES) {
    try {
      const stat = fs.statSync(path.join(baseDir, fileName));
      if (stat.mtimeMs > latestMtime) {
        latestMtime = stat.mtimeMs;
      }
    } catch {
      // Fallback to reload if stat fails
      latestMtime = Date.now();
    }
  }

  if (cachedPrompts && latestMtime <= cachedPromptsMtimeMax) {
    return cachedPrompts;
  }

  const readMd = (fileName: string) =>
    fs.readFileSync(path.join(baseDir, fileName), 'utf-8').trim();

  cachedPrompts = {
    common: readMd('common.md'),
    routing: readMd('routing.md'),
    makjang: readMd('makjang.md'),
    scenes: {
      daily: readMd('daily.md'),
      romance: readMd('romance.md'),
      exploration: readMd('exploration.md'),
      combat: readMd('combat.md'),
      trpg: readMd('trpg.md'),
    },
  };
  cachedPromptsMtimeMax = latestMtime;
  return cachedPrompts;
}

const SCENE_PATTERNS: Record<NormalNarratorSceneType, RegExp[]> = {
  combat: [
    /공격|방어|회피|전투|싸움|검을|총을|마법을|스킬|적의|적을|대립|기습|무기|타격|반격|결투|위협|돌진/gi,
  ],
  exploration: [
    /탐색|탐험|발견|단서|살펴본|조사해|주변을|장소|지형|이동해|문을 열|통로|유적|숲속|동굴|건물 안|흔적/gi,
  ],
  trpg: [
    /의뢰|사건|퀘스트|임무|수사|추리|선택지|길드|NPC|단서를 종합|작전|함정|퍼즐|협상|잠입/gi,
  ],
  romance: [
    /설레|심장|고백|손을 잡|안아|포옹|입맞춤|키스|얼굴이 붉|부끄러|사랑|호감|다정하게 바라|가까워|연인|데이트/gi,
  ],
  daily: [
    /식사|산책|휴식|커피|차 한잔|안녕|오늘|일상|먹는|마시는|웃으며|이야기|수다|집에서|카페|평소/gi,
  ],
};

/**
 * Context-aware scene analyzer that selects the active and (only when shifting) candidate scene type
 * so we never have to transmit all 5 full narrator prompts on every API request.
 */
function selectRelevantSceneTypes(
  userMessage: string,
  recentHistoryText: string,
  currentScene: NormalNarratorSceneType = 'daily',
  chatMode: 'daily' | 'story' = 'daily'
): NormalNarratorSceneType[] {
  const combinedContext = `${recentHistoryText}\n${userMessage}`.toLowerCase();
  const latestText = userMessage.toLowerCase();

  const scoreScene = (text: string, weight: number, scores: Record<NormalNarratorSceneType, number>) => {
    (Object.keys(SCENE_PATTERNS) as NormalNarratorSceneType[]).forEach((scene) => {
      for (const regex of SCENE_PATTERNS[scene]) {
        const matches = text.match(regex);
        if (matches && matches.length > 0) {
          scores[scene] += matches.length * weight;
        }
      }
    });
  };

  const scores: Record<NormalNarratorSceneType, number> = {
    daily: chatMode === 'daily' ? 1.5 : 0.5,
    romance: 0,
    exploration: 0,
    combat: 0,
    trpg: chatMode === 'story' ? 1.0 : 0,
  };

  // Stickiness bonus for current scene to avoid unnecessary flip-flopping on a single word
  scores[currentScene] += 2.0;

  scoreScene(combinedContext, 1.0, scores);
  scoreScene(latestText, 2.2, scores);

  const sorted = (Object.keys(scores) as NormalNarratorSceneType[]).sort(
    (a, b) => scores[b] - scores[a]
  );

  const topScene = sorted[0];
  const secondScene = sorted[1];

  // Return only the primary scene prompt, or at most primary + current/candidate when a transition is occurring
  const selected = new Set<NormalNarratorSceneType>([topScene]);
  if (currentScene !== topScene) {
    selected.add(currentScene);
  } else if (scores[secondScene] >= scores[topScene] - 1.2 && scores[secondScene] > 2.0) {
    selected.add(secondScene);
  }

  return Array.from(selected);
}

interface ChatRespondRequestBody {
  character: {
    name: string;
    description?: string;
    systemPrompt?: string;
    personality?: string;
    speechAndBehavior?: string;
    worldView?: string;
  };
  userProfile?: {
    name: string;
    appearance?: string;
    personality?: string;
    bio?: string;
    additionalInfo?: string;
  };
  keyMemories?: string[];
  makjangMode?: boolean;
  currentSceneType?: NarratorSceneType;
  mode: 'daily' | 'story';
  history: Array<{
    sender: 'user' | 'character' | 'narrator' | 'guide';
    content: string;
    segments?: Array<{ type: 'narrator' | 'dialogue'; text: string }>;
  }>;
  userMessage: string;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '2mb' }));

  app.post('/api/chat/respond', async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        res.status(500).json({
          error: '서버 환경변수(GEMINI_API_KEY)가 설정되어 있지 않습니다.',
        });
        return;
      }

      const body = req.body as ChatRespondRequestBody;
      if (!body || !body.character || !body.userMessage?.trim()) {
        res.status(400).json({ error: '필수 요청 항목(캐릭터 정보 및 메시지)이 누락되었습니다.' });
        return;
      }

      const {
        character,
        userProfile,
        keyMemories,
        makjangMode = false,
        currentSceneType = 'daily',
        mode = 'daily',
        history = [],
        userMessage,
      } = body;

      const isMakjang = Boolean(makjangMode);
      const validNormalScenes: NormalNarratorSceneType[] = [
        'daily',
        'romance',
        'exploration',
        'combat',
        'trpg',
      ];
      const normalizedNormalScene: NormalNarratorSceneType = validNormalScenes.includes(
        currentSceneType as NormalNarratorSceneType
      )
        ? (currentSceneType as NormalNarratorSceneType)
        : 'daily';

      // Build concise system instruction once without duplicating character or user profile
      const sysParts: string[] = [];

      // 1. Character Configuration (attributed to character)
      const charLines: string[] = [`[캐릭터 설정]`, `- 이름: ${character.name}`];
      if (character.description?.trim()) {
        charLines.push(`- 캐릭터 정보 및 소개: ${character.description.trim()}`);
      }
      if (character.personality?.trim()) {
        charLines.push(`- 성격: ${character.personality.trim()}`);
      }
      if (character.systemPrompt?.trim()) {
        charLines.push(`- 상세 설정: ${character.systemPrompt.trim()}`);
      }
      if (character.speechAndBehavior?.trim()) {
        charLines.push(`- 말투 및 행동 특성: ${character.speechAndBehavior.trim()}`);
      }
      if (character.worldView?.trim()) {
        charLines.push(`- 세계관 설정: ${character.worldView.trim()}`);
      }
      sysParts.push(charLines.join('\n'));

      // 2. User Profile ("나의 분신" - only non-empty fields, no profile image sent, forbid inventing omitted traits)
      if (userProfile && userProfile.name?.trim()) {
        const userLines: string[] = [
          `[대화 상대(나의 분신) 프로필]`,
          `- 이름/닉네임: ${userProfile.name.trim()}`,
        ];
        if (userProfile.appearance?.trim()) {
          userLines.push(`- 외모: ${userProfile.appearance.trim()}`);
        }
        if (userProfile.personality?.trim()) {
          userLines.push(`- 성격: ${userProfile.personality.trim()}`);
        }
        if (userProfile.bio?.trim()) {
          userLines.push(`- 자기소개 및 추가 설정: ${userProfile.bio.trim()}`);
        }
        if (userProfile.additionalInfo?.trim()) {
          userLines.push(`- 추가 정보: ${userProfile.additionalInfo.trim()}`);
        }
        userLines.push(
          `※ 주의: 나의 분신 프로필에 입력되지 않은 이름, 성격, 외모, 과거, 배경 등을 AI가 임의로 확정하거나 만들어내지 마세요.`
        );
        sysParts.push(userLines.join('\n'));
      } else {
        sysParts.push(
          `[대화 상대(사용자) 안내]\n※ 주의: 사용자의 이름, 성격, 외모, 과거 등을 임의로 확정하거나 만들어내지 마세요.`
        );
      }

      // 3. 추억의 한조각 (Key Memories) - strictly omitted if empty!
      const validMemories = Array.isArray(keyMemories)
        ? keyMemories.map((m) => m.trim()).filter(Boolean)
        : [];
      if (validMemories.length > 0) {
        sysParts.push(
          `[추억의 한조각 (사용자 기록 기억)]\n` +
            validMemories.map((m) => `- ${m}`).join('\n') +
            `\n※ 위 기억은 사용자가 직접 기록한 추억의 한조각입니다. 자연스럽게 참조하되 임의로 변경하거나 왜곡하지 마세요.`
        );
      }

      // 4. Narrator Prompts (General narrator is always active; Makjang prompt is ONLY included when makjangMode === true)
      const recentHistorySlice = history.slice(-8);
      const recentHistoryText = recentHistorySlice.map((h) => h.content).join('\n');
      const prompts = loadNarratorPrompts();

      if (isMakjang) {
        // Makjang Mode: inject makjang.md directly without duplicating common.md or normal routing/scenes
        sysParts.push(
          `[막장 사회자 지침]\n${prompts.makjang}\n\n` +
            `[응답 출력 형식 지침]\n` +
            `- 한 번의 응답에서 sceneType을 "makjang"으로 설정하고, segments 배열에 사회자 묘사(type: "narrator")와 캐릭터(${character.name}) 대사(type: "dialogue")를 자연스러운 순서로 교차 구성하세요.\n` +
            `- dialogue 세그먼트의 text에는 캐릭터 이름 접두어(예: "${character.name}:")를 붙이지 말고 순수 대사만 작성하세요.\n` +
            `- narrator 세그먼트의 text에는 "사회자 묘사:" 같은 접두어나 내부 판단 과정을 출력하지 말고 순수 장면/사건 묘사만 작성하세요.`
        );
      } else {
        // Normal Mode: never include makjang.md; automatically judge & apply relevant normal scene(s)
        const candidateScenes = selectRelevantSceneTypes(
          userMessage,
          recentHistoryText,
          normalizedNormalScene,
          mode
        );

        const activeSceneInstructions = candidateScenes
          .map((sceneKey) => `[${sceneKey.toUpperCase()} 사회자 지침]\n${prompts.scenes[sceneKey]}`)
          .join('\n\n');

        sysParts.push(
          `[사회자 공통 원칙]\n${prompts.common}\n\n` +
            `[장면 전환 판단 기준]\n${prompts.routing}\n` +
            `- 이전 장면 유형: ${normalizedNormalScene}\n\n` +
            `${activeSceneInstructions}\n\n` +
            `[응답 출력 형식 지침]\n` +
            `- 한 번의 응답에서 현재 맥락에 맞는 sceneType("daily" | "romance" | "exploration" | "combat" | "trpg")을 판단하고, segments 배열에 사회자 묘사(type: "narrator")와 캐릭터(${character.name}) 대사(type: "dialogue")를 자연스러운 순서로 교차 구성하세요.\n` +
            `- 일반 모드에서는 막장 모드로 자동 전환하지 마세요.\n` +
            `- dialogue 세그먼트의 text에는 캐릭터 이름 접두어(예: "${character.name}:")를 붙이지 말고 순수 대사만 작성하세요.\n` +
            `- narrator 세그먼트의 text에는 "사회자 묘사:" 같은 접두어나 내부 판단 과정을 출력하지 말고 순수 장면/행동 묘사만 간결하게 작성하세요.`
        );
      }

      // 5. Build conversation contents
      const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];
      for (const msg of recentHistorySlice) {
        if (msg.sender === 'guide') continue;
        const role = msg.sender === 'user' ? 'user' : 'model';
        let text = msg.content;
        if (msg.segments && msg.segments.length > 0) {
          text = msg.segments
            .map((s) => (s.type === 'narrator' ? `(장면 묘사) ${s.text}` : `${character.name}: ${s.text}`))
            .join('\n');
        }
        if (!text?.trim()) continue;

        const prev = contents[contents.length - 1];
        if (prev && prev.role === role) {
          prev.parts[0].text += `\n${text}`;
        } else {
          contents.push({ role, parts: [{ text }] });
        }
      }

      const lastTurn = contents[contents.length - 1];
      if (lastTurn && lastTurn.role === 'user') {
        lastTurn.parts[0].text += `\n${userMessage.trim()}`;
      } else {
        contents.push({ role: 'user', parts: [{ text: userMessage.trim() }] });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents,
        config: {
          systemInstruction: sysParts.join('\n\n'),
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              sceneType: {
                type: Type.STRING,
                description: isMakjang
                  ? 'Always "makjang" when Makjang mode is active'
                  : 'Current narrator scene type: daily, romance, exploration, combat, or trpg',
              },
              segments: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    type: {
                      type: Type.STRING,
                      description: 'Either "narrator" for scene/action description or "dialogue" for character speech',
                    },
                    text: {
                      type: Type.STRING,
                      description: 'The content of the narrator description or character dialogue',
                    },
                  },
                  required: ['type', 'text'],
                },
              },
            },
            required: ['sceneType', 'segments'],
          },
        },
      });

      const rawJson = (response.text ?? '{}')
        .trim()
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
      let parsed: {
        sceneType?: string;
        segments?: Array<{ type: string; text: string }>;
      } = {};
      try {
        parsed = JSON.parse(rawJson);
      } catch {
        parsed = {
          sceneType: isMakjang ? 'makjang' : normalizedNormalScene,
          segments: [{ type: 'dialogue', text: rawJson }],
        };
      }

      const resolvedScene: NarratorSceneType = isMakjang
        ? 'makjang'
        : validNormalScenes.includes(parsed.sceneType as NormalNarratorSceneType)
        ? (parsed.sceneType as NormalNarratorSceneType)
        : normalizedNormalScene;

      const rawSegments = Array.isArray(parsed.segments) ? parsed.segments : [];
      const cleanSegments = rawSegments
        .map((seg) => ({
          type: (seg?.type === 'narrator' ? 'narrator' : 'dialogue') as 'narrator' | 'dialogue',
          text: String(seg?.text ?? '')
            .replace(/^(사회자\s*묘사\s*:|사회자\s*:|막장\s*사회자\s*:)/i, '')
            .trim(),
        }))
        .filter((seg) => seg.text.length > 0);

      if (cleanSegments.length === 0) {
        cleanSegments.push({
          type: 'dialogue',
          text: '...',
        });
      }

      res.json({
        narratorEnabled: true,
        makjangMode: isMakjang,
        sceneType: resolvedScene,
        segments: cleanSegments,
      });
    } catch (error) {
      console.error('Gemini API Error:', error);
      const message = error instanceof Error ? error.message : 'AI 응답 생성 중 오류가 발생했습니다.';
      res.status(500).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Lovy Lovy Talk server running on http://localhost:${PORT}`);
  });
}

startServer();
