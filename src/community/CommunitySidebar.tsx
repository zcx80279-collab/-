import type { CommunityPost } from '../core/types';
import { SkinIcon, SkinPanel } from './CommunitySkin';
import { tagLabel } from './communityTags';

export function CommunitySidebar({ popular, tags, onPost, onTag }: {
  popular: CommunityPost[];
  tags: string[];
  onPost: (id: string) => void;
  onTag: (tag: string) => void;
}) {
  return (
    <aside className="community-side">
      <SkinPanel id="sidebar" className="community-side-layout">
        <SkinPanel id="popular" className="community-popular">
          <h2><SkinIcon id="popularIcon" />인기글 TOP 5</h2>
          <SkinPanel id="popularList" className="community-popular-list">
            {popular.length ? <ol>
              {popular.map((post, index) => (
                <li key={post.id}>
                  <button type="button" onClick={() => onPost(post.id)}>
                    <span className="community-rank">{index === 0 && <SkinIcon id="crown" />}{index + 1}</span>
                    <span className="line-clamp-2">{post.content}</span>
                    <span className="community-meta"><SkinIcon id="like" />{post.likes}</span>
                  </button>
                </li>
              ))}
            </ol> : <p>표시할 인기글이 없습니다.</p>}
          </SkinPanel>
        </SkinPanel>
        <SkinPanel id="hashtags" className="community-today">
          <h2><SkinIcon id="hashtagIcon" />오늘의 해시태그</h2>
          <div className="community-tags">
            {tags.length ? tags.map((tag) => (
              <button type="button" key={tag} onClick={() => onTag(tag)}>{tagLabel(tag)}</button>
            )) : <p>오늘 등록된 공식 해시태그가 없습니다.</p>}
          </div>
        </SkinPanel>
      </SkinPanel>
    </aside>
  );
}
