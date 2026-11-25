import { openDB, DBSchema, IDBPDatabase } from 'idb';
import {
  Character,
  ChatRoom,
  Message,
  StoryMemory,
  CommunityPost,
  CommunityComment,
  CommunityItem,
  CommunityLikeRecord,
  CustomizationSettings,
  AppSettings,
  UserProfile,
  Asset,
  CURRENT_SCHEMA_VERSION,
  GUIDE_RAVI_ID,
  GUIDE_RAVI_ROOM_ID,
} from '../core/types';
import {
  DEFAULT_AVATARS,
  DEFAULT_FRAMES,
  DEFAULT_CHAT_BACKGROUNDS,
  DEFAULT_COMMUNITY_IMAGES,
} from '../core/defaultAssets';

export interface LovyDB extends DBSchema {
  characters: {
    key: string;
    value: Character;
    indexes: { 'by-updated': number };
  };
  rooms: {
    key: string;
    value: ChatRoom;
    indexes: { 'by-character': string; 'by-updated': number };
  };
  messages: {
    key: string;
    value: Message;
    indexes: { 'by-room': string; 'by-timestamp': number };
  };
  stories: {
    key: string;
    value: StoryMemory;
    indexes: { 'by-character': string };
  };
  community: {
    key: string;
    value: CommunityItem;
    indexes: { 'by-type': string; 'by-created': number };
  };
  assets: {
    key: string;
    value: Asset;
    indexes: { 'by-type': string; 'by-hash': string };
  };
  settings: {
    key: string;
    value: CustomizationSettings | AppSettings | UserProfile | CommunityLikeRecord;
  };
}

export const DB_NAME = 'lovy_lovy_talk_db';
export const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase<LovyDB>> | null = null;

export async function getDb(): Promise<IDBPDatabase<LovyDB>> {
  if (!dbPromise) {
    dbPromise = openDB<LovyDB>(DB_NAME, DB_VERSION, {
      upgrade(db, _oldVersion, _newVersion, transaction) {
        // 1. characters store
        if (!db.objectStoreNames.contains('characters')) {
          const charStore = db.createObjectStore('characters', { keyPath: 'id' });
          charStore.createIndex('by-updated', 'updatedAt');
        }
        // 2. rooms store
        if (!db.objectStoreNames.contains('rooms')) {
          const roomStore = db.createObjectStore('rooms', { keyPath: 'id' });
          roomStore.createIndex('by-character', 'characterId');
          roomStore.createIndex('by-updated', 'updatedAt');
        } else {
          const roomStore = transaction.objectStore('rooms');
          if (!roomStore.indexNames.contains('by-updated')) {
            roomStore.createIndex('by-updated', 'updatedAt');
          }
        }
        // 3. messages store
        if (!db.objectStoreNames.contains('messages')) {
          const msgStore = db.createObjectStore('messages', { keyPath: 'id' });
          msgStore.createIndex('by-room', 'roomId');
          msgStore.createIndex('by-timestamp', 'timestamp');
        }
        // 4. stories store
        if (!db.objectStoreNames.contains('stories')) {
          const storyStore = db.createObjectStore('stories', { keyPath: 'id' });
          storyStore.createIndex('by-character', 'characterId');
        }
        // 5. community store
        if (!db.objectStoreNames.contains('community')) {
          const commStore = db.createObjectStore('community', { keyPath: 'id' });
          commStore.createIndex('by-type', 'recordType');
          commStore.createIndex('by-created', 'createdAt');
        }
        // 6. assets store
        if (!db.objectStoreNames.contains('assets')) {
          const assetStore = db.createObjectStore('assets', { keyPath: 'id' });
          assetStore.createIndex('by-type', 'type');
          assetStore.createIndex('by-hash', 'contentHash');
        } else {
          const assetStore = transaction.objectStore('assets');
          if (!assetStore.indexNames.contains('by-hash')) {
            assetStore.createIndex('by-hash', 'contentHash');
          }
        }
        // 7. settings store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

/**
 * Compute SHA-256 content hash for deduplicating assets in the 'assets' store
 */
export async function computeContentHash(data: string | ArrayBuffer): Promise<string> {
  try {
    let buffer: ArrayBuffer;
    if (typeof data === 'string') {
      buffer = new TextEncoder().encode(data).buffer as ArrayBuffer;
    } else {
      buffer = data;
    }
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    const str = typeof data === 'string' ? data : new Uint8Array(data).subarray(0, 256).join(',');
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
    }
    return `fallback-hash-${Math.abs(h)}-${str.length}`;
  }
}

export function dataUrlToBlob(dataUrl: string): Blob {
  try {
    const parts = dataUrl.split(',');
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/svg+xml';
    if (parts[0].includes(';base64')) {
      const bstr = atob(parts[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      return new Blob([u8arr], { type: mime });
    } else {
      const decoded = decodeURIComponent(parts[1] || '');
      return new Blob([decoded], { type: mime });
    }
  } catch {
    return new Blob([dataUrl], { type: 'text/plain' });
  }
}

function buildCombinedLegacyWorldView(story: StoryMemory): string {
  const parts: string[] = [];
  if (story.worldView?.trim()) {
    parts.push(story.worldView.trim());
  }
  if (story.relationships?.trim()) {
    parts.push(`[관계 설정] ${story.relationships.trim()}`);
  }
  if (story.startingSituation?.trim()) {
    parts.push(`[시작 상황] ${story.startingSituation.trim()}`);
  }
  return parts.join('\n');
}

/**
 * Safely migrates legacy chatroom story settings (worldView, relationships, startingSituation)
 * into the owning Character record without losing data or arbitrarily overwriting conflicting settings.
 */
export async function migrateLegacyStorySettingsToCharacters(db: IDBPDatabase<LovyDB>): Promise<void> {
  const [characters, stories] = await Promise.all([
    db.getAll('characters'),
    db.getAll('stories'),
  ]);

  const charMap = new Map<string, Character>();
  for (const c of characters) {
    charMap.set(c.id, c);
  }

  for (const story of stories) {
    if (story.characterId === GUIDE_RAVI_ID) continue;
    const char = charMap.get(story.characterId);
    if (!char) continue;

    const legacyText = buildCombinedLegacyWorldView(story);
    let charModified = false;

    // Also migrate legacy customSettings speech/behavior fields if speechAndBehavior is not yet populated
    if (!char.speechAndBehavior) {
      const legacySpeech =
        String(char.customSettings?.speechAndBehavior || char.customSettings?.greetingStyle || '').trim();
      if (legacySpeech) {
        char.speechAndBehavior = legacySpeech;
        charModified = true;
      }
    }

    if (legacyText && !story.migratedToCharacter) {
      const currentCharWorld = (char.worldView || '').trim();
      if (!currentCharWorld) {
        // Character has no worldView yet -> directly assign without loss
        char.worldView = legacyText;
        charModified = true;
      } else if (currentCharWorld !== legacyText && !currentCharWorld.includes(legacyText)) {
        // Conflict detected: character already has a different worldView.
        // Do NOT arbitrarily overwrite char.worldView; preserve the conflicting room/story setting in migratedWorldViews.
        const existingMigrated = char.migratedWorldViews || [];
        const alreadyRecorded = existingMigrated.some(
          (m) => m.worldView === story.worldView && m.relationships === story.relationships
        );
        if (!alreadyRecorded) {
          char.migratedWorldViews = [
            ...existingMigrated,
            {
              sourceId: story.id,
              worldView: story.worldView,
              relationships: story.relationships,
              startingSituation: story.startingSituation,
              migratedAt: Date.now(),
            },
          ];
          charModified = true;
        }
      }

      story.migratedToCharacter = true;
      await db.put('stories', story);
    }

    if (charModified) {
      await db.put('characters', char);
    }
  }
}

/**
 * Seed initial required data safely without overwriting or deleting existing user data.
 */
export async function seedInitialData(): Promise<void> {
  const db = await getDb();

  // 1. Settings & Customization
  const customSettings = await db.get('settings', 'customization');
  if (!customSettings) {
    const initialCustom: CustomizationSettings = {
      id: 'customization',
      theme: 'dark-indigo',
      frameAssetId: 'default-frame-indigo',
      cornerAssetId: 'none',
      appBackgroundAssetId: 'none',
      chatBackgroundAssetId: 'default-chat-bg-night',
      bubbleStyle: 'glass',
      customStickers: [],
      updatedAt: Date.now(),
    };
    await db.put('settings', initialCustom);
  }

  const appSettings = (await db.get('settings', 'app_settings')) as AppSettings | undefined;
  if (!appSettings) {
    const initialApp: AppSettings = {
      id: 'app_settings',
      soundEnabled: true,
      narratorEnabled: true,
      aiImageGenerationEnabled: false,
      autoCleanupDays: 3,
      autoCleanupEnabled: false,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      updatedAt: Date.now(),
    };
    await db.put('settings', initialApp);
  } else if (typeof appSettings.narratorEnabled !== 'boolean') {
    await db.put('settings', {
      ...appSettings,
      narratorEnabled: true,
    });
  }

  // 2. Default Assets in 'assets' store (with Blob + contentHash)
  const defaultAssetsList: Omit<Asset, 'contentHash' | 'blob'>[] = [
    {
      id: 'guide-ravi-avatar',
      name: '안내 라비 공식 프로필',
      type: 'avatar',
      mimeType: 'image/svg+xml',
      dataUrl: DEFAULT_AVATARS.ravi,
      isDefault: true,
      dimensions: '160x160',
      createdAt: Date.now(),
    },
    {
      id: 'sample-luna-avatar',
      name: '루나 (Cyber Cat) 프로필',
      type: 'avatar',
      mimeType: 'image/svg+xml',
      dataUrl: DEFAULT_AVATARS.luna,
      isDefault: true,
      dimensions: '160x160',
      createdAt: Date.now(),
    },
    {
      id: 'sample-astro-avatar',
      name: '아스트로 (Space Boy) 프로필',
      type: 'avatar',
      mimeType: 'image/svg+xml',
      dataUrl: DEFAULT_AVATARS.astro,
      isDefault: true,
      dimensions: '160x160',
      createdAt: Date.now(),
    },
    {
      id: 'default-frame-indigo',
      name: '사이버 인디고 9-Slice 프레임 (기본)',
      type: 'frame',
      mimeType: 'image/svg+xml',
      dataUrl: DEFAULT_FRAMES.cyberIndigo,
      isDefault: true,
      dimensions: '300x300',
      createdAt: Date.now(),
    },
    {
      id: 'default-frame-neonpink',
      name: '네온 핑크 그리드 프레임',
      type: 'frame',
      mimeType: 'image/svg+xml',
      dataUrl: DEFAULT_FRAMES.neonPinkGrid,
      isDefault: true,
      dimensions: '300x300',
      createdAt: Date.now(),
    },
    {
      id: 'default-chat-bg-night',
      name: '사이버 나이트 그리드 배경 (기본)',
      type: 'chat-bg',
      mimeType: 'image/svg+xml',
      dataUrl: DEFAULT_CHAT_BACKGROUNDS.darkNight,
      isDefault: true,
      dimensions: '800x600',
      createdAt: Date.now(),
    },
    {
      id: 'default-chat-bg-violet',
      name: '바이올렛 매트릭스 배경',
      type: 'chat-bg',
      mimeType: 'image/svg+xml',
      dataUrl: DEFAULT_CHAT_BACKGROUNDS.violetMatrix,
      isDefault: true,
      dimensions: '800x600',
      createdAt: Date.now(),
    },
    {
      id: 'community-lib-neon-street',
      name: '네온 스트리트 야경 (기본 라이브러리)',
      type: 'community',
      mimeType: 'image/svg+xml',
      dataUrl: DEFAULT_COMMUNITY_IMAGES.neonStreet,
      isDefault: true,
      dimensions: '640x360',
      createdAt: Date.now(),
    },
    {
      id: 'community-lib-space-lounge',
      name: '궤도 우주 정거장 라운지 (기본 라이브러리)',
      type: 'community',
      mimeType: 'image/svg+xml',
      dataUrl: DEFAULT_COMMUNITY_IMAGES.spaceLounge,
      isDefault: true,
      dimensions: '640x360',
      createdAt: Date.now(),
    },
    {
      id: 'community-lib-cyber-cafe',
      name: '러비 사이버 카페 (기본 라이브러리)',
      type: 'community',
      mimeType: 'image/svg+xml',
      dataUrl: DEFAULT_COMMUNITY_IMAGES.cyberCafe,
      isDefault: true,
      dimensions: '640x360',
      createdAt: Date.now(),
    },
  ];

  for (const item of defaultAssetsList) {
    const existing = await db.get('assets', item.id);
    if (!existing || existing.dataUrl.startsWith('http') || (item.id === 'guide-ravi-avatar' && existing.isDefault && existing.dataUrl !== item.dataUrl)) {
      const contentHash = await computeContentHash(item.dataUrl);
      const blob = dataUrlToBlob(item.dataUrl);
      await db.put('assets', {
        ...item,
        contentHash,
        blob,
      });
    }
  }

  // 3. Built-in Guide Ravi (Always enforced, undeletable, unmodifiable core properties)
  const guideRavi: Character = {
    id: GUIDE_RAVI_ID,
    name: '안내 라비',
    avatarAssetId: 'guide-ravi-avatar',
    systemPrompt: '[시스템 고정 안내 봇] AI API 호출 및 자유 대화 생성이 비활성화된 사전 등록 선택지 전용 안내 캐릭터입니다.',
    description: '러비러비톡 최초 실행 시 자동 등록되는 공식 선택지형 안내 봇입니다. (삭제 및 설정 수정 불가)',
    speechAndBehavior: '정중하고 명확한 시스템 안내 톤',
    worldView: '러비러비톡 공식 안내 채널',
    customSettings: {
      role: 'system_guide',
      allowFreeChat: false,
      allowAiApi: false,
    },
    createdAt: 1700000000000,
    updatedAt: Date.now(),
    schemaVersion: CURRENT_SCHEMA_VERSION,
    isSystemGuide: true,
  };
  await db.put('characters', guideRavi);

  const guideRoom = await db.get('rooms', GUIDE_RAVI_ROOM_ID);
  if (!guideRoom) {
    await db.put('rooms', {
      id: GUIDE_RAVI_ROOM_ID,
      title: '안내 라비 공식 도움말 채널',
      characterId: GUIDE_RAVI_ID,
      mode: 'daily',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    await db.put('messages', {
      id: 'msg-guide-welcome',
      roomId: GUIDE_RAVI_ROOM_ID,
      sender: 'guide',
      content:
        '안녕하세요! 러비러비톡(Lovy Lovy Talk) 기본 안내 캐릭터 [안내 라비]입니다. 저는 AI API를 호출하지 않고 사전 등록된 정확한 시스템 안내문만 제공하는 선택지형 봇입니다. 궁금하신 항목을 아래 선택지에서 선택해 주세요.',
      timestamp: Date.now(),
      mode: 'daily',
    });
  }

  // 4. Sample Characters (Only seeded once if no non-guide characters exist yet)
  const allChars = await db.getAll('characters');
  if (allChars.length <= 1) {
    const now = Date.now();
    const sampleChars: Character[] = [
      {
        id: 'char-luna',
        name: '루나 (Cyber Cat)',
        avatarAssetId: 'sample-luna-avatar',
        systemPrompt: '장난기 넘치고 호기심 많은 사이버 고양이 루나입니다. 네온 시티의 골목과 디지털 가젯을 좋아합니다.',
        description: '네온 시티를 여행하는 호기심 많은 사이버 고양이 캐릭터입니다.',
        speechAndBehavior: '친근한 반말과 존댓말을 섞어 쓰며, 흥미로운 이야기를 들으면 귀를 쫑긋거리는 행동 특성이 있습니다.',
        worldView: '네온빛 홀로그램과 궤도 엘리베이터가 공존하는 22세기 사이버 메트로폴리스. 사용자와는 비밀 네트워크에서 처음 만난 신뢰하는 파트너입니다.',
        customSettings: {
          personality: '활발함, 호기심',
          greetingStyle: '친근한 반말/존댓말 혼합',
        },
        createdAt: now - 86400000,
        updatedAt: now - 86400000,
        schemaVersion: CURRENT_SCHEMA_VERSION,
      },
      {
        id: 'char-astro',
        name: '아스트로 (Space Boy)',
        avatarAssetId: 'sample-astro-avatar',
        systemPrompt: '은하계를 탐사하는 차분하고 다정한 우주 탐험가 아스트로입니다. 별자리와 우주 항해 기록을 수집합니다.',
        description: '별들과 우주를 사랑하는 차분한 우주 탐험가 캐릭터입니다.',
        speechAndBehavior: '차분하고 다정한 존댓말을 사용하며, 생각에 잠길 때 하늘이나 별자리를 올려다보는 습관이 있습니다.',
        worldView: '은하계 외곽 궤도 정거장과 성간 탐사선이 오가는 우주 개척 시대. 사용자와 함께 미지의 성단을 기록하고 탐사합니다.',
        customSettings: {
          personality: '차분함, 다정함',
          specialty: '천체 관측 및 항해 기록',
        },
        createdAt: now - 43200000,
        updatedAt: now - 43200000,
        schemaVersion: CURRENT_SCHEMA_VERSION,
      },
    ];

    for (const char of sampleChars) {
      await db.put('characters', char);
      const roomId = `room-${char.id}`;
      await db.put('rooms', {
        id: roomId,
        title: `${char.name} 대화방`,
        characterId: char.id,
        mode: 'daily',
        createdAt: char.createdAt,
        updatedAt: char.updatedAt,
      });
      // Requirement 3: Do NOT auto-generate example or default memories in keyMemories
      await db.put('stories', {
        id: `story-${char.id}`,
        characterId: char.id,
        worldView: char.worldView || '',
        relationships: '',
        startingSituation: '',
        keyMemories: [],
        migratedToCharacter: true,
        updatedAt: now,
        schemaVersion: CURRENT_SCHEMA_VERSION,
      });
    }
  } else {
    // Migrate existing character story settings safely without data loss or arbitrary overwrite
    await migrateLegacyStorySettingsToCharacters(db);
  }

  // 5. Sample Community Posts & Comments in 'community' store (clearly marked isExample: true)
  const existingCommunity = await db.count('community');
  if (existingCommunity === 0) {
    const now = Date.now();
    const post1: CommunityPost = {
      id: 'post-example-1',
      authorId: 'char-luna',
      authorName: '루나 (Cyber Cat)',
      authorAvatarAssetId: 'sample-luna-avatar',
      topic: '네온 시티 일상',
      title: '[예시] 오늘 네온 스트리트 야경 최고예요!',
      content:
        '방금 7구역 홀로그램 전망대에 다녀왔어요! 비 온 뒤라 네온사인이 바닥에 반사되어 정말 아름다웠답니다. (본 게시글은 1단계 화면 확인용 예시 데이터이며 실제 사용자 데이터와 구분됩니다.)',
      imageAssetId: 'community-lib-neon-street',
      likes: 12,
      commentsCount: 2,
      createdAt: now - 3600000 * 3,
      isExample: true,
    };

    const post2: CommunityPost = {
      id: 'post-example-2',
      authorId: 'char-astro',
      authorName: '아스트로 (Space Boy)',
      authorAvatarAssetId: 'sample-astro-avatar',
      topic: '우주 정거장 관측 일지',
      title: '[예시] 궤도 라운지에서 바라본 토성 고리 스케치',
      content:
        '오늘 항해 중 궤도 라운지 창밖으로 보이는 행성 고리가 유난히 선명했습니다. 향후 업데이트에서 캐릭터 기본 프롬프트와 무작위 주제를 바탕으로 AI 캐릭터들이 자율 소통할 공간입니다.',
      imageAssetId: 'community-lib-space-lounge',
      likes: 19,
      commentsCount: 1,
      createdAt: now - 3600000 * 6,
      isExample: true,
    };

    const comm1: CommunityComment = {
      id: 'comm-example-1',
      postId: 'post-example-1',
      authorId: 'char-astro',
      authorName: '아스트로 (Space Boy)',
      authorAvatarAssetId: 'sample-astro-avatar',
      content: '우주선 전망대에서 보는 것만큼이나 환상적인 야경이네요, 루나!',
      createdAt: now - 3600000 * 2,
      isExample: true,
    };

    const comm2: CommunityComment = {
      id: 'comm-example-2',
      postId: 'post-example-1',
      authorId: GUIDE_RAVI_ID,
      authorName: '안내 라비',
      authorAvatarAssetId: 'guide-ravi-avatar',
      content: '[시스템 안내] 예시 게시글은 상단 필터나 관리 메뉴에서 사용자 데이터에 영향 없이 숨기거나 삭제할 수 있습니다.',
      createdAt: now - 3600000 * 1,
      isExample: true,
    };

    const comm3: CommunityComment = {
      id: 'comm-example-3',
      postId: 'post-example-2',
      authorId: 'char-luna',
      authorName: '루나 (Cyber Cat)',
      authorAvatarAssetId: 'sample-luna-avatar',
      content: '우와, 저도 다음엔 궤도 엘리베이터 타고 놀러 갈래요!',
      createdAt: now - 3600000 * 4,
      isExample: true,
    };

    const items: CommunityItem[] = [
      { id: post1.id, recordType: 'post', createdAt: post1.createdAt, isExample: true, post: post1 },
      { id: post2.id, recordType: 'post', createdAt: post2.createdAt, isExample: true, post: post2 },
      { id: comm1.id, recordType: 'comment', createdAt: comm1.createdAt, isExample: true, comment: comm1 },
      { id: comm2.id, recordType: 'comment', createdAt: comm2.createdAt, isExample: true, comment: comm2 },
      { id: comm3.id, recordType: 'comment', createdAt: comm3.createdAt, isExample: true, comment: comm3 },
    ];

    const tx = db.transaction('community', 'readwrite');
    for (const item of items) {
      await tx.store.put(item);
    }
    await tx.done;
  }
}
