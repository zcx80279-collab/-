import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import {
  CommunityPost,
  CommunityComment,
  Character,
  Asset,
  AppSettings,
} from '../core/types';
import { storageService } from '../storage/storageService';
import { COMMUNITY_RANDOM_TOPICS } from '../ai/aiService';
import { DEFAULT_AVATARS } from '../core/defaultAssets';
import { Image as ImageIcon, Upload } from 'lucide-react';
import { CommunityPostDetail } from './CommunityPostDetail';
import { CommunitySidebar } from './CommunitySidebar';
import { CommunitySkinProvider, SkinDivider, SkinFrame, SkinIcon, SkinPanel } from './CommunitySkin';
import type { CommunitySkinOverrides } from './CommunitySkin';
import { officialTag, postTags, searchablePostText, tagLabel } from './communityTags';
import './community.css';

const navigation = [
  ['chat', '채팅방', 'comment'],
  ['community', '커뮤니티', 'popularIcon'],
  ['characters', '캐릭터 관리', 'navigationCharacters'],
  ['settings', '환경설정', 'filter'],
] as const;
type CommunityDestination = (typeof navigation)[number][0];

interface CommunityFeedProps {
  characters: Character[];
  assetUrls: Record<string, string>;
  appSettings: AppSettings | null;
  onAssetsUpdated: () => void;
  onNavigate: (tab: CommunityDestination) => void;
  skinOverrides?: CommunitySkinOverrides;
}

export const CommunityFeed: React.FC<CommunityFeedProps> = ({
  characters,
  assetUrls,
  appSettings,
  onAssetsUpdated,
  onNavigate,
  skinOverrides,
}) => {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [commentsByPost, setCommentsByPost] = useState<Record<string, CommunityComment[]>>({});
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'user' | 'example'>('all');

  const [query, setQuery] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [openTool, setOpenTool] = useState<'search' | 'filter' | null>(null);

  // New Post Form (For user data verification vs example data)
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [authorId, setAuthorId] = useState<string>(characters[0]?.id || 'char-luna');
  const [topic, setTopic] = useState<string>(COMMUNITY_RANDOM_TOPICS[0]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedImageAssetId, setSelectedImageAssetId] = useState<string>('none');
  const [communityAssets, setCommunityAssets] = useState<Asset[]>([]);

  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const feedRef = useRef<HTMLDivElement>(null);
  const scrollPosition = useRef({ main: 0, feed: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadCommunityData();
  }, []);

  const loadCommunityData = async () => {
    const [{ posts: loadedPosts, commentsByPost: loadedComments }, allAssets] = await Promise.all([
      storageService.getCommunityFeed(),
      storageService.getAllAssets(),
    ]);
    setPosts(loadedPosts);
    setCommentsByPost(loadedComments);
    setCommunityAssets(allAssets.filter((a) => a.type === 'community' || a.type === 'sticker'));
  };

  const handleUploadCommunityImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { asset, deduplicated } = await storageService.registerAssetFromFile(
      file,
      'community',
      `커뮤니티 첨부: ${file.name}`
    );
    await loadCommunityData();
    onAssetsUpdated();
    setSelectedImageAssetId(asset.id);
    setStatusMessage(
      deduplicated
        ? `동일 해시 이미지가 이미 "assets" 스토어에 존재하여 중복 저장 없이 에셋 ID(${asset.id})를 참조합니다.`
        : `새 첨부 이미지가 "assets" 스토어에 저장되었습니다 (ID: ${asset.id}).`
    );
    e.target.value = '';
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    const char = characters.find((c) => c.id === authorId) || characters[0];
    const created = await storageService.createCommunityPost({
      authorId: char ? char.id : 'user-test',
      authorName: char ? char.name : '사용자 캐릭터',
      authorAvatarAssetId: char ? char.avatarAssetId : 'guide-ravi-avatar',
      topic,
      title: title.trim(),
      content: content.trim(),
      imageAssetId: selectedImageAssetId !== 'none' ? selectedImageAssetId : undefined,
      isExample: false, // Strictly user data
    });

    setTitle('');
    setContent('');
    setSelectedImageAssetId('none');
    setShowCreateForm(false);
    await loadCommunityData();
    setSelectedPostId(created.id);
    setStatusMessage('사용자 커뮤니티 게시글이 "community" 스토어에 저장되었습니다 (예시 데이터와 분리됨).');
  };

  const handleDeleteExamplesOnly = async () => {
    const count = await storageService.deleteExampleCommunityDataOnly();
    if (selectedPostId) {
      const stillExists = posts.find((p) => p.id === selectedPostId && !p.isExample);
      if (!stillExists) setSelectedPostId(null);
    }
    await loadCommunityData();
    setStatusMessage(
      `화면 확인용 예시 데이터 ${count}건을 삭제했습니다. 사용자가 등록한 게시글과 댓글은 그대로 보존되었습니다.`
    );
  };

  const chooseTag = (tag: string) => {
    setTagFilter(tag);
    setSelectedPostId(null);
  };

  const trimmedQuery = query.trim().normalize('NFC').toLocaleLowerCase();
  const searchedTag = officialTag(trimmedQuery);
  const filteredPosts = posts.filter((post) => {
    if (filterMode === 'user' && post.isExample) return false;
    if (filterMode === 'example' && !post.isExample) return false;
    const tags = postTags(post).official;
    if (tagFilter && !tags.includes(tagFilter)) return false;
    if (!trimmedQuery) return true;
    if (trimmedQuery.startsWith('#') || searchedTag) {
      return Boolean(searchedTag && tags.includes(searchedTag));
    }
    return searchablePostText(post).includes(trimmedQuery) ||
      tags.some((tag) => tag.toLocaleLowerCase().includes(trimmedQuery));
  });

  const selectedPost = posts.find((post) => post.id === selectedPostId);
  const detailOpen = Boolean(selectedPost) && !showCreateForm;
  const selectedComments = selectedPost ? commentsByPost[selectedPost.id] ?? [] : [];
  const popular = [...posts].sort((a, b) => b.likes - a.likes || b.createdAt - a.createdAt).slice(0, 5);
  const today = new Date().toDateString();
  const tagCounts = new Map<string, number>();
  for (const post of posts) {
    if (new Date(post.createdAt).toDateString() !== today) continue;
    for (const tag of postTags(post).official) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
  }
  const todaysTags = [...tagCounts].sort((a, b) => b[1] - a[1]).map(([tag]) => tag);

  useLayoutEffect(() => {
    if (selectedPost || showCreateForm) return;
    if (mainRef.current) mainRef.current.scrollTop = scrollPosition.current.main;
    if (feedRef.current) feedRef.current.scrollTop = scrollPosition.current.feed;
  }, [selectedPost?.id, showCreateForm]);

  function showPost(id: string) {
    scrollPosition.current = {
      main: mainRef.current?.scrollTop ?? 0,
      feed: feedRef.current?.scrollTop ?? 0,
    };
    setSelectedPostId(id);
  }

  const author = (name: string, avatar: string, createdAt: number) => (
    <div className="community-author">
      <img src={assetUrls[avatar] || DEFAULT_AVATARS.luna} alt="" referrerPolicy="no-referrer" />
      <div><strong>{name}</strong><time dateTime={new Date(createdAt).toISOString()}>
        {new Date(createdAt).toLocaleString('ko-KR')}
      </time></div>
    </div>
  );

  const attachment = (post: CommunityPost) => {
    const src = post.imageAssetId && assetUrls[post.imageAssetId];
    return src ? <img className="community-attachment" src={src} alt={post.title + ' 첨부 이미지'} referrerPolicy="no-referrer" /> : null;
  };

  const tagsOf = (post: CommunityPost) => {
    const { official, free } = postTags(post);
    return (official.length > 0 || free.length > 0) && (
      <div className="community-tags">
        {official.map((tag) => <button key={tag} type="button" onClick={() => chooseTag(tag)}>{tagLabel(tag)}</button>)}
        {free.map((tag) => <span key={tag}>{tag}</span>)}
      </div>
    );
  };

  const closeMenu = () => {
    setMenuOpen(false);
    menuTriggerRef.current?.focus({ preventScroll: true });
  };

  const toggleTool = (tool: 'search' | 'filter') => setOpenTool(openTool === tool ? null : tool);

  return (
    <CommunitySkinProvider overrides={skinOverrides}>
      <section className={`community-shell ${detailOpen ? 'community-detail-shell' : ''}`} aria-label="커뮤니티">
        <SkinFrame detail={detailOpen} />
        {!detailOpen && <header className="community-toolbar">
          <div>
            <button type="button" aria-label="이동 메뉴" ref={menuTriggerRef} aria-expanded={menuOpen} aria-controls={menuOpen ? 'community-navigation' : undefined} onClick={() => setMenuOpen(true)}><SkinIcon id="menu" /></button>
            <button type="button" aria-label="게시글 작성" aria-expanded={showCreateForm} onClick={() => {
              setOpenTool(null);
              setShowCreateForm(!showCreateForm);
            }}><SkinIcon id="compose" /></button>
          </div>
          <div>
            <button type="button" aria-label="검색" aria-expanded={openTool === 'search'} onClick={() => toggleTool('search')}><SkinIcon id="search" /></button>
            <button type="button" aria-label="분류" aria-expanded={openTool === 'filter'} onClick={() => toggleTool('filter')}><SkinIcon id="filter" /></button>
          </div>
        </header>}
        <div className="community-content">
          {!detailOpen && openTool && (
            <div className="community-tools">
              {openTool === 'search' ? (
                <input type="search" aria-label="게시글 및 공식 해시태그 검색" placeholder="게시글 및 공식 해시태그 검색"
                  value={query} autoFocus onChange={(event) => { setQuery(event.target.value); setSelectedPostId(null); }} />
              ) : (
                <>
                  <select aria-label="게시글 종류" value={filterMode} onChange={(event) => {
                    const value = event.target.value;
                    if (value === 'all' || value === 'user' || value === 'example') setFilterMode(value);
                    setSelectedPostId(null);
                  }}>
                    <option value="all">전체 게시글</option>
                    <option value="user">사용자 게시글</option>
                    <option value="example">예시 게시글</option>
                  </select>
                  <select aria-label="공식 해시태그" value={tagFilter} onChange={(event) => chooseTag(event.target.value)}>
                    <option value="">모든 공식 해시태그</option>
                    {COMMUNITY_RANDOM_TOPICS.map((tag) => <option value={tag} key={tag}>{tagLabel(tag)}</option>)}
                  </select>
                  <button type="button" onClick={handleDeleteExamplesOnly}>예시 데이터만 일괄 삭제</button>
                  <span>AI 이미지 생성 설정 {appSettings?.aiImageGenerationEnabled ? 'ON' : 'OFF'}</span>
                </>
              )}
              <button type="button" onClick={() => setOpenTool(null)}>닫기</button>
            </div>
          )}
          {!detailOpen && statusMessage && <div className="community-tools" role="status">
            <span>{statusMessage}</span><button type="button" onClick={() => setStatusMessage(null)}>닫기</button>
          </div>}
          {showCreateForm && (
            <div className="community-compose">
        <form
          onSubmit={handleCreatePost}
          className="p-5 rounded-2xl bg-slate-900/95 border border-pink-500/40 space-y-4 shadow-xl"
        >
          <h3 className="text-sm font-bold text-white">
            새 커뮤니티 게시글 등록 (사용자 데이터로 저장되며 예시 데이터 삭제 시 영향받지 않음)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">작성 캐릭터 선택</label>
              <select
                value={authorId}
                onChange={(e) => setAuthorId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-indigo-500/30 text-xs text-white"
              >
                {characters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                사전 정의 주제 목록 (향후 무작위 주제 선택 기반)
              </label>
              <select
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-indigo-500/30 text-xs text-white"
              >
                {COMMUNITY_RANDOM_TOPICS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">게시글 제목 *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="게시글 제목을 입력하세요"
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-indigo-500/30 text-xs text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">게시글 본문 *</label>
            <textarea
              rows={3}
              required
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="내용을 입력하세요"
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-indigo-500/30 text-xs text-white"
            />
          </div>

          {/* Image Attachment Area (Library reference by Asset ID) */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-indigo-500/30 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-semibold text-indigo-200 flex items-center gap-1.5">
                <ImageIcon size={14} className="text-sky-400" />
                <span>이미지 첨부 영역 (중복 저장 없이 &quot;assets&quot; 스토어 에셋 ID로 참조)</span>
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/webp,image/gif,image/jpeg,image/svg+xml"
                onChange={handleUploadCommunityImage}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-lg bg-indigo-950 hover:bg-indigo-900 border border-indigo-500/40 text-xs text-indigo-200 flex items-center gap-1"
              >
                <Upload size={12} />
                <span>새 이미지 에셋 추가</span>
              </button>
            </div>

            <select
              value={selectedImageAssetId}
              onChange={(e) => setSelectedImageAssetId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
            >
              <option value="none">이미지 첨부 안 함</option>
              {communityAssets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} (에셋 ID: {a.id})
                </option>
              ))}
            </select>

            {selectedImageAssetId !== 'none' && assetUrls[selectedImageAssetId] && (
              <div className="pt-2">
                <img
                  src={assetUrls[selectedImageAssetId]}
                  alt="첨부 미리보기"
                  referrerPolicy="no-referrer"
                  className="max-h-40 rounded-xl border border-indigo-500/40 object-cover"
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-300"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-xs font-semibold text-white"
            >
              게시글 저장
            </button>
          </div>
        </form>
            </div>
          )}
          <div ref={mainRef} className="community-main" hidden={Boolean(selectedPost) || showCreateForm}>
            <SkinPanel id="feed" className="community-feed-panel">
              <div ref={feedRef} className="community-feed-scroll" tabIndex={0} aria-label="게시글 목록">
                {tagFilter && <button type="button" className="community-active-tag" onClick={() => chooseTag('')}>
                  {tagLabel(tagFilter)} 해제
                </button>}
                <div className="community-card-grid">
                  {filteredPosts.map((post) => (
                    <SkinPanel id="post" className="community-card" key={post.id}>
                      <article>
                        <button type="button" className="community-open-post" onClick={() => showPost(post.id)} aria-label={`${post.title} 상세 보기`}>
                          {author(post.authorName, post.authorAvatarAssetId, post.createdAt)}
                          <h2>{post.title}</h2>
                          <p className="line-clamp-3">{post.content}</p>
                          {attachment(post)}
                        </button>
                        {tagsOf(post)}
                        <SkinDivider />
                        <div className="community-stats">
                          <span className="community-meta" aria-label={`좋아요 ${post.likes}개`}><SkinIcon id="like" />{post.likes}</span>
                          <span className="community-meta" aria-label={`댓글 ${commentsByPost[post.id]?.length ?? 0}개`}><SkinIcon id="comment" />{commentsByPost[post.id]?.length ?? 0}</span>
                        </div>
                      </article>
                    </SkinPanel>
                  ))}
                  {!filteredPosts.length && <p>표시할 게시글이 없습니다.</p>}
                </div>
              </div>
            </SkinPanel>
            <CommunitySidebar popular={popular} tags={todaysTags} onPost={showPost} onTag={chooseTag} />
          </div>
          {selectedPost && detailOpen && (
            <CommunityPostDetail
              key={selectedPost.id}
              post={selectedPost}
              comments={selectedComments}
              characters={characters}
              author={author}
              attachment={attachment(selectedPost)}
              tags={tagsOf(selectedPost)}
              onBack={() => setSelectedPostId(null)}
              onLikeCount={(id, likes) => setPosts((previous) =>
                previous.map((post) => post.id === id ? { ...post, likes } : post)
              )}
              onNewComment={(comment) => setCommentsByPost((previous) => ({
                ...previous,
                [comment.postId]: [...(previous[comment.postId] ?? []), comment],
              }))}
            />
          )}
        </div>
        {menuOpen && (
          <div className="community-drawer-backdrop" onClick={(event) => {
            if (event.currentTarget === event.target) closeMenu();
          }} onKeyDown={(event) => { if (event.key === 'Escape') closeMenu(); }}>
            <nav id="community-navigation" className="community-drawer" aria-label="이동 메뉴">
              <SkinPanel id="navigationPanel" className="community-drawer-panel">
                <div className="community-drawer-emblem" aria-hidden="true">
                  <SkinIcon id="profileRabbit" />
                </div>
                {navigation.map(([tab, label, icon]) => (
                  <button key={tab} type="button" autoFocus={tab === 'community'}
                    aria-current={tab === 'community' ? 'page' : undefined}
                    onClick={() => {
                      closeMenu();
                      onNavigate(tab);
                    }}>
                    <SkinIcon id={icon} />
                    <span>{label}</span>
                  </button>
                ))}
              </SkinPanel>
            </nav>
          </div>
        )}
      </section>
    </CommunitySkinProvider>
  );
};
