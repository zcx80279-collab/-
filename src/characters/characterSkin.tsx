import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';

const skinFiles = ['frame', 'card', 'persona', 'button', 'divider', 'grid', 'corner'] as const;
const asset = (id: string) => `${import.meta.env.BASE_URL}character-skin/${id}.png`;

export function useCharacterSkin(): CSSProperties {
  const [skin, setSkin] = useState<CSSProperties>({});
  useEffect(() => {
    let active = true;
    for (const id of skinFiles) {
      const image = new Image();
      image.src = asset(id);
      image.decode().then(() => {
        if (active) setSkin((previous) => ({ ...previous, [`--character-${id}`]: `url("${image.src}")` }));
      }, () => { /* CSS fallback remains active. */ });
    }
    return () => { active = false; };
  }, []);
  return skin;
}

export function CharacterRabbit() {
  return <img className="character-nav-rabbit" src={asset('rabbit')} alt="" onError={(event) => {
    event.currentTarget.hidden = true;
  }} />;
}
