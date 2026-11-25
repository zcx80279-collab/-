export type ThemeMode = 'dark-indigo' | 'black' | 'violet' | 'neon-pink' | 'neon-blue';
export type BubbleStyle = 'glass' | 'neon' | 'solid';
export type ChatMode = 'daily' | 'story';
export type NormalNarratorSceneType = 'daily' | 'romance' | 'exploration' | 'combat' | 'trpg';
export type NarratorSceneType = NormalNarratorSceneType | 'makjang';
export type PresenceStatus = 'online' | 'resting' | 'offline';

export interface ChatDisplayPreferences {
  showStatusMessage: boolean;
  showPresenceStatus: boolean;
}

export interface FullSkinSlicedAssets {
  sourceAssetId?: string;
  outerFrameAssetId?: string;
  friendListAssetId?: string;
  chatBgAssetId?: string;
  inputBarAssetId?: string;
}

export interface BubbleCustomization {
  opponentBubbleAssetId?: string;
  userBubbleAssetId?: string;
  opponentTextColor?: string;
  userTextColor?: string;
}

export interface RaviAiBridgeState {
  /** Future expansion: true only when independent Ravi AI app is installed and verified */
  installed: boolean;
  /** Future expansion: true only after explicit user approval */
  connected: boolean;
  /** Future expansion: user dismissed the upgrade prompt */
  dismissed?: boolean;
}

export interface MigratedWorldViewRecord {
  sourceId: string;
  worldView: string;
  relationships?: string;
  startingSituation?: string;
  migratedAt: number;
}

export interface Character {
  id: string;
  name: string;
  avatarAssetId: string;
  systemPrompt: string;
  description: string;
  speechAndBehavior?: string;
  worldView?: string;
  /** Reserved for future status message feature (Patch 3 leaves empty if unregistered) */
  statusMessage?: string;
  migratedWorldViews?: MigratedWorldViewRecord[];
  customSettings: Record<string, string | number | boolean>;
  createdAt: number;
  updatedAt: number;
  schemaVersion: number;
  isSystemGuide?: boolean;
}

export interface UserProfile {
  id: 'user_profile';
  name: string;
  avatarAssetId?: string;
  appearance?: string;
  personality?: string;
  bio: string;
  additionalInfo: string;
  createdAt: number;
  updatedAt: number;
}

export interface RoomCustomizationOverride {
  theme?: ThemeMode;
  frameAssetId?: string;
  cornerAssetId?: string;
  appBackgroundAssetId?: string;
  chatBackgroundAssetId?: string;
  bubbleStyle?: BubbleStyle;
  fullSkin?: FullSkinSlicedAssets;
  bubbles?: BubbleCustomization;
}

export interface RoomCharacterPromptOverride {
  characterInfoAndPersonality?: string;
  speechAndBehavior?: string;
  worldView?: string;
}

export interface ChatRoom {
  id: string;
  title?: string;
  characterId: string;
  mode: ChatMode;
  lastNarratorType?: NarratorSceneType;
  customization?: RoomCustomizationOverride;
  promptOverride?: RoomCharacterPromptOverride;
  makjangMode?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface MessageSegment {
  type: 'narrator' | 'dialogue';
  text: string;
}

export interface Message {
  id: string;
  roomId: string;
  sender: 'user' | 'character' | 'guide' | 'narrator';
  content: string;
  segments?: MessageSegment[];
  narratorSceneType?: NarratorSceneType;
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
  migratedToCharacter?: boolean;
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

export interface CommunityLikeRecord {
  id: `community_like:${string}`;
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
  fullSkin?: FullSkinSlicedAssets;
  bubbles?: BubbleCustomization;
  updatedAt: number;
}

export interface AppSettings {
  id: 'app_settings';
  soundEnabled: boolean;
  narratorEnabled: boolean;
  aiImageGenerationEnabled: boolean;
  autoCleanupDays: number;
  autoCleanupEnabled: boolean;
  welcomeSeen?: boolean;
  chatDisplayPreferences?: ChatDisplayPreferences;
  schemaVersion: number;
  updatedAt: number;
}

export interface Asset {
  id: string;
  name: string;
  type:
    | 'avatar'
    | 'frame'
    | 'corner'
    | 'background'
    | 'chat-bg'
    | 'sticker'
    | 'community'
    | 'full-skin'
    | 'friend-list-bg'
    | 'input-bar-bg'
    | 'bubble-opponent'
    | 'bubble-user';
  mimeType: string;
  blob?: Blob;
  dataUrl: string;
  contentHash: string;
  isDefault?: boolean;
  dimensions?: string;
  createdAt: number;
}

export const CURRENT_SCHEMA_VERSION = 2;
export const GUIDE_RAVI_ID = 'guide-ravi';
export const GUIDE_RAVI_ROOM_ID = 'room-guide-ravi';
