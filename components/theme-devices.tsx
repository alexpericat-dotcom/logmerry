import { cn } from "@/lib/utils";

const B = "#E2D9C0";
const S = "#B9AE92";
const D = "#8E8670";

/** Rectangle aux coins en escalier (pixel art). */
function Block({ x, y, w, h, fill, c = 2 }: { x: number; y: number; w: number; h: number; fill: string; c?: number }) {
  return (
    <>
      <rect x={x + c} y={y} width={w - 2 * c} height={h} fill={fill} />
      <rect x={x} y={y + c} width={w} height={h - 2 * c} fill={fill} />
    </>
  );
}

/** Mac compact tout-en-un en pixel art (générique, sans logo) : l'écran affiche le portrait. Décoratif. */
export function RetroComputer({ className }: { className?: string }) {
  const imgH = Math.round(48 * 1.449);
  return (
    <svg viewBox="0 0 120 122" shapeRendering="crispEdges" aria-hidden="true" className={cn("block", className)}>
      <defs>
        <pattern id="rc-scan" width="2" height="2" patternUnits="userSpaceOnUse">
          <rect width="2" height="1" fill="#000" opacity=".5" />
        </pattern>
        <clipPath id="rc-clip">
          <rect x="36" y="12" width="48" height="44" />
        </clipPath>
      </defs>
      <Block x={26} y={2} w={68} h={92} fill={B} c={4} />
      <rect x="26" y="88" width="68" height="6" fill={S} />
      <rect x="90" y="8" width="4" height="80" fill={S} />
      <Block x={33} y={9} w={54} h={50} fill="#23232B" c={3} />
      <image href="/images/scene-chemise-bleue.png" x="36" y={12 - Math.round(0.2 * imgH)} width="48" height={imgH} preserveAspectRatio="none" clipPath="url(#rc-clip)" style={{ imageRendering: "pixelated" }} />
      <rect x="36" y="12" width="48" height="44" fill="url(#rc-scan)" opacity=".35" />
      <rect x="40" y="66" width="40" height="4" fill="#2A2A31" />
      <rect x="40" y="71" width="40" height="1" fill={D} />
      <rect x="74" y="78" width="6" height="3" fill="#6BE08A" />
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={34 + i * 4} y="78" width="2" height="6" fill={D} />
      ))}
      <Block x={18} y={94} w={84} h={8} fill={S} c={1} />
      <rect x="30" y="102" width="60" height="4" fill={D} />
      <Block x={26} y={110} w={68} h={8} fill={S} c={1} />
      {Array.from({ length: 13 }, (_, i) => (
        <rect key={i} x={29 + i * 5} y="112" width="4" height="3" fill={B} />
      ))}
    </svg>
  );
}

/** Laptop sombre aux contours néon (turquoise, violet, rose) : l'écran affiche la scène de nuit. Décoratif. */
export function FutureLaptop({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 100" aria-hidden="true" className={cn("block", className)}>
      <defs>
        <linearGradient id="fl-lid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2D2F38" />
          <stop offset="1" stopColor="#14151A" />
        </linearGradient>
        <linearGradient id="fl-base" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3B3E48" />
          <stop offset="1" stopColor="#1B1C22" />
        </linearGradient>
        <linearGradient id="fl-neon" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#46D9C8" />
          <stop offset=".5" stopColor="#A996F0" />
          <stop offset="1" stopColor="#FF8FB3" />
        </linearGradient>
        <linearGradient id="fl-glass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".22" />
          <stop offset=".45" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="fl-under" cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#A996F0" stopOpacity=".7" />
          <stop offset="1" stopColor="#A996F0" stopOpacity="0" />
        </radialGradient>
        <clipPath id="fl-clip">
          <rect x="26" y="10" width="108" height="66" rx="2" />
        </clipPath>
      </defs>
      <ellipse cx="80" cy="96" rx="78" ry="9" fill="url(#fl-under)" />
      <rect x="22" y="6" width="116" height="76" rx="6" fill="url(#fl-lid)" stroke="url(#fl-neon)" strokeWidth="1.6" />
      <image href="/images/scene-nuit.jpg" x="26" y="10" width="108" height="66" preserveAspectRatio="xMidYMid slice" clipPath="url(#fl-clip)" />
      <rect x="26" y="10" width="108" height="66" rx="2" fill="url(#fl-glass)" />
      <rect x="74" y="10" width="12" height="3" rx="1.5" fill="#0A0A0D" />
      <path d="M14 82 H146 L154 91 Q154 93 152 93 H8 Q6 93 6 91 Z" fill="url(#fl-base)" />
      <rect x="66" y="82" width="28" height="2.5" rx="1.2" fill="#000" opacity=".25" />
      <rect x="8" y="92.2" width="144" height="1.4" rx=".7" fill="url(#fl-neon)" />
    </svg>
  );
}
