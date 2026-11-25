import { createContext, useContext, useEffect, useState } from 'react';
import type { ComponentProps, CSSProperties, ReactNode } from 'react';

const files = {
  frame: 'frame_outer', background: 'background_optional', divider: 'divider',
  feed: 'panel_feed', post: 'panel_post', sidebar: 'panel_sidebar',
  popular: 'panel_popular', popularList: 'panel_popular_list', hashtags: 'panel_hashtags',
  menu: 'icon_menu', compose: 'icon_compose', search: 'icon_search', filter: 'icon_filter',
  like: 'icon_like', comment: 'icon_comment', crown: 'icon_crown', popularIcon: 'icon_popular',
  hashtagIcon: 'icon_hashtag', more: 'icon_more', bookmark: 'icon_bookmark',
  mobileFrame: 'frame_mobile', detail: 'panel_detail', comments: 'panel_comments',
  commentInput: 'panel_comment_input', detailDivider: 'divider_detail', back: 'icon_back',
  profileButton: 'button_profile', profileRabbit: 'icon_profile_rabbit',
  sendButton: 'button_send', send: 'icon_send', likeActive: 'icon_like_active',
  likeButton: 'button_like_default', likeButtonActive: 'button_like_active',
  navigationPanel: 'panel_navigation', navigationCharacters: 'icon_navigation_characters',
} as const;

type SkinId = keyof typeof files;
type PanelId = 'feed' | 'post' | 'sidebar' | 'popular' | 'popularList' | 'hashtags' |
  'detail' | 'comments' | 'commentInput' | 'profileButton' | 'navigationPanel';
type ButtonId = 'likeButton' | 'likeButtonActive' | 'sendButton';

// Each slice contains the complete luminous edge strip of the supplied overlay.
const neonOverlays: Partial<Record<PanelId | ButtonId, readonly [number, string]>> = {
  feed: [16, '#18102c9b'],
  post: [24, '#18102c9b'],
  sidebar: [14, '#18102c9b'],
  popular: [22, '#18102c9b'],
  popularList: [12, '#18102c9b'],
  hashtags: [22, '#18102c9b'],
  detail: [20, '#1c1230cd'],
  comments: [18, '#1c1230cd'],
  commentInput: [12, '#28193cdc'],
  likeButton: [12, '#18102cc8'],
  likeButtonActive: [12, '#481141d2'],
};

const defaultSkinImage = (id: SkinId) => `${import.meta.env.BASE_URL}community-skin/${files[id]}.png`;

export type CommunitySkinOverrides = Partial<Record<SkinId, string>>;
const Skin = createContext<CommunitySkinOverrides>({});

export function CommunitySkinProvider({ overrides, children }: {
  overrides?: CommunitySkinOverrides;
  children: ReactNode;
}) {
  return <Skin.Provider value={overrides ?? {}}>{children}</Skin.Provider>;
}

function useSkinImage(id: SkinId) {
  const override = useContext(Skin)[id];
  const [decoded, setDecoded] = useState<string>();
  useEffect(() => {
    if (!override) return;
    let active = true;
    const image = new Image();
    image.src = override;
    image.decode().then(() => {
      const fitsFrame = id === 'frame'
        ? image.naturalWidth * 9 === image.naturalHeight * 16
        : id !== 'mobileFrame' || image.naturalWidth * 757 === image.naturalHeight * 414;
      if (active) setDecoded(fitsFrame ? override : undefined);
    }, () => {
      if (active) setDecoded(undefined);
    });
    return () => { active = false; };
  }, [id, override]);
  return override && decoded === override
    ? override
    : defaultSkinImage(id);
}

const cssUrl = (url: string) => `url(${JSON.stringify(url)})`;

export function SkinIcon({ id }: { id: SkinId }) {
  const src = useSkinImage(id);
  return <img src={src} alt="" className="community-icon" draggable={false} />;
}

function usePanelArt(id: PanelId | ButtonId) {
  const src = useSkinImage(id);
  // User PNGs retain their original fill and slicing behavior.
  const overlay = src === defaultSkinImage(id) ? neonOverlays[id] : undefined;
  const style = {
    '--community-panel-image': cssUrl(src),
    ...(overlay && {
      '--community-neon-slice': overlay[0],
      '--community-neon-width': `${overlay[0]}px`,
      '--community-panel-base': overlay[1],
    }),
  } as CSSProperties;
  return { style, 'data-neon-overlay': overlay ? '' : undefined };
}

export function SkinPanel({ id, className = '', children }: {
  id: PanelId;
  className?: string;
  children: ReactNode;
}) {
  const art = usePanelArt(id);
  return <div className={`community-panel ${className}`} {...art}>{children}</div>;
}

export function SkinButton({ id, className = '', ...props }: ComponentProps<'button'> & { id: ButtonId }) {
  const art = usePanelArt(id);
  return <button {...props} className={`community-panel community-detail-button ${className}`} {...art} />;
}

function FrameTiles({ src, x, y, className = '' }: {
  src: string;
  x: number[];
  y: number[];
  className?: string;
}) {
  const fullWidth = x[x.length - 1];
  const fullHeight = y[y.length - 1];
  return (
    <div className={`community-frame ${className}`} aria-hidden="true">
      {y.slice(0, -1).map((top, row) => x.slice(0, -1).map((left, column) => {
        const width = x[column + 1] - left;
        const height = y[row + 1] - top;
        return <div key={`${row}-${column}`} style={{
          backgroundImage: cssUrl(src),
          backgroundSize: `${fullWidth * 100 / width}% ${fullHeight * 100 / height}%`,
          backgroundPosition: `${left * 100 / (fullWidth - width)}% ${top * 100 / (fullHeight - height)}%`,
        }} />;
      }))}
    </div>
  );
}

const frameX = [0, 128, 680, 856, 1408, 1536];
const frameY = [0, 118, 744, 864];
const mobileFrameX = [0, 42, 150, 264, 372, 414];
const mobileFrameY = [0, 56, 697, 757];

function MobileDetailFrame() {
  const src = useSkinImage('mobileFrame');
  return <FrameTiles src={src} x={mobileFrameX} y={mobileFrameY} className="community-frame-detail-mobile" />;
}

export function SkinFrame({ detail = false }: { detail?: boolean }) {
  const src = useSkinImage('frame');
  const background = useSkinImage('background');
  return (
    <>
      <div className="community-backdrop" style={{ backgroundImage: cssUrl(background) }} aria-hidden="true" />
      <FrameTiles src={src} x={frameX} y={frameY} className={detail ? 'community-frame-detail-wide' : ''} />
      {detail && <MobileDetailFrame />}
    </>
  );
}

export function SkinDivider({ detail = false }: { detail?: boolean }) {
  return <img src={useSkinImage(detail ? 'detailDivider' : 'divider')} alt="" className={detail ? 'community-detail-divider' : 'community-divider'} />;
}
