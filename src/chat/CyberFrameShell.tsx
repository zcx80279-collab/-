import React from 'react';
import { MessageSquareText, User, Users, Settings } from 'lucide-react';

export type MainMenuTab = 'chat' | 'community' | 'characters' | 'settings' | 'report';

interface CyberFrameShellProps {
  activeTab: MainMenuTab;
  onSelectTab: (tab: MainMenuTab) => void;
  /** Optional custom 1920x1080 sliced outer frame PNG overlay */
  customOuterFrameUrl?: string;
  /** Left sidebar content (Friend List) */
  leftPanel: React.ReactNode;
  /** Right main content (Chat Area) */
  rightPanel: React.ReactNode;
  /** Mobile view mode ('list' | 'room') */
  mobileChatView: 'list' | 'room';
}

/**
 * Cybernetic Outer Frame & Top Menu Shell matching the exact visual identity of Cyber Rabbit OS / Lovy Lovy Talk.
 * - Neon pink (#e879f9 / #ec4899) & cyan (#00f0ff / #22d3ee) angular chamfered outer frame with circuit notches
 * - Center vertical neon divider between left friend list and right chat area
 * - Top-right 4-tab cyber menu dock (채팅방, 커뮤니티, 캐릭터 관리, 환경설정) with pink neon active glow
 * - Responsive scaling without distorting frame geometry
 */
export const CyberFrameShell: React.FC<CyberFrameShellProps> = ({
  activeTab,
  onSelectTab,
  customOuterFrameUrl,
  leftPanel,
  rightPanel,
  mobileChatView,
}) => {
  const menuItems: { id: MainMenuTab; label: string; icon: React.ReactNode }[] = [
    { id: 'chat', label: '채팅방', icon: <MessageSquareText size={18} strokeWidth={2} /> },
    { id: 'community', label: '커뮤니티', icon: <User size={18} strokeWidth={2} /> },
    { id: 'characters', label: '캐릭터 관리', icon: <Users size={18} strokeWidth={2} /> },
    { id: 'settings', label: '환경설정', icon: <Settings size={18} strokeWidth={2} /> },
  ];

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#080515] text-slate-100 select-none sm:select-auto">
      {/* Ambient Cyber Grid & Subtle Corner Glows */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `
            radial-gradient(ellipse at 18% 20%, rgba(232, 121, 249, 0.14) 0%, transparent 48%),
            radial-gradient(ellipse at 85% 82%, rgba(236, 72, 153, 0.12) 0%, transparent 45%),
            radial-gradient(ellipse at 65% 15%, rgba(34, 211, 238, 0.08) 0%, transparent 42%),
            linear-gradient(180deg, #0b061d 0%, #090517 50%, #100722 100%)
          `,
        }}
      />

      {/* Responsive SVG Cybernetic Outer Frame (Zero distortion across screen ratios) */}
      {!customOuterFrameUrl && (
        <svg
          aria-hidden="true"
          viewBox="0 0 1920 1080"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 w-full h-full z-20 hidden md:block"
        >
          <defs>
            <linearGradient id="cyberOuterGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="28%" stopColor="#e879f9" />
              <stop offset="55%" stopColor="#22d3ee" />
              <stop offset="82%" stopColor="#ec4899" />
              <stop offset="100%" stopColor="#22d3ee" />
            </linearGradient>
            <linearGradient id="leftPanelCyanPink" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="48%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>
            <linearGradient id="rightPanelPinkCyan" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="50%" stopColor="#ec4899" />
              <stop offset="100%" stopColor="#f472b6" />
            </linearGradient>
            <filter id="neonGlowFrame" x="-5%" y="-5%" width="110%" height="110%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Outer Perimeter Circuit Line */}
          <path
            d="M 52 24 L 566 24 L 614 78 L 882 78 L 916 18 L 1882 18 L 1904 42 L 1904 1020 L 1862 1054 L 584 1054 L 552 1038 L 44 1038 L 16 1008 L 16 62 Z"
            fill="none"
            stroke="url(#cyberOuterGrad)"
            strokeWidth="3"
            filter="url(#neonGlowFrame)"
            opacity="0.95"
          />

          {/* Inner Left Panel Frame (Friend List Border) */}
          <path
            d="M 56 44 L 556 44 L 584 74 L 584 1002 L 558 1024 L 46 1024 L 30 1006 L 30 70 Z"
            fill="none"
            stroke="url(#leftPanelCyanPink)"
            strokeWidth="2.5"
            opacity="0.9"
          />

          {/* Inner Right Panel Frame (Chat Workspace Border) */}
          <path
            d="M 602 92 L 664 92 L 690 112 L 1866 112 L 1890 138 L 1890 1004 L 1864 1028 L 622 1028 L 602 1008 Z"
            fill="none"
            stroke="url(#rightPanelPinkCyan)"
            strokeWidth="2.5"
            opacity="0.92"
          />

          {/* Top-Left Diagonal Circuit Accent Bars (matching reference image) */}
          <polygon points="442,36 462,36 472,46 452,46" fill="#f472b6" opacity="0.9" />
          <polygon points="474,36 494,36 504,46 484,46" fill="#f472b6" opacity="0.9" />
          <polygon points="506,36 526,36 536,46 516,46" fill="#f472b6" opacity="0.9" />
          <polygon points="538,36 558,36 568,46 548,46" fill="#e879f9" opacity="0.9" />

          {/* Top-Center Cyan Circuit Slashes */}
          <polygon points="622,82 642,82 652,92 632,92" fill="#22d3ee" opacity="0.95" />
          <polygon points="654,82 674,82 684,92 664,92" fill="#22d3ee" opacity="0.95" />
          <polygon points="686,82 706,82 716,92 696,92" fill="#22d3ee" opacity="0.95" />

          {/* Center Vertical Divider Glow Bar */}
          <line
            x1="593"
            y1="84"
            x2="593"
            y2="1014"
            stroke="#e879f9"
            strokeWidth="2"
            strokeDasharray="160 12 40 12"
            opacity="0.7"
          />
          <rect x="580" y="256" width="6" height="58" rx="3" fill="#e879f9" opacity="0.9" />

          {/* Bottom Circuit Accent Notches */}
          <polygon points="88,1034 114,1034 122,1044 96,1044" fill="#f472b6" opacity="0.85" />
          <polygon points="124,1034 150,1034 158,1044 132,1044" fill="#f472b6" opacity="0.85" />
          <polygon points="160,1034 186,1034 194,1044 168,1044" fill="#f472b6" opacity="0.85" />

          <rect x="1280" y="1046" width="300" height="8" rx="2" fill="#ec4899" opacity="0.9" />
          <polygon points="1690,1044 1760,1044 1775,1032 1830,1032 1830,1048 1690,1048" fill="#22d3ee" opacity="0.85" />

          {/* Corner Brackets */}
          <path d="M 16 140 L 16 62 L 52 24 L 150 24" fill="none" stroke="#22d3ee" strokeWidth="4.5" />
          <path d="M 1800 1054 L 1862 1054 L 1904 1020 L 1904 940" fill="none" stroke="#22d3ee" strokeWidth="4.5" />
        </svg>
      )}

      {/* Optional User-Uploaded Custom 1920x1080 Outer Frame Overlay */}
      {customOuterFrameUrl && (
        <img
          src={customOuterFrameUrl}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 w-full h-full object-fill z-20 hidden md:block"
        />
      )}

      {/* Top-Right 4-Tab Cyber Menu Dock (Desktop & Tablet) */}
      <nav
        aria-label="주요 메뉴"
        className="hidden md:flex items-stretch gap-1.5 absolute top-[1.6%] right-[1.6%] z-30 h-[7.2%] min-h-[46px] max-h-[68px] w-[50.8%] min-w-[520px] max-w-[976px]"
      >
        {menuItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`cyber-top-tab group relative flex-1 flex items-center justify-center gap-2 px-3 text-xs lg:text-sm font-bold tracking-tight transition-all duration-200 whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'cyber-top-tab-active text-white'
                  : 'cyber-top-tab-inactive text-slate-200 hover:text-white'
              }`}
            >
              <span
                className={`transition-transform duration-150 ${
                  isActive ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]' : 'text-slate-300 group-hover:text-pink-300'
                }`}
              >
                {item.icon}
              </span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Main Split Workspace Container aligned to the 1920x1080 exact regions */}
      <div className="relative z-10 h-full w-full flex md:pt-[4.3%] md:pb-[4.8%] md:pl-[1.7%] md:pr-[1.65%] gap-0 md:gap-[1.05%]">
        {/* Left Region: Friend List Panel (x: 32..582 -> 28.65% of 1920, ~30% of inner container) */}
        <aside
          className={`${
            mobileChatView === 'list' ? 'flex w-full' : 'hidden md:flex'
          } md:w-[30.1%] md:min-w-[270px] md:max-w-[460px] h-full flex-col min-h-0 overflow-hidden md:rounded-2xl`}
        >
          {leftPanel}
        </aside>

        {/* Right Region: Chat Area (x: 602..1888 -> below top menu dock on desktop) */}
        <main
          className={`${
            mobileChatView === 'list' ? 'hidden md:flex' : 'flex w-full'
          } flex-1 h-full flex-col min-w-0 min-h-0 overflow-hidden md:mt-[6.1%] md:h-[calc(100%-6.1%)] md:rounded-2xl`}
        >
          {rightPanel}
        </main>
      </div>
    </div>
  );
};
