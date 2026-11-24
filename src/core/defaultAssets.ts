// SVG Data URLs for high-precision crisp vector/PNG-compatible default assets (zero external network dependency)

function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg.trim())}`;
}

/**
 * Cyber Rabbit OS Official Mascot (Neon outline bunny with upright ears, X eyes, w mouth)
 * Used ONLY in:
 * 1) Guide Ravi profile avatar
 * 2) Center translucent watermark of the main chat screen
 */
export const CYBER_RABBIT_WATERMARK_SVG = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 280" fill="none">
    <defs>
      <filter id="rabbitGlow" x="-25%" y="-25%" width="150%" height="150%">
        <feGaussianBlur stdDeviation="4.5" result="blur"/>
        <feMerge>
          <feMergeNode in="blur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    <g filter="url(#rabbitGlow)" stroke="#e879f9" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round">
      <!-- Bunny silhouette: left ear, dip, right ear, rounded head -->
      <path d="M 88 112
               C 74 72, 68 34, 86 24
               C 104 14, 114 58, 114 104
               C 118 103, 122 103, 126 104
               C 126 58, 136 14, 154 24
               C 172 34, 166 72, 152 112
               C 182 126, 198 156, 196 190
               C 194 232, 162 256, 120 256
               C 78 256, 46 232, 44 190
               C 42 156, 58 126, 88 112 Z" />
      <!-- Left X eye -->
      <path d="M 74 176 L 94 196 M 94 176 L 74 196" stroke-width="6.5"/>
      <!-- Right X eye -->
      <path d="M 146 176 L 166 196 M 166 176 L 146 196" stroke-width="6.5"/>
      <!-- Cute w / smile mouth -->
      <path d="M 111 212 Q 120 222 129 212" stroke-width="6"/>
    </g>
  </svg>
`;

export const DEFAULT_AVATARS = {
  ravi: svgToDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">
      <defs>
        <radialGradient id="raviBg" cx="50%" cy="50%" r="65%">
          <stop offset="0%" stop-color="#3b0764"/>
          <stop offset="65%" stop-color="#1a0633"/>
          <stop offset="100%" stop-color="#0d041d"/>
        </radialGradient>
        <filter id="raviNeon" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3.2" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <rect width="160" height="160" rx="80" fill="url(#raviBg)"/>
      <circle cx="80" cy="80" r="74" fill="none" stroke="#e879f9" stroke-opacity="0.7" stroke-width="3"/>
      <g filter="url(#raviNeon)" transform="translate(20, 12) scale(0.5)">
        <path d="M 88 112
                 C 74 72, 68 34, 86 24
                 C 104 14, 114 58, 114 104
                 C 118 103, 122 103, 126 104
                 C 126 58, 136 14, 154 24
                 C 172 34, 166 72, 152 112
                 C 182 126, 198 156, 196 190
                 C 194 232, 162 256, 120 256
                 C 78 256, 46 232, 44 190
                 C 42 156, 58 126, 88 112 Z"
              fill="#14072b" stroke="#f5d0fe" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M 74 176 L 94 196 M 94 176 L 74 196" stroke="#f5d0fe" stroke-width="8" stroke-linecap="round"/>
        <path d="M 146 176 L 166 196 M 166 176 L 146 196" stroke="#f5d0fe" stroke-width="8" stroke-linecap="round"/>
        <path d="M 111 212 Q 120 222 129 212" fill="none" stroke="#f5d0fe" stroke-width="7.5" stroke-linecap="round"/>
      </g>
    </svg>
  `),
  luna: svgToDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">
      <defs>
        <linearGradient id="lunaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#1e1b4b"/>
          <stop offset="100%" stop-color="#be185d"/>
        </linearGradient>
      </defs>
      <rect width="160" height="160" rx="36" fill="url(#lunaGrad)"/>
      <!-- Cyber Cat Ears -->
      <polygon points="36,78 44,32 74,64" fill="#0f172a" stroke="#f472b6" stroke-width="3"/>
      <polygon points="124,78 116,32 86,64" fill="#0f172a" stroke="#38bdf8" stroke-width="3"/>
      <circle cx="80" cy="94" r="42" fill="#0f172a" stroke="#f472b6" stroke-width="3"/>
      <!-- Cat Eyes -->
      <ellipse cx="64" cy="90" rx="7" ry="10" fill="#f472b6"/>
      <ellipse cx="96" cy="90" rx="7" ry="10" fill="#38bdf8"/>
      <path d="M73 105 Q80 111 87 105" fill="none" stroke="#fbcfe8" stroke-width="2.5" stroke-linecap="round"/>
    </svg>
  `),
  astro: svgToDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">
      <defs>
        <linearGradient id="astroGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#090d16"/>
          <stop offset="50%" stop-color="#1e3a8a"/>
          <stop offset="100%" stop-color="#0284c7"/>
        </linearGradient>
      </defs>
      <rect width="160" height="160" rx="36" fill="url(#astroGrad)"/>
      <!-- Space Helmet -->
      <circle cx="80" cy="84" r="48" fill="#0f172a" stroke="#38bdf8" stroke-width="4"/>
      <rect x="46" y="62" width="68" height="44" rx="20" fill="#1e293b" stroke="#7dd3fc" stroke-width="2.5"/>
      <!-- Visor reflection -->
      <path d="M56 72 Q80 65 104 72" fill="none" stroke="#bae6fd" stroke-width="3" stroke-linecap="round" stroke-opacity="0.7"/>
      <circle cx="66" cy="86" r="5" fill="#38bdf8"/>
      <circle cx="94" cy="86" r="5" fill="#38bdf8"/>
    </svg>
  `),
};

export const DEFAULT_FRAMES = {
  cyberIndigo: svgToDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" width="300" height="300">
      <rect x="4" y="4" width="292" height="292" rx="18" fill="none" stroke="#6366f1" stroke-width="3" stroke-opacity="0.7"/>
      <rect x="10" y="10" width="280" height="280" rx="12" fill="none" stroke="#ec4899" stroke-width="1.5" stroke-dasharray="18 8" stroke-opacity="0.5"/>
      <!-- Corner cyber brackets -->
      <path d="M4 36 L4 14 Q4 4 14 4 L36 4" fill="none" stroke="#38bdf8" stroke-width="5" stroke-linecap="round"/>
      <path d="M264 4 L286 4 Q296 4 296 14 L296 36" fill="none" stroke="#f472b6" stroke-width="5" stroke-linecap="round"/>
      <path d="M4 264 L4 286 Q4 296 14 296 L36 296" fill="none" stroke="#f472b6" stroke-width="5" stroke-linecap="round"/>
      <path d="M264 296 L286 296 Q296 296 296 286 L296 264" fill="none" stroke="#38bdf8" stroke-width="5" stroke-linecap="round"/>
    </svg>
  `),
  neonPinkGrid: svgToDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" width="300" height="300">
      <rect x="3" y="3" width="294" height="294" rx="20" fill="none" stroke="#ec4899" stroke-width="4" stroke-opacity="0.8"/>
      <rect x="12" y="12" width="276" height="276" rx="14" fill="none" stroke="#a855f7" stroke-width="2" stroke-opacity="0.5"/>
      <circle cx="20" cy="20" r="5" fill="#f472b6"/>
      <circle cx="280" cy="20" r="5" fill="#f472b6"/>
      <circle cx="20" cy="280" r="5" fill="#f472b6"/>
      <circle cx="280" cy="280" r="5" fill="#f472b6"/>
    </svg>
  `),
};

export const DEFAULT_CHAT_BACKGROUNDS = {
  darkNight: svgToDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
      <defs>
        <radialGradient id="bgGrad1" cx="50%" cy="20%" r="80%">
          <stop offset="0%" stop-color="#1e1b4b"/>
          <stop offset="55%" stop-color="#0f172a"/>
          <stop offset="100%" stop-color="#020617"/>
        </radialGradient>
        <pattern id="cyberGrid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#6366f1" stroke-width="0.6" stroke-opacity="0.14"/>
        </pattern>
      </defs>
      <rect width="800" height="600" fill="url(#bgGrad1)"/>
      <rect width="800" height="600" fill="url(#cyberGrid)"/>
      <circle cx="650" cy="120" r="90" fill="#ec4899" fill-opacity="0.08"/>
      <circle cx="160" cy="460" r="130" fill="#38bdf8" fill-opacity="0.07"/>
    </svg>
  `),
  violetMatrix: svgToDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
      <defs>
        <linearGradient id="bgGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#2e1065"/>
          <stop offset="50%" stop-color="#1e1b4b"/>
          <stop offset="100%" stop-color="#090d16"/>
        </linearGradient>
        <pattern id="hexDots" width="30" height="30" patternUnits="userSpaceOnUse">
          <circle cx="15" cy="15" r="1.2" fill="#f472b6" fill-opacity="0.22"/>
        </pattern>
      </defs>
      <rect width="800" height="600" fill="url(#bgGrad2)"/>
      <rect width="800" height="600" fill="url(#hexDots)"/>
    </svg>
  `),
};

export const DEFAULT_COMMUNITY_IMAGES = {
  neonStreet: svgToDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" width="640" height="360">
      <defs>
        <linearGradient id="sky" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#090d16"/>
          <stop offset="60%" stop-color="#1e1b4b"/>
          <stop offset="100%" stop-color="#4c1d95"/>
        </linearGradient>
      </defs>
      <rect width="640" height="360" fill="url(#sky)"/>
      <circle cx="320" cy="210" r="75" fill="#ec4899" fill-opacity="0.75"/>
      <rect x="40" y="140" width="55" height="160" fill="#0f172a" stroke="#38bdf8" stroke-width="1.5"/>
      <rect x="110" y="110" width="70" height="190" fill="#0f172a" stroke="#a855f7" stroke-width="1.5"/>
      <rect x="460" y="125" width="65" height="175" fill="#0f172a" stroke="#f472b6" stroke-width="1.5"/>
      <rect x="540" y="155" width="50" height="145" fill="#0f172a" stroke="#38bdf8" stroke-width="1.5"/>
      <path d="M0 300 L640 300" stroke="#38bdf8" stroke-width="2"/>
      <path d="M320 300 L120 360 M320 300 L240 360 M320 300 L400 360 M320 300 L520 360" stroke="#ec4899" stroke-width="1.5" stroke-opacity="0.6"/>
    </svg>
  `),
  spaceLounge: svgToDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" width="640" height="360">
      <rect width="640" height="360" fill="#060913"/>
      <circle cx="140" cy="95" r="2" fill="#ffffff"/>
      <circle cx="280" cy="60" r="1.5" fill="#38bdf8"/>
      <circle cx="480" cy="80" r="2.5" fill="#f472b6"/>
      <circle cx="540" cy="160" r="1.5" fill="#ffffff"/>
      <circle cx="320" cy="175" r="64" fill="#1e3a8a" stroke="#38bdf8" stroke-width="2"/>
      <ellipse cx="320" cy="175" rx="115" ry="26" fill="none" stroke="#ec4899" stroke-width="3" stroke-opacity="0.7" transform="rotate(-14 320 175)"/>
    </svg>
  `),
  cyberCafe: svgToDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" width="640" height="360">
      <rect width="640" height="360" fill="#131129"/>
      <rect x="70" y="50" width="500" height="260" rx="20" fill="#1e1b4b" stroke="#a855f7" stroke-width="3"/>
      <text x="320" y="145" text-anchor="middle" fill="#f472b6" font-family="sans-serif" font-size="28" font-weight="bold">LOVY CYBER CAFE</text>
      <text x="320" y="185" text-anchor="middle" fill="#38bdf8" font-family="monospace" font-size="16">NEON ESPRESSO &amp; MEMORY CHIP</text>
      <line x1="180" y1="215" x2="460" y2="215" stroke="#6366f1" stroke-width="2"/>
    </svg>
  `),
};
