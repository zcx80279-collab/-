import React from 'react';
import { Sparkles } from 'lucide-react';
import { DEFAULT_AVATARS } from '../core/defaultAssets';
import { RaviAiBridgeState } from '../core/types';

/**
 * Future Expansion Hook for Independent "라비 AI" App Integration (Patch 3 Section 9)
 *
 * IMPORTANT:
 * - In Patch 3, Guide Ravi strictly remains the fixed choice-based system guide bot.
 * - Do NOT force Ravi AI connection or fabricate a fake connected state.
 * - When the independent "라비 AI" app is actually installed and verifies a real bridge
 *   in a future release, this modal can be triggered only with explicit user approval.
 */
export const DEFAULT_RAVI_AI_BRIDGE_STATE: RaviAiBridgeState = {
  installed: false,
  connected: false,
  dismissed: false,
};

interface RaviUpgradePromptModalProps {
  isOpen: boolean;
  onLater: () => void;
  onUpgrade: () => void;
}

export const RaviUpgradePromptModal: React.FC<RaviUpgradePromptModalProps> = ({
  isOpen,
  onLater,
  onUpgrade,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-md p-6 rounded-2xl bg-[#120826] border border-fuchsia-400/60 shadow-[0_0_32px_rgba(232,121,249,0.3)] space-y-5">
        <div className="flex items-center gap-3.5">
          <img
            src={DEFAULT_AVATARS.ravi}
            alt="라비"
            className="w-12 h-12 rounded-full border border-fuchsia-400/70 shadow-[0_0_12px_rgba(232,121,249,0.5)] shrink-0"
          />
          <div>
            <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-cyan-300 mb-0.5">
              <Sparkles size={12} />
              <span>라비 AI 연동 안내</span>
            </div>
            <h3 className="text-base font-bold text-white">라비를 업그레이드하시겠습니까?</h3>
          </div>
        </div>

        <p className="text-sm text-slate-200 leading-relaxed">
          라비 AI와 연결하여 러비러비톡에서도 개인 AI 비서 라비와 대화할 수 있습니다.
        </p>

        <div className="flex items-center justify-end gap-2.5 pt-1">
          <button
            type="button"
            onClick={onLater}
            className="min-h-[40px] px-4 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition-colors cursor-pointer"
          >
            나중에
          </button>
          <button
            type="button"
            onClick={onUpgrade}
            className="min-h-[40px] px-5 py-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-pink-500 hover:from-fuchsia-500 hover:to-pink-400 text-xs font-bold text-white shadow-[0_0_16px_rgba(236,72,153,0.45)] transition-all cursor-pointer"
          >
            업그레이드
          </button>
        </div>
      </div>
    </div>
  );
};
