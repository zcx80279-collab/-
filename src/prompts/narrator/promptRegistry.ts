import commonMd from './common.md?raw';
import dailyMd from './daily.md?raw';
import romanceMd from './romance.md?raw';
import explorationMd from './exploration.md?raw';
import combatMd from './combat.md?raw';
import trpgMd from './trpg.md?raw';
import routingMd from './routing.md?raw';
import makjangMd from './makjang.md?raw';
import { NarratorSceneType } from '../../core/types';

export interface NarratorPromptFileInfo {
  id: string;
  fileName: string;
  sourcePath: string;
  title: string;
  role: string;
  content: string;
}

export const NARRATOR_PROMPT_FILES: NarratorPromptFileInfo[] = [
  {
    id: 'common',
    fileName: 'common.md',
    sourcePath: 'src/prompts/narrator/common.md',
    title: '공통 사회자 프롬프트',
    role: '모든 일반 사회자 유형에 공통 적용되는 장면 연출 원칙 (사용자 행동/대사/감정 임의 결정 금지, 추억의 한조각 보호, 나의 분신 참조 및 미입력 정보 창작 금지, 대사와 묘사 구분 등)',
    content: commonMd,
  },
  {
    id: 'daily',
    fileName: 'daily.md',
    sourcePath: 'src/prompts/narrator/daily.md',
    title: '일상 사회자 프롬프트',
    role: '식사, 산책, 휴식, 평범한 대화 등 일상적인 상호작용에서 캐릭터의 사소한 행동, 표정, 주변 분위기를 간결하고 자연스럽게 묘사',
    content: dailyMd,
  },
  {
    id: 'romance',
    fileName: 'romance.md',
    sourcePath: 'src/prompts/narrator/romance.md',
    title: '로맨스 사회자 프롬프트',
    role: '감정적 교류와 관계 변화 중심 장면에서 시선, 표정, 거리감, 망설임 등을 묘사하되 호감이나 관계 발전을 강제하지 않고 사용자의 선택을 존중',
    content: romanceMd,
  },
  {
    id: 'exploration',
    fileName: 'exploration.md',
    sourcePath: 'src/prompts/narrator/exploration.md',
    title: '탐험 사회자 프롬프트',
    role: '새로운 장소의 탐색과 발견 중심 장면에서 주변 환경, 지형, 소리, 발견 가능한 단서를 제시하며 사용자가 선택하지 않은 이동이나 탐색을 대신 수행하지 않음',
    content: explorationMd,
  },
  {
    id: 'combat',
    fileName: 'combat.md',
    sourcePath: 'src/prompts/narrator/combat.md',
    title: '전투 사회자 프롬프트',
    role: '전투 또는 긴박한 대립 상황에서 공격과 방어, 움직임, 환경 변화를 명확히 묘사하고 사용자의 승리·패배·부상·사망을 임의 확정하지 않으며 다음 행동 결정을 위해 멈춤',
    content: combatMd,
  },
  {
    id: 'trpg',
    fileName: 'trpg.md',
    sourcePath: 'src/prompts/narrator/trpg.md',
    title: 'TRPG 사회자 프롬프트',
    role: '사건 진행, 의뢰, 조사, 선택 등 TRPG 방식 이야기에서 사건·NPC·단서·장애물을 제시하며 정의되지 않은 주사위나 수치 판정을 임의 도입하지 않고 사용자 참여를 유도',
    content: trpgMd,
  },
  {
    id: 'routing',
    fileName: 'routing.md',
    sourcePath: 'src/prompts/narrator/routing.md',
    title: '장면 전환 판단 프롬프트',
    role: '현재 대화의 목적과 맥락을 기준으로 5가지 일반 사회자 유형(일상, 로맨스, 탐험, 전투, TRPG) 중 가장 적절한 유형을 자동 판단하고 불필요한 반복 전환 및 판단 과정 노출을 방지',
    content: routingMd,
  },
  {
    id: 'makjang',
    fileName: 'makjang.md',
    sourcePath: 'src/prompts/narrator/makjang.md',
    title: '막장 사회자 프롬프트',
    role: '채팅방 설정에서 사용자가 직접 막장 모드를 활성화한 경우에만 적용되는 전용 연출 지침 (예상치 못한 사건·오해·비밀·반전을 연출하되 캐릭터·세계관·사용자 선택권을 보호하고 결말을 향해 진행)',
    content: makjangMd,
  },
];

export const NARRATOR_SCENE_LABELS: Record<NarratorSceneType, string> = {
  daily: '일상',
  romance: '로맨스',
  exploration: '탐험',
  combat: '전투',
  trpg: 'TRPG',
  makjang: '막장 모드',
};

export const NARRATOR_PROMPTS_MAP: Record<NarratorSceneType, string> = {
  daily: dailyMd.trim(),
  romance: romanceMd.trim(),
  exploration: explorationMd.trim(),
  combat: combatMd.trim(),
  trpg: trpgMd.trim(),
  makjang: makjangMd.trim(),
};

export const COMMON_NARRATOR_PROMPT = commonMd.trim();
export const ROUTING_NARRATOR_PROMPT = routingMd.trim();
export const MAKJANG_NARRATOR_PROMPT = makjangMd.trim();
