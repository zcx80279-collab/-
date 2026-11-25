import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import type { Character, CommunityComment, CommunityPost } from '../core/types';
import { storageService } from '../storage/storageService';
import './communityDetail.css';
import { SkinButton, SkinDivider, SkinIcon, SkinPanel } from './CommunitySkin';

interface CommunityPostDetailProps {
  post: CommunityPost;
  comments: CommunityComment[];
  characters: Character[];
  author: (name: string, avatar: string, createdAt: number) => ReactNode;
  attachment: ReactNode;
  tags: ReactNode;
  onBack: () => void;
  onLikeCount: (id: string, likes: number) => void;
  onNewComment: (comment: CommunityComment) => void;
}

export function CommunityPostDetail({
  post, comments, characters, author, attachment, tags, onBack, onLikeCount, onNewComment,
}: CommunityPostDetailProps) {
  const [liked, setLiked] = useState<boolean>();
  const [authorId, setAuthorId] = useState(characters[0]?.id ?? '');
  const [comment, setComment] = useState('');
  const [liking, setLiking] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const commentInput = useRef<HTMLInputElement>(null);
  const focusBack = useCallback((button: HTMLButtonElement | null) => {
    button?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    if (characters.length > 0 && !characters.some((c) => c.id === authorId)) {
      setAuthorId(characters[0].id);
    }
  }, [characters, authorId]);

  useEffect(() => {
    let current = true;
    storageService.getCommunityLike(post.id).then((result) => {
      if (current) setLiked(result);
    }, () => {
      if (current) setError('좋아요 상태를 읽을 수 없습니다.');
    });
    return () => { current = false; };
  }, [post.id]);

  useEffect(() => {
    const viewport = window.visualViewport;
    const shell = commentInput.current?.closest<HTMLElement>('.community-shell');
    if (!viewport || !shell) return;
    let frame = 0;
    const keepInputVisible = () => {
      shell.style.setProperty('--community-detail-viewport', `${viewport.height}px`);
      if (document.activeElement === commentInput.current) {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          const input = commentInput.current;
          const scrollArea = input?.closest<HTMLElement>('.community-detail');
          if (!input || !scrollArea || getComputedStyle(scrollArea).overflowY !== 'auto') return;
          const field = input.getBoundingClientRect();
          const visible = scrollArea.getBoundingClientRect();
          const top = visible.top + 4;
          const bottom = Math.min(visible.bottom, viewport.height) - 4;
          if (field.bottom > bottom) scrollArea.scrollTop += field.bottom - bottom;
          else if (field.top < top) scrollArea.scrollTop -= top - field.top;
        });
      }
    };
    keepInputVisible();
    viewport.addEventListener('resize', keepInputVisible);
    window.addEventListener('resize', keepInputVisible);
    return () => {
      viewport.removeEventListener('resize', keepInputVisible);
      window.removeEventListener('resize', keepInputVisible);
      shell.style.removeProperty('--community-detail-viewport');
      cancelAnimationFrame(frame);
    };
  }, []);

  async function toggleLike() {
    if (liked === undefined || liking) return;
    setLiking(true);
    setError('');
    try {
      const result = await storageService.setCommunityLike(post.id, !liked);
      if (!result) {
        setError('게시글을 찾을 수 없습니다.');
        return;
      }
      setLiked(result.liked);
      onLikeCount(post.id, result.likes);
    } catch {
      setError('좋아요를 저장할 수 없습니다.');
    } finally {
      setLiking(false);
    }
  }

  async function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = comment.trim();
    if (!content || sending) return;
    setSending(true);
    setError('');
    try {
      const character = characters.find((item) => item.id === authorId) ?? characters[0];
      const added = await storageService.addCommunityComment({
        postId: post.id,
        authorId: character?.id ?? 'user-test',
        authorName: character?.name ?? '사용자 캐릭터',
        authorAvatarAssetId: character?.avatarAssetId ?? 'guide-ravi-avatar',
        content,
        isExample: false,
      });
      setComment('');
      onNewComment(added);
    } catch {
      setError('댓글을 저장할 수 없습니다.');
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="community-detail" aria-label="게시글 상세">
      <button type="button" className="community-back" ref={focusBack} onClick={onBack} aria-label="게시글 목록으로 돌아가기">
        <SkinIcon id="back" />
      </button>
      {error && <p className="community-detail-error" role="alert">{error}</p>}
      <div className="community-detail-columns">
        <SkinPanel id="detail" className="community-detail-post">
          <article tabIndex={0} aria-label="게시글 본문">
            {attachment}
            {author(post.authorName, post.authorAvatarAssetId, post.createdAt)}
            <h1>{post.title}</h1>
            <p>{post.content}</p>
            {tags}
            <div className="community-detail-reactions">
              <SkinButton id={liked ? 'likeButtonActive' : 'likeButton'} type="button"
                aria-pressed={Boolean(liked)} aria-label={`좋아요 ${post.likes ?? 0}개`}
                disabled={liked === undefined || liking} onClick={toggleLike}>
                <SkinIcon id={liked ? 'likeActive' : 'like'} />
                <span>{post.likes ?? 0}</span>
              </SkinButton>
              <SkinPanel id="commentInput" className="community-detail-count">
                <SkinIcon id="comment" /><span aria-label={`댓글 ${comments.length}개`}>{comments.length}</span>
              </SkinPanel>
            </div>
          </article>
        </SkinPanel>
        <SkinDivider detail />
        <SkinPanel id="comments" className="community-detail-comments">
          <h2 className="community-meta"><SkinIcon id="comment" />댓글 {comments.length}개</h2>
          <div className="community-comment-list" tabIndex={0} aria-label="댓글 목록">
            {comments.map((item) => <div key={item.id} className="community-comment">
              {author(item.authorName, item.authorAvatarAssetId, item.createdAt)}
              <p>{item.content}</p>
            </div>)}
            {!comments.length && <p>아직 등록된 댓글이 없습니다.</p>}
          </div>
          <form className="community-comment-form" onSubmit={submitComment}>
            <SkinPanel id="profileButton" className="community-detail-profile-choice">
              <SkinIcon id="profileRabbit" />
              <select aria-label="댓글 작성 캐릭터" value={authorId} onChange={(event) => setAuthorId(event.target.value)}>
                {characters.map((character) => <option key={character.id} value={character.id}>{character.name}</option>)}
                {!characters.length && <option value="">사용자 캐릭터</option>}
              </select>
            </SkinPanel>
            <SkinPanel id="commentInput" className="community-detail-input">
              <input ref={commentInput} aria-label="댓글 내용" placeholder="댓글을 입력하세요…" value={comment}
                readOnly={sending} onChange={(event) => setComment(event.target.value)} />
            </SkinPanel>
            <SkinButton id="sendButton" type="submit" aria-label="댓글 등록" disabled={!comment.trim() || sending}>
              <SkinIcon id="send" />
            </SkinButton>
          </form>
        </SkinPanel>
      </div>
    </section>
  );
}
