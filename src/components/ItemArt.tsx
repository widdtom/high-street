/**
 * Hand-drawn inline SVG for each bakery item. No external images anywhere in
 * this app, so every picture is generated in code.
 */
interface ItemArtProps {
  id: string;
  size?: number;
  className?: string;
}

function Roll({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="presentation">
      <ellipse cx="50" cy="58" rx="34" ry="26" fill="#c98b4b" />
      <ellipse cx="50" cy="52" rx="34" ry="24" fill="#e0a765" />
      <path d="M28 46 Q50 34 72 46" stroke="#a86c33" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M34 60 Q50 52 66 60" stroke="#b87b3f" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function BananaLoaf({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="presentation">
      <rect x="20" y="42" width="60" height="38" rx="6" fill="#b5773c" />
      <path d="M20 48 Q50 24 80 48 L80 52 L20 52 Z" fill="#d8a05c" />
      <path d="M34 36 Q50 26 66 36" stroke="#8c5828" strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle cx="38" cy="62" r="3.5" fill="#7a4a22" />
      <circle cx="56" cy="68" r="3" fill="#7a4a22" />
      <circle cx="66" cy="58" r="3" fill="#7a4a22" />
    </svg>
  );
}

function IcedBun({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="presentation">
      <ellipse cx="50" cy="62" rx="33" ry="24" fill="#deA45f" />
      <path d="M17 58 Q22 34 50 34 Q78 34 83 58 Q66 50 50 54 Q34 58 17 58 Z" fill="#f6c9dd" />
      <circle cx="38" cy="46" r="2.5" fill="#e35d8e" />
      <circle cx="52" cy="42" r="2.5" fill="#6cc0e0" />
      <circle cx="64" cy="48" r="2.5" fill="#f2d349" />
    </svg>
  );
}

function Loaf({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="presentation">
      <path d="M16 78 L16 50 Q16 30 50 30 Q84 30 84 50 L84 78 Z" fill="#c98b4b" />
      <path d="M16 52 Q16 32 50 32 Q84 32 84 52 Q66 44 50 44 Q34 44 16 52 Z" fill="#e6b072" />
      <path d="M30 40 L36 30" stroke="#9c6329" strokeWidth="3" strokeLinecap="round" />
      <path d="M48 36 L54 27" stroke="#9c6329" strokeWidth="3" strokeLinecap="round" />
      <path d="M66 40 L72 31" stroke="#9c6329" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function SausageRoll({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="presentation">
      <rect x="14" y="44" width="72" height="30" rx="15" fill="#d9a55f" />
      <rect x="14" y="44" width="72" height="14" rx="7" fill="#eec489" />
      <path d="M30 44 L30 74" stroke="#b8823f" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M46 44 L46 74" stroke="#b8823f" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M62 44 L62 74" stroke="#b8823f" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M78 44 L78 74" stroke="#b8823f" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

const ART: Record<string, (p: { size: number }) => JSX.Element> = {
  roll: Roll,
  banana_loaf: BananaLoaf,
  iced_bun: IcedBun,
  loaf: Loaf,
  sausage_roll: SausageRoll,
};

export default function ItemArt({ id, size = 96, className }: ItemArtProps) {
  const Art = ART[id];
  if (Art === undefined) return null;
  return (
    <span className={className}>
      <Art size={size} />
    </span>
  );
}
