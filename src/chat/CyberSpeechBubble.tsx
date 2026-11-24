import React from 'react';
import { BubbleCustomization } from '../core/types';

interface CyberSpeechBubbleProps {
  variant: 'opponent' | 'user';
  children: React.ReactNode;
  bubbleCustomization?: BubbleCustomization;
  assetUrls?: Record<string, string>;
  className?: string;
}

/**
 * 9-Slice Cybernetic Speech Bubble
 *
 * - Opponent (left): Cyan neon angular cyber frame with left-pointing tail, diagonal slash notches,
 *   circuit accents, and dark blue interior (#071732).
 * - User (right): Distinct neon pink/magenta hexagonal-bracket cyber frame with top/bottom tech bars
 *   and dark purple interior (#280d3a).
 * - Supports custom PNG replacement via CSS 9-slice (`border-image`) so corners & decorations never
 *   stretch or distort on long or multi-line messages.
 * - Supports independent text color customization for opponent & user messages.
 */
export const CyberSpeechBubble: React.FC<CyberSpeechBubbleProps> = ({
  variant,
  children,
  bubbleCustomization,
  assetUrls = {},
  className = '',
}) => {
  const isOpponent = variant === 'opponent';
  const customAssetId = isOpponent
    ? bubbleCustomization?.opponentBubbleAssetId
    : bubbleCustomization?.userBubbleAssetId;
  const customPngUrl =
    customAssetId && customAssetId !== 'none' ? assetUrls[customAssetId] : undefined;

  const textColor = isOpponent
    ? bubbleCustomization?.opponentTextColor || '#f0f9ff'
    : bubbleCustomization?.userTextColor || '#fdf4ff';

  // Custom 9-slice PNG mode
  if (customPngUrl) {
    return (
      <div
        className={`relative max-w-[85%] sm:max-w-[72%] px-5 py-3.5 text-sm leading-relaxed whitespace-pre-wrap break-words ${className}`}
        style={{
          color: textColor,
          borderStyle: 'solid',
          borderWidth: '18px',
          borderColor: 'transparent',
          borderImageSource: `url("${customPngUrl}")`,
          borderImageSlice: '24 fill',
          borderImageRepeat: 'stretch',
        }}
      >
        {children}
      </div>
    );
  }

  // Default Opponent Bubble: Cyan Neon Angular Frame with Left Tail & Circuit Notches
  if (isOpponent) {
    return (
      <div className={`relative max-w-[85%] sm:max-w-[72%] pl-3 ${className}`}>
        {/* Left-pointing cyber speech tail */}
        <svg
          aria-hidden="true"
          viewBox="0 0 18 28"
          className="pointer-events-none absolute left-0 top-5 w-[15px] h-[24px] z-10 overflow-visible"
        >
          <polygon
            points="17,2 2,14 17,26"
            fill="rgba(7, 24, 56, 0.94)"
            stroke="#22d3ee"
            strokeWidth="2"
            strokeLinejoin="miter"
          />
          {/* Mask inner vertical line where tail joins bubble */}
          <line x1="17" y1="4" x2="17" y2="24" stroke="rgba(7, 24, 56, 0.96)" strokeWidth="3.5" />
        </svg>

        {/* Main Cyan Chamfered Container */}
        <div
          className="cyber-bubble-opponent relative px-5 py-3.5 text-sm leading-relaxed whitespace-pre-wrap break-words"
          style={{ color: textColor }}
        >
          {/* Top-left & Top-right cyan diagonal circuit accents */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -top-[3px] left-5 h-[4px] w-14 bg-gradient-to-r from-cyan-300 via-sky-400 to-transparent shadow-[0_0_8px_#22d3ee]"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -top-[3px] right-10 flex gap-1"
          >
            <span className="inline-block w-3 h-[4px] -skew-x-35 bg-cyan-300 shadow-[0_0_6px_#22d3ee]" />
            <span className="inline-block w-3 h-[4px] -skew-x-35 bg-cyan-300 shadow-[0_0_6px_#22d3ee]" />
            <span className="inline-block w-3 h-[4px] -skew-x-35 bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
          </span>

          {/* Bottom-left & Bottom-right circuit accents */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-[3px] left-8 flex gap-1"
          >
            <span className="inline-block w-3.5 h-[4px] skew-x-35 bg-cyan-400/90" />
            <span className="inline-block w-2.5 h-[4px] skew-x-35 bg-sky-300/80" />
          </span>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-[3px] right-5 h-[3px] w-16 bg-gradient-to-l from-cyan-300 to-transparent shadow-[0_0_8px_#22d3ee]"
          />

          <div className="relative z-10">{children}</div>
        </div>
      </div>
    );
  }

  // Default User Bubble: Distinct Neon Pink/Magenta Hexagonal-Bracket Cyber Frame
  return (
    <div className={`relative max-w-[85%] sm:max-w-[72%] ${className}`}>
      <div
        className="cyber-bubble-user relative px-5 py-3.5 text-sm leading-relaxed whitespace-pre-wrap break-words"
        style={{ color: textColor }}
      >
        {/* Top pink neon tech bar */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-[3px] left-1/2 -translate-x-1/2 h-[4px] w-16 bg-gradient-to-r from-transparent via-fuchsia-300 to-transparent shadow-[0_0_10px_#e879f9]"
        />
        {/* Left & Right hexagonal bracket notches (distinct shape from opponent) */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-[-3px] top-1/2 -translate-y-1/2 w-[4px] h-5 bg-fuchsia-300 shadow-[0_0_8px_#e879f9]"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-[-3px] top-1/2 -translate-y-1/2 w-[4px] h-5 bg-pink-400 shadow-[0_0_8px_#ec4899]"
        />
        {/* Bottom pink circuit bar */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-[3px] left-6 right-6 h-[3px] bg-gradient-to-r from-transparent via-pink-400 to-transparent shadow-[0_0_8px_#ec4899]"
        />

        <div className="relative z-10">{children}</div>
      </div>
    </div>
  );
};
