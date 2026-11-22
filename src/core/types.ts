export type ThemeMode = 'dark-indigo' | 'black' | 'violet' | 'neon-pink' | 'neon-blue';
export type BubbleStyle = 'glass' | 'neon' | 'solid';
export type ChatMode = 'daily' | 'story';

export interface Character {
  id: string;
  name: string;
  avatarAssetId: string;
  systemPrompt: string;
  description: string;
  customSettings: Record<string, string | number | boolean>;
  createdAt: number;
  updatedAt: number;
  schemaVersion: number;
  isSystemGuide?: boolean;
}

export interface ChatRoom {
  id: string;
  title?: string;
  characterId: string;
  mode: ChatMode;
  createdAt: number;
  updatedAt: number;
}

export interface Message {
  id: string;
  roomId: string;
  sender: 'user' | 'character' | 'guide';
  content: string;
  timestamp: number;
  mode: ChatMode;
  isSavedFromCleanup?: boolean;
}

export interface StoryMemory {
  id: string;
  characterId: string;
  worldView: string;
  relationships: string;
  startingSituation: string;
  keyMemories: string[];
  updatedAt: number;
  schemaVersion: number;
}

export interface CommunityPost {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatarAssetId: string;
  topic: string;
  title: string;
  content: string;
  imageAssetId?: string;
  likes: number;
  commentsCount: number;
  createdAt: number;
  isExample: boolean;
}

export interface CommunityComment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorAvatarAssetId: string;
  content: string;
  createdAt: number;
  isExample: boolean;
}

export interface CommunityItem {
  id: string;
  recordType: 'post' | 'comment';
  createdAt: number;
  isExample: boolean;
  post?: CommunityPost;
  comment?: CommunityComment;
}

export interface CustomizationSettings {
  id: 'customization';
  theme: ThemeMode;
  frameAssetId: string;
  cornerAssetId: string;
  appBackgroundAssetId: string;
  chatBackgroundAssetId: string;
  bubbleStyle: BubbleStyle;
  customStickers: string[];
  updatedAt: number;
}

export interface AppSettings {
  id: 'app_settings';
  soundEnabled: boolean;
  aiImageGenerationEnabled: boolean;
  autoCleanupDays: number;
  autoCleanupEnabled: boolean;
  schemaVersion: number;
  updatedAt: number;
}

export interface Asset {
  id: string;
  name: string;
  type: 'avatar' | 'frame' | 'corner' | 'background' | 'chat-bg' | 'sticker' | 'community';
  mimeType: string;
  blob?: Blob;
  dataUrl: string;
  contentHash: string;
  isDefault?: boolean;
  dimensions?: string;
  createdAt: number;
}

export const CURRENT_SCHEMA_VERSION = 1;
export const GUIDE_RAVI_ID = 'guide-ravi';
export const GUIDE_RAVI_ROOM_ID = 'room-guide-ravi';
