import { createContext, useContext, useEffect, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';

const files = {
  frame: 'frame_outer', background: 'background_optional', divider: 'divider',
  feed: 'panel_feed', post: 'panel_post', sidebar: 'panel_sidebar',
  popular: 'panel_popular', popularList: 'panel_popular_list', hashtags: 'panel_hashtags',
  menu: 'icon_menu', compose: 'icon_compose', search: 'icon_search', filter: 'icon_filter',
  like: 'icon_like', comment: 'icon_comment', crown: 'icon_crown', popularIcon: 'icon_popular',
  hashtagIcon: 'icon_hashtag', more: 'icon_more', bookmark: 'icon_bookmark',
} as const;

type SkinId = keyof typeof files;
type PanelId = 'feed' | 'post' | 'sidebar' | 'popular' | 'popularList' | 'hashtags';

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
      const fitsFrame = id !== 'frame' || image.naturalWidth * 9 === image.naturalHeight * 16;
      if (active) setDecoded(fitsFrame ? override : undefined);
    }, () => {
      if (active) setDecoded(undefined);
    });
    return () => { active = false; };
  }, [id, override]);
  return override && decoded === override
    ? override
    : `${import.meta.env.BASE_URL}community-skin/${files[id]}.png`;
}

const cssUrl = (url: string) => `url(${JSON.stringify(url)})`;

export function SkinIcon({ id }: { id: SkinId }) {
  const src = useSkinImage(id);
  return <img src={src} alt="" className="community-icon" draggable={false} />;
}

export function SkinPanel({ id, className = '', children }: {
  id: PanelId;
  className?: string;
  children: ReactNode;
}) {
  const src = useSkinImage(id);
  const style = { '--community-panel-image': cssUrl(src) } as CSSProperties;
  return <div className={`community-panel ${className}`} style={style}>{children}</div>;
}

const frameX = [0, 128, 680, 856, 1408, 1536];
const frameY = [0, 118, 744, 864];

export function SkinFrame() {
  const src = useSkinImage('frame');
  const background = useSkinImage('background');
  return (
    <>
      <div className="community-backdrop" style={{ backgroundImage: cssUrl(background) }} aria-hidden="true" />
      <div className="community-frame" aria-hidden="true">
        {frameY.slice(0, -1).map((top, row) => frameX.slice(0, -1).map((left, column) => {
          const width = frameX[column + 1] - left;
          const height = frameY[row + 1] - top;
          return <div key={`${row}-${column}`} style={{
            backgroundImage: cssUrl(src),
            backgroundSize: `${153600 / width}% ${86400 / height}%`,
            backgroundPosition: `${left * 100 / (1536 - width)}% ${top * 100 / (864 - height)}%`,
          }} />;
        }))}
      </div>
    </>
  );
}

export function SkinDivider() {
  return <img src={useSkinImage('divider')} alt="" className="community-divider" />;
}
