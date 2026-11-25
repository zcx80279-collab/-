import { getDb, computeContentHash } from './db';
import {
  Asset,
  Character,
  ChatRoom,
  Message,
  StoryMemory,
  CommunityPost,
  CommunityComment,
  CommunityItem,
  CustomizationSettings,
  AppSettings,
  UserProfile,
  NarratorSceneType,
  RoomCustomizationOverride,
  RoomCharacterPromptOverride,
  GUIDE_RAVI_ID,
  CURRENT_SCHEMA_VERSION,
} from '../core/types';
import { DEFAULT_AVATARS } from '../core/defaultAssets';

export interface AssetReferenceReport {
  isReferenced: boolean;
  referencedBy: string[];
}

export interface BackupServiceInterface {
  exportFullDatabaseJson(): Promise<string>;
  getCloudBackupStatus(): { implemented: boolean; provider: string; note: string };
}

/**
 * Storage Service - Abstracts IndexedDB operations, content-hash deduplication,
 * reference integrity verification, user profile persistence, and backup expansion hooks.
 */
export const storageService = {
  // --- ASSETS ---
  async getAllAssets(): Promise<Asset[]> {
    const db = await getDb();
    return db.getAll('assets');
  },

  async getAssetById(id: string): Promise<Asset | undefined> {
    if (!id || id === 'none') return undefined;
    const db = await getDb();
    return db.get('assets', id);
  },

  async resolveAssetUrl(assetId?: string, fallbackType: 'avatar' | 'none' = 'avatar'): Promise<string> {
    if (!assetId || assetId === 'none') {
      return fallbackType === 'avatar' ? DEFAULT_AVATARS.ravi : '';
    }
    const asset = await this.getAssetById(assetId);
    if (!asset) {
      return fallbackType === 'avatar' ? DEFAULT_AVATARS.ravi : '';
    }
    return asset.dataUrl;
  },

  async registerAssetFromFile(
    file: File,
    type: Asset['type'],
    customName?: string
  ): Promise<{ asset: Asset; deduplicated: boolean }> {
    const db = await getDb();
    const arrayBuffer = await file.arrayBuffer();
    const contentHash = await computeContentHash(arrayBuffer);

    const existingByHash = await db.getAllFromIndex('assets', 'by-hash', contentHash);
    const matchingAsset = existingByHash.find((a) => a.type === type);
    if (matchingAsset) {
      return { asset: matchingAsset, deduplicated: true };
    }

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('이미지 파일을 읽는 중 오류가 발생했습니다.'));
      reader.readAsDataURL(file);
    });

    const blob = new Blob([arrayBuffer], { type: file.type || 'image/png' });
    const newAsset: Asset = {
      id: `asset-${type}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: customName || file.name,
      type,
      mimeType: file.type || 'image/png',
      blob,
      dataUrl,
      contentHash,
      isDefault: false,
      createdAt: Date.now(),
    };

    await db.put('assets', newAsset);
    return { asset: newAsset, deduplicated: false };
  },

  async registerAssetFromDataUrl(
    dataUrl: string,
    type: Asset['type'],
    customName: string,
    dimensions?: string
  ): Promise<{ asset: Asset; deduplicated: boolean }> {
    const db = await getDb();
    const contentHash = await computeContentHash(dataUrl);
    const existingByHash = await db.getAllFromIndex('assets', 'by-hash', contentHash);
    const matchingAsset = existingByHash.find((a) => a.type === type);
    if (matchingAsset) {
      return { asset: matchingAsset, deduplicated: true };
    }

    const mimeMatch = dataUrl.match(/^data:(.*?);/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
    const newAsset: Asset = {
      id: `asset-${type}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: customName,
      type,
      mimeType,
      dataUrl,
      contentHash,
      isDefault: false,
      dimensions,
      createdAt: Date.now(),
    };

    await db.put('assets', newAsset);
    return { asset: newAsset, deduplicated: false };
  },

  async checkAssetReferences(assetId: string): Promise<AssetReferenceReport> {
    const db = await getDb();
    const referencedBy: string[] = [];

    const characters = await db.getAll('characters');
    for (const c of characters) {
      if (c.avatarAssetId === assetId) {
        referencedBy.push(`캐릭터 프로필: ${c.name}`);
      }
    }

    const userProf = (await db.get('settings', 'user_profile')) as UserProfile | undefined;
    if (userProf && userProf.avatarAssetId === assetId) {
      referencedBy.push(`나의 분신 프로필: ${userProf.name}`);
    }

    const communityItems = await db.getAll('community');
    for (const item of communityItems) {
      if (item.recordType === 'post' && item.post?.imageAssetId === assetId) {
        referencedBy.push(`커뮤니티 게시글: ${item.post.title}`);
      }
    }

    const custom = (await db.get('settings', 'customization')) as CustomizationSettings | undefined;
    if (custom) {
      if (custom.frameAssetId === assetId) referencedBy.push('공용 기본 외부 프레임 스킨');
      if (custom.chatBackgroundAssetId === assetId) referencedBy.push('공용 기본 채팅방 배경 스킨');
      if (custom.cornerAssetId === assetId) referencedBy.push('공용 기본 모서리 장식 스킨');
      if (custom.appBackgroundAssetId === assetId) referencedBy.push('공용 기본 앱 전체 배경');
      if (custom.customStickers?.includes(assetId)) referencedBy.push('등록된 커스텀 스티커 목록');
      if (custom.fullSkin?.sourceAssetId === assetId) referencedBy.push('공용 전체 스킨 원본 PNG');
      if (custom.fullSkin?.outerFrameAssetId === assetId) referencedBy.push('공용 외곽 프레임 PNG');
      if (custom.fullSkin?.friendListAssetId === assetId) referencedBy.push('공용 왼쪽 친구 목록 PNG');
      if (custom.fullSkin?.chatBgAssetId === assetId) referencedBy.push('공용 오른쪽 채팅 배경 PNG');
      if (custom.fullSkin?.inputBarAssetId === assetId) referencedBy.push('공용 하단 입력창 PNG');
      if (custom.bubbles?.opponentBubbleAssetId === assetId) referencedBy.push('공용 상대방 말풍선 PNG');
      if (custom.bubbles?.userBubbleAssetId === assetId) referencedBy.push('공용 사용자 말풍선 PNG');
    }

    const rooms = await db.getAll('rooms');
    for (const room of rooms) {
      const rc = room.customization;
      if (!rc) continue;
      const roomLabel = room.title || room.id;
      if (rc.frameAssetId === assetId) referencedBy.push(`채팅방(${roomLabel}) 프레임`);
      if (rc.chatBackgroundAssetId === assetId) referencedBy.push(`채팅방(${roomLabel}) 배경`);
      if (rc.cornerAssetId === assetId) referencedBy.push(`채팅방(${roomLabel}) 모서리 장식`);
      if (rc.appBackgroundAssetId === assetId) referencedBy.push(`채팅방(${roomLabel}) 전체 배경`);
      if (rc.fullSkin?.sourceAssetId === assetId) referencedBy.push(`채팅방(${roomLabel}) 전체 스킨 PNG`);
      if (rc.fullSkin?.outerFrameAssetId === assetId) referencedBy.push(`채팅방(${roomLabel}) 외곽 프레임 PNG`);
      if (rc.fullSkin?.friendListAssetId === assetId) referencedBy.push(`채팅방(${roomLabel}) 친구 목록 PNG`);
      if (rc.fullSkin?.chatBgAssetId === assetId) referencedBy.push(`채팅방(${roomLabel}) 채팅 배경 PNG`);
      if (rc.fullSkin?.inputBarAssetId === assetId) referencedBy.push(`채팅방(${roomLabel}) 입력창 PNG`);
      if (rc.bubbles?.opponentBubbleAssetId === assetId) referencedBy.push(`채팅방(${roomLabel}) 상대방 말풍선 PNG`);
      if (rc.bubbles?.userBubbleAssetId === assetId) referencedBy.push(`채팅방(${roomLabel}) 사용자 말풍선 PNG`);
    }

    return {
      isReferenced: referencedBy.length > 0,
      referencedBy,
    };
  },

  async deleteAssetSafely(assetId: string, forceIfReferenced = false): Promise<{ deleted: boolean; reason?: string }> {
    const db = await getDb();
    const asset = await db.get('assets', assetId);
    if (!asset) return { deleted: false, reason: '존재하지 않는 에셋입니다.' };
    if (asset.isDefault) {
      return { deleted: false, reason: '시스템 기본 내장 에셋은 삭제할 수 없습니다.' };
    }

    const refReport = await this.checkAssetReferences(assetId);
    if (refReport.isReferenced && !forceIfReferenced) {
      return {
        deleted: false,
        reason: `다른 데이터에서 참조 중인 에셋입니다: ${refReport.referencedBy.join(', ')}`,
      };
    }

    await db.delete('assets', assetId);
    return { deleted: true };
  },

  // --- USER PROFILE (Separate from Character Info) ---
  async getUserProfile(): Promise<UserProfile | null> {
    const db = await getDb();
    const profile = (await db.get('settings', 'user_profile')) as UserProfile | undefined;
    if (profile && profile.name && profile.name.trim()) {
      return profile;
    }
    return null;
  },

  async saveUserProfile(input: {
    name: string;
    avatarAssetId?: string;
    appearance?: string;
    personality?: string;
    bio?: string;
    additionalInfo?: string;
  }): Promise<UserProfile> {
    const trimmedName = input.name.trim();
    if (!trimmedName) {
      throw new Error('이름 또는 닉네임은 필수 입력 항목입니다.');
    }
    const db = await getDb();
    const existing = (await db.get('settings', 'user_profile')) as UserProfile | undefined;
    const now = Date.now();
    const profile: UserProfile = {
      id: 'user_profile',
      name: trimmedName,
      avatarAssetId: input.avatarAssetId && input.avatarAssetId !== 'none' ? input.avatarAssetId : undefined,
      appearance: (input.appearance ?? '').trim(),
      personality: (input.personality ?? '').trim(),
      bio: (input.bio ?? '').trim(),
      additionalInfo: (input.additionalInfo ?? '').trim(),
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now,
    };
    await db.put('settings', profile);
    return profile;
  },

  // --- CHARACTERS ---
  async getAllCharacters(): Promise<Character[]> {
    const db = await getDb();
    const chars = await db.getAll('characters');
    return chars.sort((a, b) => {
      if (a.id === GUIDE_RAVI_ID) return -1;
      if (b.id === GUIDE_RAVI_ID) return 1;
      return b.updatedAt - a.updatedAt;
    });
  },

  async saveCharacter(char: Character): Promise<Character> {
    const db = await getDb();
    if (char.id === GUIDE_RAVI_ID) {
      throw new Error('기본 안내 캐릭터(안내 라비)의 고유 설정이나 이름은 수정할 수 없습니다.');
    }

    const existing = await db.get('characters', char.id);
    const now = Date.now();
    const toSave: Character = {
      ...char,
      speechAndBehavior: (char.speechAndBehavior ?? '').trim(),
      worldView: (char.worldView ?? '').trim(),
      migratedWorldViews: char.migratedWorldViews ?? existing?.migratedWorldViews,
      createdAt: existing ? existing.createdAt : char.createdAt || now,
      updatedAt: now,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      isSystemGuide: false,
    };

    const tx = db.transaction(['characters', 'rooms', 'stories'], 'readwrite');
    await tx.objectStore('characters').put(toSave);

    // Ensure a default chat room and story memory structure exist for the character
    const roomIndex = tx.objectStore('rooms').index('by-character');
    const existingRooms = await roomIndex.getAll(toSave.id);
    if (existingRooms.length === 0) {
      const newRoom: ChatRoom = {
        id: `room-${toSave.id}`,
        title: `${toSave.name} 대화방`,
        characterId: toSave.id,
        mode: 'daily',
        createdAt: now,
        updatedAt: now,
      };
      await tx.objectStore('rooms').put(newRoom);
    }

    const storyIndex = tx.objectStore('stories').index('by-character');
    const existingStories = await storyIndex.getAll(toSave.id);
    if (existingStories.length === 0) {
      const newStory: StoryMemory = {
        id: `story-${toSave.id}`,
        characterId: toSave.id,
        worldView: toSave.worldView || '',
        relationships: '',
        startingSituation: '',
        keyMemories: [],
        migratedToCharacter: true,
        updatedAt: now,
        schemaVersion: CURRENT_SCHEMA_VERSION,
      };
      await tx.objectStore('stories').put(newStory);
    }

    await tx.done;
    return toSave;
  },

  async deleteCharacterPreservingRecords(characterId: string): Promise<{
    preservedRooms: number;
    preservedMessages: number;
    preservedStories: number;
  }> {
    if (characterId === GUIDE_RAVI_ID) {
      throw new Error('기본 내장 안내 캐릭터인 안내 라비는 삭제할 수 없습니다.');
    }

    const db = await getDb();
    const rooms = await db.getAllFromIndex('rooms', 'by-character', characterId);
    let preservedMessages = 0;
    for (const r of rooms) {
      const msgs = await db.getAllFromIndex('messages', 'by-room', r.id);
      preservedMessages += msgs.length;
    }
    const stories = await db.getAllFromIndex('stories', 'by-character', characterId);

    // Delete ONLY from 'characters' store
    await db.delete('characters', characterId);

    return {
      preservedRooms: rooms.length,
      preservedMessages,
      preservedStories: stories.length,
    };
  },

  // --- CHAT ROOMS & MESSAGES ---
  async getAllRooms(): Promise<ChatRoom[]> {
    const db = await getDb();
    const rooms = await db.getAll('rooms');
    return rooms.sort((a, b) => {
      if (a.characterId === GUIDE_RAVI_ID) return -1;
      if (b.characterId === GUIDE_RAVI_ID) return 1;
      return b.updatedAt - a.updatedAt;
    });
  },

  async createChatRoom(characterId: string, title?: string, mode: 'daily' | 'story' = 'daily'): Promise<ChatRoom> {
    const db = await getDb();
    const char = await db.get('characters', characterId);
    const now = Date.now();
    const room: ChatRoom = {
      id: `room-${characterId}-${now}`,
      title: title?.trim() || `${char ? char.name : '보존된 캐릭터'} 대화방`,
      characterId,
      mode,
      createdAt: now,
      updatedAt: now,
    };
    await db.put('rooms', room);
    return room;
  },

  async updateRoomMode(roomId: string, mode: 'daily' | 'story'): Promise<ChatRoom> {
    const db = await getDb();
    const room = await db.get('rooms', roomId);
    if (!room) throw new Error('채팅방을 찾을 수 없습니다.');
    room.mode = mode;
    room.updatedAt = Date.now();
    await db.put('rooms', room);
    return room;
  },

  async updateRoomNarratorType(roomId: string, sceneType: NarratorSceneType): Promise<void> {
    const db = await getDb();
    const room = await db.get('rooms', roomId);
    if (!room) return;
    room.lastNarratorType = sceneType;
    room.updatedAt = Date.now();
    await db.put('rooms', room);
  },

  async updateRoomSettings(
    roomId: string,
    patch: {
      customization?: RoomCustomizationOverride;
      clearCustomization?: boolean;
      promptOverride?: RoomCharacterPromptOverride;
      clearPromptOverride?: boolean;
      makjangMode?: boolean;
    }
  ): Promise<ChatRoom> {
    const db = await getDb();
    const room = await db.get('rooms', roomId);
    if (!room) throw new Error('채팅방을 찾을 수 없습니다.');

    if (patch.clearCustomization) {
      delete room.customization;
    } else if (patch.customization) {
      room.customization = {
        ...(room.customization || {}),
        ...patch.customization,
      };
    }

    if (patch.clearPromptOverride) {
      delete room.promptOverride;
    } else if (patch.promptOverride) {
      const cleaned: RoomCharacterPromptOverride = {};
      if (patch.promptOverride.characterInfoAndPersonality !== undefined) {
        cleaned.characterInfoAndPersonality = patch.promptOverride.characterInfoAndPersonality;
      }
      if (patch.promptOverride.speechAndBehavior !== undefined) {
        cleaned.speechAndBehavior = patch.promptOverride.speechAndBehavior;
      }
      if (patch.promptOverride.worldView !== undefined) {
        cleaned.worldView = patch.promptOverride.worldView;
      }
      room.promptOverride = cleaned;
    }

    if (typeof patch.makjangMode === 'boolean') {
      room.makjangMode = patch.makjangMode;
    }

    room.updatedAt = Date.now();
    await db.put('rooms', room);
    return room;
  },

  async getMessagesByRoom(roomId: string): Promise<Message[]> {
    const db = await getDb();
    const msgs = await db.getAllFromIndex('messages', 'by-room', roomId);
    return msgs.sort((a, b) => a.timestamp - b.timestamp);
  },

  async addMessage(msg: Omit<Message, 'id' | 'timestamp'>): Promise<Message> {
    const db = await getDb();
    const now = Date.now();
    const fullMsg: Message = {
      ...msg,
      id: `msg-${now}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: now,
    };

    const tx = db.transaction(['messages', 'rooms'], 'readwrite');
    await tx.objectStore('messages').put(fullMsg);
    const room = await tx.objectStore('rooms').get(msg.roomId);
    if (room) {
      room.updatedAt = now;
      if (msg.narratorSceneType) {
        room.lastNarratorType = msg.narratorSceneType;
      }
      await tx.objectStore('rooms').put(room);
    }
    await tx.done;
    return fullMsg;
  },

  async toggleMessageBookmark(messageId: string): Promise<Message | undefined> {
    const db = await getDb();
    const msg = await db.get('messages', messageId);
    if (!msg) return undefined;
    msg.isSavedFromCleanup = !msg.isSavedFromCleanup;
    await db.put('messages', msg);
    return msg;
  },

  // --- STORY MODE & 추억의 한조각 (KEY MEMORIES) ---
  async getStoryMemory(characterId: string): Promise<StoryMemory> {
    const db = await getDb();
    const existing = await db.getAllFromIndex('stories', 'by-character', characterId);
    if (existing.length > 0) {
      return existing[0];
    }
    // Requirement 3: Never auto-generate example or default memories; leave empty when not written
    const fresh: StoryMemory = {
      id: `story-${characterId}`,
      characterId,
      worldView: '',
      relationships: '',
      startingSituation: '',
      keyMemories: [],
      migratedToCharacter: true,
      updatedAt: Date.now(),
      schemaVersion: CURRENT_SCHEMA_VERSION,
    };
    await db.put('stories', fresh);
    return fresh;
  },

  async saveStoryMemory(story: StoryMemory): Promise<StoryMemory> {
    const db = await getDb();
    const updated: StoryMemory = {
      ...story,
      updatedAt: Date.now(),
      schemaVersion: CURRENT_SCHEMA_VERSION,
    };
    await db.put('stories', updated);
    return updated;
  },

  // --- COMMUNITY (Virtual SNS in 'community' store) ---
  async getCommunityFeed(): Promise<{ posts: CommunityPost[]; commentsByPost: Record<string, CommunityComment[]> }> {
    const db = await getDb();
    const items = await db.getAll('community');
    const posts: CommunityPost[] = [];
    const commentsByPost: Record<string, CommunityComment[]> = {};

    for (const item of items) {
      if (item.recordType === 'post' && item.post) {
        posts.push(item.post);
      } else if (item.recordType === 'comment' && item.comment) {
        const pid = item.comment.postId;
        if (!commentsByPost[pid]) commentsByPost[pid] = [];
        commentsByPost[pid].push(item.comment);
      }
    }

    posts.sort((a, b) => b.createdAt - a.createdAt);
    for (const pid of Object.keys(commentsByPost)) {
      commentsByPost[pid].sort((a, b) => a.createdAt - b.createdAt);
    }

    return { posts, commentsByPost };
  },

  async createCommunityPost(postData: Omit<CommunityPost, 'id' | 'createdAt' | 'likes' | 'commentsCount'>): Promise<CommunityPost> {
    const db = await getDb();
    const now = Date.now();
    const post: CommunityPost = {
      ...postData,
      id: `post-${now}-${Math.random().toString(36).substring(2, 6)}`,
      likes: 0,
      commentsCount: 0,
      createdAt: now,
    };
    const item: CommunityItem = {
      id: post.id,
      recordType: 'post',
      createdAt: now,
      isExample: post.isExample,
      post,
    };
    await db.put('community', item);
    return post;
  },

  async getCommunityLike(postId: string): Promise<boolean> {
    const db = await getDb();
    return Boolean(await db.get('settings', `community_like:${postId}`));
  },

  async setCommunityLike(postId: string, liked: boolean): Promise<{ liked: boolean; likes: number } | null> {
    const db = await getDb();
    const tx = db.transaction(['community', 'settings'], 'readwrite');
    const posts = tx.objectStore('community');
    const settings = tx.objectStore('settings');
    const item = await posts.get(postId);
    if (item?.recordType !== 'post' || !item.post) {
      await tx.done;
      return null;
    }

    const id = `community_like:${postId}` as const;
    const alreadyLiked = Boolean(await settings.get(id));
    if (liked !== alreadyLiked) {
      item.post.likes = Math.max(0, (item.post.likes ?? 0) + (liked ? 1 : -1));
      await posts.put(item);
      if (liked) await settings.put({ id });
      else await settings.delete(id);
    }
    await tx.done;
    return { liked, likes: item.post.likes ?? 0 };
  },

  async addCommunityComment(commentData: Omit<CommunityComment, 'id' | 'createdAt'>): Promise<CommunityComment> {
    const db = await getDb();
    const now = Date.now();
    const comment: CommunityComment = {
      ...commentData,
      id: `comm-${now}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: now,
    };
    const tx = db.transaction('community', 'readwrite');
    await tx.store.put({
      id: comment.id,
      recordType: 'comment',
      createdAt: now,
      isExample: comment.isExample,
      comment,
    });

    const postItem = await tx.store.get(comment.postId);
    if (postItem && postItem.post) {
      postItem.post.commentsCount = (postItem.post.commentsCount || 0) + 1;
      await tx.store.put(postItem);
    }
    await tx.done;
    return comment;
  },

  async deleteExampleCommunityDataOnly(): Promise<number> {
    const db = await getDb();
    const items = await db.getAll('community');
    const tx = db.transaction('community', 'readwrite');
    let deletedCount = 0;
    for (const item of items) {
      if (item.isExample) {
        await tx.store.delete(item.id);
        deletedCount++;
      }
    }
    await tx.done;
    return deletedCount;
  },

  async deleteCommunityPost(postId: string): Promise<void> {
    const db = await getDb();
    const items = await db.getAll('community');
    const tx = db.transaction('community', 'readwrite');
    await tx.store.delete(postId);
    for (const item of items) {
      if (item.recordType === 'comment' && item.comment?.postId === postId) {
        await tx.store.delete(item.id);
      }
    }
    await tx.done;
  },

  // --- CUSTOMIZATION & SETTINGS ---
  async getCustomizationSettings(): Promise<CustomizationSettings> {
    const db = await getDb();
    const res = (await db.get('settings', 'customization')) as CustomizationSettings | undefined;
    if (res) return res;
    const fallback: CustomizationSettings = {
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
    await db.put('settings', fallback);
    return fallback;
  },

  async saveCustomizationSettings(settings: Omit<CustomizationSettings, 'id' | 'updatedAt'>): Promise<CustomizationSettings> {
    const db = await getDb();
    const full: CustomizationSettings = {
      ...settings,
      id: 'customization',
      updatedAt: Date.now(),
    };
    await db.put('settings', full);
    return full;
  },

  async resetCustomizationToDefault(): Promise<CustomizationSettings> {
    const defaultSettings: Omit<CustomizationSettings, 'id' | 'updatedAt'> = {
      theme: 'dark-indigo',
      frameAssetId: 'default-frame-indigo',
      cornerAssetId: 'none',
      appBackgroundAssetId: 'none',
      chatBackgroundAssetId: 'default-chat-bg-night',
      bubbleStyle: 'glass',
      customStickers: [],
    };
    return this.saveCustomizationSettings(defaultSettings);
  },

  async getAppSettings(): Promise<AppSettings> {
    const db = await getDb();
    const res = (await db.get('settings', 'app_settings')) as AppSettings | undefined;
    if (res) {
      if (typeof res.narratorEnabled !== 'boolean') {
        res.narratorEnabled = true;
      }
      return res;
    }
    const fallback: AppSettings = {
      id: 'app_settings',
      soundEnabled: true,
      narratorEnabled: true,
      aiImageGenerationEnabled: false,
      autoCleanupDays: 3,
      autoCleanupEnabled: false,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      updatedAt: Date.now(),
    };
    await db.put('settings', fallback);
    return fallback;
  },

  async saveAppSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
    const current = await this.getAppSettings();
    const db = await getDb();
    const updated: AppSettings = {
      ...current,
      ...settings,
      id: 'app_settings',
      updatedAt: Date.now(),
    };
    await db.put('settings', updated);
    return updated;
  },

  // --- BACKUP & EXPORT INTERFACE ---
  async exportSnapshotJson(): Promise<string> {
    const db = await getDb();
    const snapshot = {
      appName: '러비러비톡 (Lovy Lovy Talk)',
      schemaVersion: CURRENT_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      stores: {
        characters: await db.getAll('characters'),
        rooms: await db.getAll('rooms'),
        messages: await db.getAll('messages'),
        stories: await db.getAll('stories'),
        community: await db.getAll('community'),
        settings: await db.getAll('settings'),
        assetsMetadata: (await db.getAll('assets')).map((a) => ({
          id: a.id,
          name: a.name,
          type: a.type,
          mimeType: a.mimeType,
          contentHash: a.contentHash,
          isDefault: a.isDefault,
          createdAt: a.createdAt,
        })),
      },
    };
    return JSON.stringify(snapshot, null, 2);
  },
};
