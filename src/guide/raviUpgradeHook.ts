/**
 * 안내 라비(Guide Ravi) 향후 독립 앱 '라비 AI' 연동 확장 구조
 *
 * 현재 패치(3차)에서는 안내 라비를 선택지 전용 고정 안내 봇으로 유지하며,
 * 실제 라비 AI 연동을 강제하거나 가상의 연결 성공 상태를 만들지 않습니다.
 * 향후 독립 앱 '라비 AI'가 설치되고 정상 브릿지 연동이 감지될 경우에만
 * 사용자 승인 팝업("라비를 업그레이드하시겠습니까?")을 표시할 수 있도록 확장 인터페이스를 제공합니다.
 */

export interface RaviAiBridgeStatus {
  isRaviAiInstalled: boolean;
  isBridgeConnected: boolean;
  userApprovedUpgrade: boolean;
  bridgeVersion?: string;
}

export const RAVI_UPGRADE_PROMPT_SPEC = {
  title: '라비를 업그레이드하시겠습니까?',
  message: '라비 AI와 연결하여 러비러비톡에서도 개인 AI 비서 라비와 대화할 수 있습니다.',
  laterLabel: '나중에',
  upgradeLabel: '업그레이드',
} as const;

export function detectExternalRaviAiBridge(): RaviAiBridgeStatus {
  // 실제 외부 라비 AI 브릿지가 전역에 주입된 경우에만 감지 (가상 성공 상태 생성 금지)
  const win = typeof window !== 'undefined' ? (window as unknown as Record<string, unknown>) : null;
  const bridge = win?.__RAVI_AI_BRIDGE__ as { connected?: boolean; version?: string } | undefined;

  if (bridge && bridge.connected === true) {
    return {
      isRaviAiInstalled: true,
      isBridgeConnected: true,
      userApprovedUpgrade: false,
      bridgeVersion: bridge.version,
    };
  }

  return {
    isRaviAiInstalled: false,
    isBridgeConnected: false,
    userApprovedUpgrade: false,
  };
}
