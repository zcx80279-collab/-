/**
 * 러비러비톡 3차 패치: 1920×1080 전체 화면 PNG 가이드라인 및 자동 영역 분리 엔진
 *
 * - 기준 제작 해상도: 1920 × 1080 px (PNG, 알파 채널 지원)
 * - 가이드라인과 실제 UI 적용 좌표는 100% 일치하도록 단일 상수(LAYOUT_REGIONS_1920x1080)로 관리합니다.
 */

export interface RegionRect {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  description: string;
}

export const CANVAS_WIDTH = 1920;
export const CANVAS_HEIGHT = 1080;

export const LAYOUT_REGIONS_1920x1080: {
  outerFrame: RegionRect;
  topMenuReference: RegionRect;
  friendList: RegionRect;
  chatBackground: RegionRect;
  inputBar: RegionRect;
} = {
  outerFrame: {
    x: 0,
    y: 0,
    width: 1920,
    height: 1080,
    label: '전체 외곽 프레임 (Outer Frame)',
    description: '외곽 네온 테두리, 모서리 회로 장식, 중앙 세로 구분선 (내부 영역은 투명 권장)',
  },
  topMenuReference: {
    x: 920,
    y: 12,
    width: 970,
    height: 76,
    label: '상단 메뉴 영역 참고 (Top Menu Zone)',
    description: '채팅방 · 커뮤니티 · 캐릭터 관리 · 환경설정 버튼 배치 구역',
  },
  friendList: {
    x: 28,
    y: 36,
    width: 572,
    height: 1004,
    label: '왼쪽 친구 목록 영역 (Friend List)',
    description: '검색/설정/새 채팅방 버튼 및 캐릭터 목록 배경 영역',
  },
  chatBackground: {
    x: 620,
    y: 96,
    width: 1268,
    height: 836,
    label: '오른쪽 채팅 배경 영역 (Chat Background)',
    description: '채팅 헤더 및 대화 말풍선 스크롤 영역 배경',
  },
  inputBar: {
    x: 632,
    y: 940,
    width: 1244,
    height: 92,
    label: '하단 메시지 입력창 영역 (Input Bar)',
    description: '첨부(+) 버튼, 메시지 입력창, 전송 버튼 배경 영역',
  },
};

export interface SlicedSkinFiles {
  outerFrameFile: File;
  friendListFile: File;
  chatBackgroundFile: File;
  inputBarFile: File;
  previews: {
    outerFrame: string;
    friendList: string;
    chatBackground: string;
    inputBar: string;
  };
  sourceDimensions: string;
}

/**
 * 1920×1080 투명 배경 제작용 가이드라인 PNG를 생성하여 Data URL로 반환합니다.
 */
export function generateGuidelinePngDataUrl(): string {
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D 컨텍스트를 초기화할 수 없습니다.');

  // 투명 배경 유지
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  const drawGuideBox = (
    rect: RegionRect,
    strokeColor: string,
    fillColor: string,
    dash: number[] = [12, 8]
  ) => {
    ctx.save();
    ctx.fillStyle = fillColor;
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);

    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 3;
    ctx.setLineDash(dash);
    ctx.strokeRect(rect.x + 1.5, rect.y + 1.5, rect.width - 3, rect.height - 3);

    // Label pill
    ctx.setLineDash([]);
    const coordText = `${rect.label}  [${rect.x}, ${rect.y}, ${rect.width}×${rect.height}]`;
    ctx.font = 'bold 20px sans-serif';
    const textWidth = ctx.measureText(coordText).width;
    const pillW = textWidth + 24;
    const pillH = 34;
    const pillX = rect.x + 14;
    const pillY = rect.y + 14;

    ctx.fillStyle = 'rgba(10, 6, 26, 0.88)';
    ctx.fillRect(pillX, pillY, pillW, pillH);
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(pillX, pillY, pillW, pillH);

    ctx.fillStyle = strokeColor;
    ctx.fillText(coordText, pillX + 12, pillY + 24);
    ctx.restore();
  };

  // 1. Outer Frame border guide
  drawGuideBox(
    LAYOUT_REGIONS_1920x1080.outerFrame,
    '#22d3ee',
    'rgba(34, 211, 238, 0.03)',
    [16, 10]
  );

  // 2. Top menu reference zone
  drawGuideBox(
    LAYOUT_REGIONS_1920x1080.topMenuReference,
    '#f472b6',
    'rgba(244, 114, 182, 0.08)',
    [8, 6]
  );

  // 3. Friend list area
  drawGuideBox(
    LAYOUT_REGIONS_1920x1080.friendList,
    '#a855f7',
    'rgba(168, 85, 247, 0.09)',
    [10, 6]
  );

  // 4. Chat background area
  drawGuideBox(
    LAYOUT_REGIONS_1920x1080.chatBackground,
    '#38bdf8',
    'rgba(56, 189, 248, 0.08)',
    [10, 6]
  );

  // 5. Bottom input bar area
  drawGuideBox(
    LAYOUT_REGIONS_1920x1080.inputBar,
    '#ec4899',
    'rgba(236, 72, 153, 0.12)',
    [10, 6]
  );

  // Center watermark note
  ctx.save();
  ctx.font = 'bold 22px sans-serif';
  ctx.fillStyle = 'rgba(248, 250, 252, 0.65)';
  ctx.textAlign = 'center';
  ctx.fillText(
    '러비러비톡 1920×1080 제작 가이드라인 (투명 PNG 저장 권장 · 내부 버튼/텍스트는 UI가 자동 배치됩니다)',
    CANVAS_WIDTH / 2,
    CANVAS_HEIGHT - 14
  );
  ctx.restore();

  return canvas.toDataURL('image/png');
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('PNG 이미지를 불러오는 데 실패했습니다.'));
    };
    img.src = url;
  });
}

function canvasToPngFile(canvas: HTMLCanvasElement, filename: string): Promise<{ file: File; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const dataUrl = canvas.toDataURL('image/png');
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error(`${filename} 변환 실패`));
        return;
      }
      resolve({
        file: new File([blob], filename, { type: 'image/png' }),
        dataUrl,
      });
    }, 'image/png');
  });
}

/**
 * 사용자가 등록한 전체 디자인 PNG(1920×1080 기준)를 정해진 좌표로 자동 분리합니다.
 */
export async function sliceFullDesignPng(file: File): Promise<SlicedSkinFiles> {
  const img = await loadImageFromFile(file);
  const sourceDimensions = `${img.naturalWidth}×${img.naturalHeight}`;

  // Normalize onto 1920×1080 master canvas preserving alpha channel
  const masterCanvas = document.createElement('canvas');
  masterCanvas.width = CANVAS_WIDTH;
  masterCanvas.height = CANVAS_HEIGHT;
  const masterCtx = masterCanvas.getContext('2d');
  if (!masterCtx) throw new Error('Canvas 2D 컨텍스트를 초기화할 수 없습니다.');

  masterCtx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  masterCtx.drawImage(img, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  const cropRegion = async (rect: RegionRect, filename: string) => {
    const c = document.createElement('canvas');
    c.width = rect.width;
    c.height = rect.height;
    const ctx = c.getContext('2d');
    if (!ctx) throw new Error('영역 분리 캔버스 오류');
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
    return canvasToPngFile(c, filename);
  };

  // Outer Frame: keep perimeter & chrome, clear interior of friendList, chatBackground, and inputBar
  // so that layering outerFrame on top never obscures interactive UI or sliced panel backgrounds.
  const outerCanvas = document.createElement('canvas');
  outerCanvas.width = CANVAS_WIDTH;
  outerCanvas.height = CANVAS_HEIGHT;
  const outerCtx = outerCanvas.getContext('2d');
  if (!outerCtx) throw new Error('외곽 프레임 캔버스 오류');
  outerCtx.drawImage(masterCanvas, 0, 0);
  outerCtx.clearRect(
    LAYOUT_REGIONS_1920x1080.friendList.x + 6,
    LAYOUT_REGIONS_1920x1080.friendList.y + 6,
    LAYOUT_REGIONS_1920x1080.friendList.width - 12,
    LAYOUT_REGIONS_1920x1080.friendList.height - 12
  );
  outerCtx.clearRect(
    LAYOUT_REGIONS_1920x1080.chatBackground.x + 4,
    LAYOUT_REGIONS_1920x1080.chatBackground.y + 4,
    LAYOUT_REGIONS_1920x1080.chatBackground.width - 8,
    LAYOUT_REGIONS_1920x1080.chatBackground.height - 8
  );
  outerCtx.clearRect(
    LAYOUT_REGIONS_1920x1080.inputBar.x + 4,
    LAYOUT_REGIONS_1920x1080.inputBar.y + 4,
    LAYOUT_REGIONS_1920x1080.inputBar.width - 8,
    LAYOUT_REGIONS_1920x1080.inputBar.height - 8
  );

  const [outerRes, friendRes, chatRes, inputRes] = await Promise.all([
    canvasToPngFile(outerCanvas, 'sliced-outer-frame.png'),
    cropRegion(LAYOUT_REGIONS_1920x1080.friendList, 'sliced-friend-list.png'),
    cropRegion(LAYOUT_REGIONS_1920x1080.chatBackground, 'sliced-chat-bg.png'),
    cropRegion(LAYOUT_REGIONS_1920x1080.inputBar, 'sliced-input-bar.png'),
  ]);

  return {
    outerFrameFile: outerRes.file,
    friendListFile: friendRes.file,
    chatBackgroundFile: chatRes.file,
    inputBarFile: inputRes.file,
    previews: {
      outerFrame: outerRes.dataUrl,
      friendList: friendRes.dataUrl,
      chatBackground: chatRes.dataUrl,
      inputBar: inputRes.dataUrl,
    },
    sourceDimensions,
  };
}
