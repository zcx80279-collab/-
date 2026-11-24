/**
 * Lovy Lovy Talk Patch 3 - 1920x1080 Full-Screen PNG Customization & Auto-Slicing System
 *
 * Single Source of Truth for both:
 *  1) Downloadable 1920x1080 PNG 제작용 가이드라인 (Guideline PNG)
 *  2) Automatic 4-region slicing when a user uploads a finished 1920x1080 PNG
 *
 * Every coordinate strictly matches the redesigned main chat UI layout (16:9 reference).
 */

export const SKIN_CANVAS_WIDTH = 1920;
export const SKIN_CANVAS_HEIGHT = 1080;

export interface SkinRegionRect {
  key: 'outerFrame' | 'friendList' | 'chatBackground' | 'inputBar';
  label: string;
  description: string;
  x: number;
  y: number;
  width: number;
  height: number;
  guideColor: string;
}

/**
 * Exact 1920x1080px Layout Coordinates (Unified between Guideline PNG & Runtime Slicer)
 */
export const SKIN_LAYOUT_REGIONS: Record<SkinRegionRect['key'], SkinRegionRect> = {
  outerFrame: {
    key: 'outerFrame',
    label: '전체 외곽 프레임',
    description: '1920×1080 전체 외곽 네온 프레임 · 중앙 세로 구분선(x=582~602) · 상단 메뉴 도크',
    x: 0,
    y: 0,
    width: 1920,
    height: 1080,
    guideColor: '#22d3ee',
  },
  friendList: {
    key: 'friendList',
    label: '왼쪽 친구 목록 영역',
    description: '캐릭터 검색/설정/새 채팅방 버튼 및 캐릭터 카드 스크롤 영역',
    x: 32,
    y: 48,
    width: 550,
    height: 976,
    guideColor: '#e879f9',
  },
  chatBackground: {
    key: 'chatBackground',
    label: '오른쪽 채팅 배경 영역',
    description: '채팅방 상단 헤더 및 대화 메시지 표시 배경 영역 (말풍선은 별도 관리)',
    x: 602,
    y: 116,
    width: 1286,
    height: 804,
    guideColor: '#38bdf8',
  },
  inputBar: {
    key: 'inputBar',
    label: '하단 메시지 입력창 영역',
    description: '첨부(+) 버튼 · 메시지 입력란 · 전송 버튼 배경 영역',
    x: 624,
    y: 920,
    width: 1244,
    height: 76,
    guideColor: '#f472b6',
  },
};

export const SKIN_TOP_MENU_SAFE_ZONE = {
  x: 912,
  y: 16,
  width: 976,
  height: 84,
};

export interface SlicedSkinPreviewResult {
  sourceDataUrl: string;
  sourceWidth: number;
  sourceHeight: number;
  outerFrameDataUrl: string;
  friendListDataUrl: string;
  chatBgDataUrl: string;
  inputBarDataUrl: string;
}

/**
 * Generates a 1920x1080 PNG Guideline with transparent interior and crisp region boundaries,
 * exact coordinates, safe zones, and Korean labels for external illustration tools.
 */
export function generateGuidelinePngDataUrl(): string {
  const canvas = document.createElement('canvas');
  canvas.width = SKIN_CANVAS_WIDTH;
  canvas.height = SKIN_CANVAS_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D 컨텍스트를 초기화할 수 없습니다.');

  // Subtle dark-translucent base grid so designers can overlay on their art layer
  ctx.clearRect(0, 0, SKIN_CANVAS_WIDTH, SKIN_CANVAS_HEIGHT);
  ctx.fillStyle = 'rgba(8, 5, 21, 0.35)';
  ctx.fillRect(0, 0, SKIN_CANVAS_WIDTH, SKIN_CANVAS_HEIGHT);

  // 40px subtle reference grid
  ctx.strokeStyle = 'rgba(139, 92, 246, 0.14)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= SKIN_CANVAS_WIDTH; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, SKIN_CANVAS_HEIGHT);
    ctx.stroke();
  }
  for (let y = 0; y <= SKIN_CANVAS_HEIGHT; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(SKIN_CANVAS_WIDTH, y);
    ctx.stroke();
  }

  // Draw outer frame border guide
  ctx.strokeStyle = '#22d3ee';
  ctx.lineWidth = 4;
  ctx.strokeRect(16, 16, SKIN_CANVAS_WIDTH - 32, SKIN_CANVAS_HEIGHT - 32);

  // Center vertical divider guide (x=582..602)
  ctx.fillStyle = 'rgba(232, 121, 249, 0.22)';
  ctx.fillRect(582, 48, 20, 976);
  ctx.strokeStyle = '#e879f9';
  ctx.lineWidth = 2;
  ctx.strokeRect(582, 48, 20, 976);

  // Top menu dock safe zone
  ctx.fillStyle = 'rgba(244, 114, 182, 0.14)';
  ctx.fillRect(
    SKIN_TOP_MENU_SAFE_ZONE.x,
    SKIN_TOP_MENU_SAFE_ZONE.y,
    SKIN_TOP_MENU_SAFE_ZONE.width,
    SKIN_TOP_MENU_SAFE_ZONE.height
  );
  ctx.strokeStyle = '#f472b6';
  ctx.setLineDash([8, 6]);
  ctx.lineWidth = 2;
  ctx.strokeRect(
    SKIN_TOP_MENU_SAFE_ZONE.x,
    SKIN_TOP_MENU_SAFE_ZONE.y,
    SKIN_TOP_MENU_SAFE_ZONE.width,
    SKIN_TOP_MENU_SAFE_ZONE.height
  );
  ctx.setLineDash([]);
  ctx.fillStyle = '#fbcfe8';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText(
    '상단 메뉴 영역 (채팅방 · 커뮤니티 · 캐릭터 관리 · 환경설정) [x:912, y:16, 976×84]',
    SKIN_TOP_MENU_SAFE_ZONE.x + 20,
    SKIN_TOP_MENU_SAFE_ZONE.y + 48
  );

  // Draw the 3 inner sliced regions
  const innerRegions: SkinRegionRect[] = [
    SKIN_LAYOUT_REGIONS.friendList,
    SKIN_LAYOUT_REGIONS.chatBackground,
    SKIN_LAYOUT_REGIONS.inputBar,
  ];

  for (const reg of innerRegions) {
    ctx.fillStyle = `${reg.guideColor}18`;
    ctx.fillRect(reg.x, reg.y, reg.width, reg.height);

    ctx.strokeStyle = reg.guideColor;
    ctx.lineWidth = 3;
    ctx.setLineDash([12, 8]);
    ctx.strokeRect(reg.x, reg.y, reg.width, reg.height);
    ctx.setLineDash([]);

    // Corner ticks
    const tick = 18;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(reg.x, reg.y + tick);
    ctx.lineTo(reg.x, reg.y);
    ctx.lineTo(reg.x + tick, reg.y);
    ctx.moveTo(reg.x + reg.width - tick, reg.y);
    ctx.lineTo(reg.x + reg.width, reg.y);
    ctx.lineTo(reg.x + reg.width, reg.y + tick);
    ctx.moveTo(reg.x, reg.y + reg.height - tick);
    ctx.lineTo(reg.x, reg.y + reg.height);
    ctx.lineTo(reg.x + tick, reg.y + reg.height);
    ctx.moveTo(reg.x + reg.width - tick, reg.y + reg.height);
    ctx.lineTo(reg.x + reg.width, reg.y + reg.height);
    ctx.lineTo(reg.x + reg.width, reg.y + reg.height - tick);
    ctx.stroke();

    // Label
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px sans-serif';
    const textY = reg.height < 100 ? reg.y + 46 : reg.y + 48;
    ctx.fillText(`${reg.label}`, reg.x + 24, textY);

    ctx.fillStyle = reg.guideColor;
    ctx.font = 'bold 20px monospace';
    const coordText = `x:${reg.x}, y:${reg.y}, w:${reg.width}, h:${reg.height}`;
    if (reg.height < 100) {
      ctx.fillText(coordText, reg.x + 340, textY);
    } else {
      ctx.fillText(coordText, reg.x + 24, textY + 34);
      ctx.fillStyle = 'rgba(226, 232, 240, 0.85)';
      ctx.font = '18px sans-serif';
      ctx.fillText(reg.description, reg.x + 24, textY + 66);
    }
  }

  // Header metadata note at top-left
  ctx.fillStyle = '#e0f2fe';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText(
    '러비러비톡 메인 채팅 화면 제작 가이드라인 (1920×1080px · PNG 투명 알파 지원)',
    40,
    38
  );

  return canvas.toDataURL('image/png');
}

export function downloadGuidelinePng(): void {
  const dataUrl = generateGuidelinePngDataUrl();
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = 'lovy-lovy-talk-skin-guideline-1920x1080.png';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('PNG 이미지를 불러올 수 없습니다. 올바른 이미지 파일인지 확인해 주세요.'));
    img.src = src;
  });
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('파일을 읽는 중 오류가 발생했습니다.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Automatically slices a single user-uploaded full-screen PNG (normalized to 1920x1080)
 * into the 4 independent visual layers defined in SKIN_LAYOUT_REGIONS:
 *  1. outerFrameDataUrl (1920x1080 with inner interactive regions cleared to alpha=0)
 *  2. friendListDataUrl (550x976)
 *  3. chatBgDataUrl (1286x804)
 *  4. inputBarDataUrl (1244x76)
 */
export async function sliceFullSkinPngFile(file: File): Promise<SlicedSkinPreviewResult> {
  const sourceDataUrl = await readFileAsDataUrl(file);
  const img = await loadImageElement(sourceDataUrl);

  // Normalize onto a 1920x1080 working canvas preserving alpha channel
  const masterCanvas = document.createElement('canvas');
  masterCanvas.width = SKIN_CANVAS_WIDTH;
  masterCanvas.height = SKIN_CANVAS_HEIGHT;
  const mCtx = masterCanvas.getContext('2d');
  if (!mCtx) throw new Error('Canvas 2D 초기화 실패');

  mCtx.clearRect(0, 0, SKIN_CANVAS_WIDTH, SKIN_CANVAS_HEIGHT);
  mCtx.drawImage(img, 0, 0, SKIN_CANVAS_WIDTH, SKIN_CANVAS_HEIGHT);

  const cropRegion = (rect: SkinRegionRect): string => {
    const c = document.createElement('canvas');
    c.width = rect.width;
    c.height = rect.height;
    const ctx = c.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D 초기화 실패');
    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.drawImage(
      masterCanvas,
      rect.x,
      rect.y,
      rect.width,
      rect.height,
      0,
      0,
      rect.width,
      rect.height
    );
    return c.toDataURL('image/png');
  };

  const friendListDataUrl = cropRegion(SKIN_LAYOUT_REGIONS.friendList);
  const chatBgDataUrl = cropRegion(SKIN_LAYOUT_REGIONS.chatBackground);
  const inputBarDataUrl = cropRegion(SKIN_LAYOUT_REGIONS.inputBar);

  // Build pure outerFrame layer by punching out the 3 inner regions so UI controls remain unobstructed
  const frameCanvas = document.createElement('canvas');
  frameCanvas.width = SKIN_CANVAS_WIDTH;
  frameCanvas.height = SKIN_CANVAS_HEIGHT;
  const fCtx = frameCanvas.getContext('2d');
  if (!fCtx) throw new Error('Canvas 2D 초기화 실패');
  fCtx.drawImage(masterCanvas, 0, 0);
  fCtx.clearRect(
    SKIN_LAYOUT_REGIONS.friendList.x,
    SKIN_LAYOUT_REGIONS.friendList.y,
    SKIN_LAYOUT_REGIONS.friendList.width,
    SKIN_LAYOUT_REGIONS.friendList.height
  );
  fCtx.clearRect(
    SKIN_LAYOUT_REGIONS.chatBackground.x,
    SKIN_LAYOUT_REGIONS.chatBackground.y,
    SKIN_LAYOUT_REGIONS.chatBackground.width,
    SKIN_LAYOUT_REGIONS.chatBackground.height
  );
  fCtx.clearRect(
    SKIN_LAYOUT_REGIONS.inputBar.x,
    SKIN_LAYOUT_REGIONS.inputBar.y,
    SKIN_LAYOUT_REGIONS.inputBar.width,
    SKIN_LAYOUT_REGIONS.inputBar.height
  );
  const outerFrameDataUrl = frameCanvas.toDataURL('image/png');

  return {
    sourceDataUrl,
    sourceWidth: img.naturalWidth,
    sourceHeight: img.naturalHeight,
    outerFrameDataUrl,
    friendListDataUrl,
    chatBgDataUrl,
    inputBarDataUrl,
  };
}
