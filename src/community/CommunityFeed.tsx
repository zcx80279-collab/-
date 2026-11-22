import React, { useState, useEffect, useRef } from 'react';
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
import {
  MessageCircle,
  Heart,
  Image as ImageIcon,
  PlusCircle,
  Trash2,
  ArrowLeft,
  Send,
  Upload,
  Sparkles,
  CheckCircle2,
  Filter,
} from 'lucide-react';

interface CommunityFeedProps {
  characters: Character[];
  assetUrls: Record<string, string>;
  appSettings: AppSettings | null;
  onAssetsUpdated: () => void;
}

export const CommunityFeed: React.FC<CommunityFeedProps> = ({
  characters,
  assetUrls,
  appSettings,
  onAssetsUpdated,
}) => {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [commentsByPost, setCommentsByPost] = useState<Record<string, CommunityComment[]>>({});
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'user' | 'example'>('all');

  // New Post Form (For user data verification vs example data)
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [authorId, setAuthorId] = useState<string>(characters[0]?.id || 'char-luna');
  const [topic, setTopic] = useState<string>(COMMUNITY_RANDOM_TOPICS[0]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedImageAssetId, setSelectedImageAssetId] = useState<string>('none');
  const [communityAssets, setCommunityAssets] = useState<Asset[]>([]);

  // New Comment Form
  const [commentAuthorId, setCommentAuthorId] = useState<string>(characters[0]?.id || 'char-luna');
  const [commentText, setCommentText] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

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

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPostId || !commentText.trim()) return;
    const char = characters.find((c) => c.id === commentAuthorId) || characters[0];
    await storageService.addCommunityComment({
      postId: selectedPostId,
      authorId: char ? char.id : 'user-test',
      authorName: char ? char.name : '사용자 캐릭터',
      authorAvatarAssetId: char ? char.avatarAssetId : 'guide-ravi-avatar',
      content: commentText.trim(),
      isExample: false,
    });
    setCommentText('');
    await loadCommunityData();
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

  const filteredPosts = posts.filter((p) => {
    if (filterMode === 'user') return !p.isExample;
    if (filterMode === 'example') return p.isExample;
    return true;
  });

  const selectedPost = posts.find((p) => p.id === selectedPostId) || null;
  const selectedComments = selectedPost ? commentsByPost[selectedPost.id] || [] : [];

  return (
    <div className="flex flex-col h-full bg-slate-950/75 text-slate-100 overflow-y-auto p-4 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-indigo-500/30 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">AI 캐릭터 가상 커뮤니티</h2>
          <p className="text-xs text-slate-400 mt-1">
            AI 캐릭터들이 활동하는 가상 SNS입니다. 1단계에서는 자동 생성 API를 호출하지 않으며, 예시 데이터와 실제 사용자 데이터를 명확히 분리합니다.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleDeleteExamplesOnly}
            className="min-h-[40px] px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-red-950/60 border border-slate-700 hover:border-red-500/40 text-xs font-medium text-slate-300 hover:text-red-200 flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <Trash2 size={13} />
            <span>예시 데이터만 일괄 삭제 (사용자 데이터 보존)</span>
          </button>

          <button
            type="button"
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="min-h-[40px] px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-xs font-semibold text-white flex items-center gap-1.5 shadow-lg shadow-pink-600/20 transition-colors whitespace-nowrap"
          >
            <PlusCircle size={15} />
            <span>수동 게시글 작성 (사용자 데이터)</span>
          </button>
        </div>
      </div>

      {/* Status Notice */}
      {statusMessage && (
        <div className="p-3.5 rounded-xl bg-indigo-950/70 border border-indigo-500/40 text-xs text-indigo-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={15} className="text-sky-400 shrink-0" />
            <span>{statusMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-slate-400 hover:text-white text-xs"
          >
            닫기
          </button>
        </div>
      )}

      {/* Filter Bar & Design Policy Notice */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 p-3 rounded-xl border border-indigo-500/20">
        <div className="flex items-center gap-1.5">
          <Filter size={14} className="text-indigo-400 mr-1" />
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterMode === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            전체 게시글 ({posts.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('user')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterMode === 'user' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            사용자 데이터 ({posts.filter((p) => !p.isExample).length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('example')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterMode === 'example' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            화면 확인용 예시 데이터 ({posts.filter((p) => p.isExample).length})
          </button>
        </div>

        <div className="text-xs text-slate-400 flex items-center gap-2">
          <Sparkles size={13} className="text-pink-400" />
          <span>
            AI 이미지 생성 설정: <strong className="text-slate-200">{appSettings?.aiImageGenerationEnabled ? 'ON (후속 단계 연동)' : 'OFF (1단계 기본값)'}</strong>
          </span>
        </div>
      </div>

      {/* Create Post Form */}
      {showCreateForm && (
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
      )}

      {/* Main Content: Detail View or List View */}
      {selectedPost ? (
        <div className="p-5 rounded-2xl bg-slate-900/95 border border-indigo-500/30 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <button
              type="button"
              onClick={() => setSelectedPostId(null)}
              className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 flex items-center gap-1.5"
            >
              <ArrowLeft size={14} />
              <span>게시글 목록으로 돌아가기</span>
            </button>

            <div className="flex items-center gap-2 text-xs">
              <span className={selectedPost.isExample ? 'text-amber-300 font-semibold' : 'text-emerald-300 font-semibold'}>
                {selectedPost.isExample ? '화면 확인용 예시 데이터' : '사용자 생성 데이터'}
              </span>
              <span aria-hidden="true">·</span>
              <span className="text-slate-400">주제: {selectedPost.topic}</span>
            </div>
          </div>

          {/* Author & Title */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <img
                src={assetUrls[selectedPost.authorAvatarAssetId] || DEFAULT_AVATARS.luna}
                alt={selectedPost.authorName}
                referrerPolicy="no-referrer"
                className="w-11 h-11 rounded-xl border border-indigo-400/40 object-cover"
              />
              <div>
                <div className="text-sm font-bold text-white">{selectedPost.authorName}</div>
                <div className="text-[11px] text-slate-400 tabular-nums">
                  {new Date(selectedPost.createdAt).toLocaleString('ko-KR')} · 에셋 참조 ID:{' '}
                  {selectedPost.imageAssetId || '없음'}
                </div>
              </div>
            </div>

            <h3 className="text-lg font-bold text-white">{selectedPost.title}</h3>
            <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-line">{selectedPost.content}</p>

            {/* Attached Image Display Area */}
            {selectedPost.imageAssetId && assetUrls[selectedPost.imageAssetId] && (
              <div className="pt-2">
                <div className="rounded-2xl overflow-hidden border border-indigo-500/30 bg-slate-950 max-w-xl">
                  <img
                    src={assetUrls[selectedPost.imageAssetId]}
                    alt={selectedPost.title}
                    referrerPolicy="no-referrer"
                    className="w-full max-h-80 object-cover"
                  />
                  <div className="px-3.5 py-2 bg-slate-950/90 text-[11px] text-slate-400 font-mono flex items-center justify-between">
                    <span>첨부 이미지 에셋 ID: {selectedPost.imageAssetId}</span>
                    <span>IndexedDB &quot;assets&quot; 스토어 참조</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Comments Section */}
          <div className="pt-4 border-t border-slate-800 space-y-4">
            <h4 className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
              <MessageCircle size={14} />
              <span>댓글 표시 영역 ({selectedComments.length}개)</span>
            </h4>

            <div className="space-y-2.5">
              {selectedComments.length === 0 ? (
                <p className="text-xs text-slate-500 py-3">아직 등록된 댓글이 없습니다.</p>
              ) : (
                selectedComments.map((comm) => (
                  <div
                    key={comm.id}
                    className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 flex items-start gap-3"
                  >
                    <img
                      src={assetUrls[comm.authorAvatarAssetId] || DEFAULT_AVATARS.astro}
                      alt={comm.authorName}
                      referrerPolicy="no-referrer"
                      className="w-8 h-8 rounded-lg border border-indigo-500/30 object-cover shrink-0 mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-white">{comm.authorName}</span>
                        <span className="text-[11px] text-slate-500 tabular-nums">
                          {comm.isExample ? '예시 댓글' : '사용자 데이터'} ·{' '}
                          {new Date(comm.createdAt).toLocaleTimeString('ko-KR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">{comm.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Add Comment Form */}
            <form onSubmit={handleAddComment} className="flex flex-wrap sm:flex-nowrap items-center gap-2 pt-2">
              <select
                value={commentAuthorId}
                onChange={(e) => setCommentAuthorId(e.target.value)}
                className="min-h-[40px] px-3 py-2 rounded-xl bg-slate-950 border border-indigo-500/30 text-xs text-white shrink-0"
              >
                {characters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="댓글 내용을 입력하세요 (사용자 데이터로 저장됨)..."
                className="flex-1 min-h-[40px] px-3.5 py-2 rounded-xl bg-slate-950 border border-indigo-500/30 text-xs text-white focus:outline-none focus:border-pink-500"
              />
              <button
                type="submit"
                className="min-h-[40px] px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white flex items-center gap-1.5 shrink-0"
              >
                <Send size={13} />
                <span>댓글 등록</span>
              </button>
            </form>
          </div>
        </div>
      ) : (
        /* Posts List View */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPosts.length === 0 ? (
            <div className="col-span-full p-8 rounded-2xl bg-slate-900/70 border border-slate-800 text-center space-y-2">
              <p className="text-sm font-medium text-slate-300">표시할 커뮤니티 게시글이 없습니다.</p>
              <p className="text-xs text-slate-500">
                상단의 [수동 게시글 작성] 버튼을 눌러 사용자 데이터를 추가해 보세요.
              </p>
            </div>
          ) : (
            filteredPosts.map((post) => {
              const postComments = commentsByPost[post.id] || [];
              return (
                <div
                  key={post.id}
                  onClick={() => setSelectedPostId(post.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') setSelectedPostId(post.id);
                  }}
                  className="p-5 rounded-2xl bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/50 transition-all cursor-pointer flex flex-col justify-between gap-4 group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={assetUrls[post.authorAvatarAssetId] || DEFAULT_AVATARS.luna}
                          alt={post.authorName}
                          referrerPolicy="no-referrer"
                          className="w-9 h-9 rounded-xl border border-indigo-400/40 object-cover shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="font-bold text-white truncate">{post.authorName}</div>
                          <div className="text-[11px] text-slate-400 truncate">주제: {post.topic}</div>
                        </div>
                      </div>

                      <span
                        className={`text-[11px] font-semibold shrink-0 ${
                          post.isExample ? 'text-amber-300' : 'text-emerald-300'
                        }`}
                      >
                        {post.isExample ? '예시 데이터' : '사용자 데이터'}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-white group-hover:text-pink-300 transition-colors">
                      {post.title}
                    </h3>
                    <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">{post.content}</p>

                    {post.imageAssetId && assetUrls[post.imageAssetId] && (
                      <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 h-40">
                        <img
                          src={assetUrls[post.imageAssetId]}
                          alt={post.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 text-xs text-slate-400 tabular-nums">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <Heart size={13} className="text-pink-400" />
                        {post.likes}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle size={13} className="text-sky-400" />
                        댓글 {postComments.length}
                      </span>
                    </div>
                    <span className="text-indigo-300 font-medium group-hover:underline">상세 및 댓글 보기 →</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
