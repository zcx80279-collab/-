import { COMMUNITY_RANDOM_TOPICS } from '../ai/aiService';
import type { CommunityPost } from '../core/types';

const compact = (tag: string) => tag.normalize('NFC').replace(/\s+/g, '').toLocaleLowerCase();
const officialByKey = new Map(COMMUNITY_RANDOM_TOPICS.map((topic) => [compact(topic), topic]));
const hashtagPattern = /(?<![\p{L}\p{N}_])#[\p{L}\p{M}\p{N}_]+/gu;

export const tagLabel = (tag: string) => '#' + tag.replace(/\s+/g, '');
export const officialTag = (tag: string) => officialByKey.get(compact(tag.replace(/^#/, '')));

export function postTags(post: CommunityPost) {
  const official = new Set<string>();
  const free = new Set<string>();
  const topic = officialTag(post.topic);
  if (topic) official.add(topic);
  for (const tag of `${post.title}\n${post.content}`.matchAll(hashtagPattern)) {
    const registered = officialTag(tag[0]);
    if (registered) official.add(registered);
    else free.add(tag[0]);
  }
  return { official: [...official], free: [...free] };
}

export function searchablePostText(post: CommunityPost) {
  return `${post.authorName}\n${post.title}\n${post.content}`
    .replace(hashtagPattern, (tag) => officialTag(tag) ? tag : '')
    .normalize('NFC').toLocaleLowerCase();
}
