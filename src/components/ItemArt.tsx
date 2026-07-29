/**
 * Hand-drawn inline SVG for every item in the game. No external images anywhere
 * in this app, so every picture is generated in code: no <img>, no icon
 * library, no emoji used as artwork.
 *
 * House style: a 0 0 100 100 viewBox, flat warm shapes, chunky outlines only
 * where they help, and a silhouette that still reads at 60px. Each item has to
 * be tellable apart from its neighbours at a glance by a six-year-old — a
 * banana must not read as a carrot.
 *
 * The charity-shop `used_*` items are deliberately drawn as worn versions of
 * their toy-shop counterparts: a stitched patch, a strip of tape, a scuff, a
 * dog-eared corner, mismatched handles. That is how "second-hand" is said
 * without any words.
 */
interface ItemArtProps {
  id: string;
  size?: number;
  className?: string;
}

/* ---------------------------------------------------------------------------
 * Shared "this one has been mended" marks, so every second-hand thing is worn
 * in the same visual language.
 * ------------------------------------------------------------------------- */

/** A little cross-stitch, the mark of a repair. */
function Stitch({ x, y, s = 4, colour = '#5b4636' }: { x: number; y: number; s?: number; colour?: string }) {
  return (
    <g stroke={colour} strokeWidth="1.6" strokeLinecap="round">
      <line x1={x - s} y1={y - s} x2={x + s} y2={y + s} />
      <line x1={x - s} y1={y + s} x2={x + s} y2={y - s} />
    </g>
  );
}

/** A strip of sticky tape holding something together. */
function Tape({ x, y, w, h, rotate = 0 }: { x: number; y: number; w: number; h: number; rotate?: number }) {
  return (
    <g transform={`rotate(${rotate} ${x + w / 2} ${y + h / 2})`}>
      <rect x={x} y={y} width={w} height={h} fill="#f3e6c2" opacity="0.85" />
      <rect x={x} y={y} width={w} height={h} fill="none" stroke="#c8b489" strokeWidth="1" />
    </g>
  );
}

/* ---------------------------------------------------------------------------
 * BAKERY
 * ------------------------------------------------------------------------- */

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
      <ellipse cx="50" cy="62" rx="33" ry="24" fill="#dea45f" />
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

/* ---------------------------------------------------------------------------
 * GREENGROCER
 * ------------------------------------------------------------------------- */

/** Yellow, crescent, lying on its side. Nothing else in the game is a crescent. */
function Banana({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="presentation">
      <path
        d="M20 22 Q12 60 38 78 Q66 96 86 72 Q90 66 84 64 Q68 82 46 68 Q28 56 32 24 Z"
        fill="#f7d23e"
        stroke="#d3a520"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path d="M34 40 Q34 62 52 72" stroke="#fbe88a" strokeWidth="4" fill="none" strokeLinecap="round" />
      <rect x="20" y="14" width="12" height="12" rx="3" fill="#7d5a24" transform="rotate(-8 26 20)" />
      <path d="M84 64 Q90 66 86 72" fill="#7d5a24" />
    </svg>
  );
}

/** Round, red, one leaf. */
function Apple({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="presentation">
      <path
        d="M50 32 C36 20 18 30 18 50 C18 72 36 88 50 88 C64 88 82 72 82 50 C82 30 64 20 50 32 Z"
        fill="#dc3c33"
      />
      <path d="M32 40 Q26 48 27 60" stroke="#f6a09a" strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d="M50 32 Q49 24 47 16" stroke="#6b4423" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M50 26 Q66 14 74 24 Q64 34 50 26 Z" fill="#4a9e46" />
    </svg>
  );
}

/** A tin: straight metal sides, a bright label, beans on it. */
function Beans({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="presentation">
      <rect x="26" y="22" width="48" height="60" rx="4" fill="#c9ced3" />
      <ellipse cx="50" cy="22" rx="24" ry="7" fill="#e4e9ed" stroke="#a8b0b7" strokeWidth="2" />
      <ellipse cx="50" cy="22" rx="17" ry="4" fill="#b9c1c8" />
      <rect x="26" y="34" width="48" height="36" fill="#e8791f" />
      <rect x="26" y="34" width="48" height="4" fill="#c25c0d" />
      <rect x="26" y="66" width="48" height="4" fill="#c25c0d" />
      <ellipse cx="40" cy="48" rx="7" ry="5" fill="#f6d9a6" transform="rotate(-18 40 48)" />
      <ellipse cx="58" cy="52" rx="7" ry="5" fill="#f6d9a6" transform="rotate(14 58 52)" />
      <ellipse cx="47" cy="59" rx="7" ry="5" fill="#f6d9a6" transform="rotate(-6 47 59)" />
      <rect x="26" y="76" width="48" height="6" fill="#a8b0b7" />
    </svg>
  );
}

/** Three orange cones, points down, green fronts on top. */
function Carrots({ size }: { size: number }) {
  const carrot = (x: number, tilt: number, key: string) => (
    <g key={key} transform={`rotate(${tilt} ${x} 50)`}>
      <path d={`M${x - 9} 42 L${x + 9} 42 L${x} 86 Z`} fill="#ef7d1e" />
      <path d={`M${x - 4} 52 L${x + 4} 52`} stroke="#c95f0c" strokeWidth="2" strokeLinecap="round" />
      <path d={`M${x - 3} 62 L${x + 3} 62`} stroke="#c95f0c" strokeWidth="2" strokeLinecap="round" />
      <path d={`M${x} 42 Q${x - 12} 30 ${x - 14} 18`} stroke="#3f8f3c" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d={`M${x} 42 Q${x} 28 ${x} 16`} stroke="#4fa84a" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d={`M${x} 42 Q${x + 12} 30 ${x + 14} 18`} stroke="#3f8f3c" strokeWidth="4" fill="none" strokeLinecap="round" />
    </g>
  );
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="presentation">
      {carrot(28, -14, 'a')}
      {carrot(72, 14, 'b')}
      {carrot(50, 0, 'c')}
      <rect x="24" y="60" width="52" height="9" rx="4" fill="#b4762f" opacity="0.75" />
    </svg>
  );
}

/** A clear bag, tied at the neck, full of pasta tubes. */
function Pasta({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="presentation">
      <path d="M26 34 L74 34 L78 84 Q78 90 70 90 L30 90 Q22 90 22 84 Z" fill="#f3ecd8" stroke="#c9bd9a" strokeWidth="2.5" />
      <g fill="#eec95f" stroke="#cba63c" strokeWidth="1.5">
        <rect x="30" y="46" width="16" height="9" rx="4" transform="rotate(-20 38 50)" />
        <rect x="52" y="44" width="16" height="9" rx="4" transform="rotate(16 60 48)" />
        <rect x="40" y="60" width="16" height="9" rx="4" transform="rotate(-8 48 64)" />
        <rect x="58" y="66" width="16" height="9" rx="4" transform="rotate(28 66 70)" />
        <rect x="28" y="72" width="16" height="9" rx="4" transform="rotate(10 36 76)" />
      </g>
      <path d="M38 34 Q42 20 50 18 Q58 20 62 34" fill="#f3ecd8" stroke="#c9bd9a" strokeWidth="2.5" />
      <rect x="40" y="26" width="20" height="6" rx="3" fill="#e05a6f" />
    </svg>
  );
}

/** A bottle: narrow neck, blue cap, white inside. */
function Milk({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="presentation">
      <path d="M34 40 Q34 32 40 28 L40 16 L60 16 L60 28 Q66 32 66 40 L66 84 Q66 90 60 90 L40 90 Q34 90 34 84 Z" fill="#fdfdfb" stroke="#b9c4cc" strokeWidth="2.5" />
      <path d="M36 52 L64 52 L64 84 Q64 88 60 88 L40 88 Q36 88 36 84 Z" fill="#eef4f8" />
      <rect x="37" y="10" width="26" height="10" rx="3" fill="#2f7fd0" />
      <rect x="37" y="56" width="26" height="16" rx="3" fill="#cfe4f5" />
      <path d="M42 60 L58 60 M42 66 L54 66" stroke="#2f7fd0" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/** A net sack of knobbly brown potatoes. */
function Potatoes({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="presentation">
      {/* The open mouth of the sack, tied with a red band. */}
      <path d="M30 30 Q50 22 70 30 L72 40 Q50 32 28 40 Z" fill="#c9433f" />
      {/* The sack itself, bulging with potatoes. */}
      <path d="M28 38 Q16 62 22 82 Q26 94 50 94 Q74 94 78 82 Q84 62 72 38 Z" fill="#f0e6cf" stroke="#cdbf9d" strokeWidth="2" />
      <ellipse cx="37" cy="58" rx="15" ry="12" fill="#cb9b62" transform="rotate(-14 37 58)" />
      <ellipse cx="65" cy="62" rx="15" ry="12" fill="#b9884f" transform="rotate(14 65 62)" />
      <ellipse cx="49" cy="80" rx="17" ry="12" fill="#d2a469" transform="rotate(-4 49 80)" />
      <g fill="#8a6132">
        <circle cx="32" cy="55" r="2" />
        <circle cx="42" cy="63" r="1.7" />
        <circle cx="69" cy="60" r="2" />
        <circle cx="60" cy="67" r="1.7" />
        <circle cx="45" cy="80" r="2" />
        <circle cx="56" cy="76" r="1.7" />
      </g>
      <g stroke="#d8663f" strokeWidth="1.6" opacity="0.55" fill="none">
        <path d="M36 40 Q28 68 34 92 M52 38 Q50 68 52 94 M68 40 Q74 68 68 92" />
        <path d="M64 40 Q72 68 66 92 M36 40 Q28 68 34 92" />
        <path d="M22 62 Q50 54 78 62 M22 78 Q50 70 78 78" />
      </g>
    </svg>
  );
}

/** An open egg box with three eggs sitting in it. */
function Eggs({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="presentation">
      <path d="M12 60 Q12 34 20 30 L80 30 Q88 34 88 60 Z" fill="#cfd8de" />
      <ellipse cx="32" cy="52" rx="11" ry="14" fill="#fdf8ee" stroke="#ddd0bb" strokeWidth="1.5" />
      <ellipse cx="50" cy="48" rx="11" ry="14" fill="#fdf8ee" stroke="#ddd0bb" strokeWidth="1.5" />
      <ellipse cx="68" cy="52" rx="11" ry="14" fill="#fdf8ee" stroke="#ddd0bb" strokeWidth="1.5" />
      <path d="M10 62 L90 62 Q92 62 92 66 L92 78 Q92 84 86 84 L14 84 Q8 84 8 78 L8 66 Q8 62 10 62 Z" fill="#aab7c0" />
      <path d="M20 70 Q30 76 40 70 Q50 64 60 70 Q70 76 80 70" stroke="#8b9aa5" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  );
}

/** A punnet of pointed red berries with pips and green tops. */
function Strawberries({ size }: { size: number }) {
  const berry = (x: number, y: number, tilt: number, key: string) => (
    <g key={key} transform={`rotate(${tilt} ${x} ${y})`}>
      <path d={`M${x} ${y + 22} Q${x - 15} ${y + 6} ${x - 13} ${y - 4} Q${x - 10} ${y - 14} ${x} ${y - 10} Q${x + 10} ${y - 14} ${x + 13} ${y - 4} Q${x + 15} ${y + 6} ${x} ${y + 22} Z`} fill="#dc3350" />
      <g fill="#ffe27a">
        <circle cx={x - 5} cy={y - 1} r="1.5" />
        <circle cx={x + 5} cy={y + 1} r="1.5" />
        <circle cx={x} cy={y + 8} r="1.5" />
        <circle cx={x - 6} cy={y + 9} r="1.5" />
        <circle cx={x + 6} cy={y + 9} r="1.5" />
      </g>
      <path d={`M${x - 12} ${y - 9} Q${x} ${y - 18} ${x + 12} ${y - 9} Q${x} ${y - 4} ${x - 12} ${y - 9} Z`} fill="#3f9440" />
      <path d={`M${x} ${y - 12} L${x} ${y - 20}`} stroke="#3f9440" strokeWidth="3" strokeLinecap="round" />
    </g>
  );
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="presentation">
      {berry(32, 46, -12, 'a')}
      {berry(68, 46, 12, 'b')}
      {berry(50, 56, 0, 'c')}
      <path d="M16 68 L84 68 L78 90 L22 90 Z" fill="#e9eef1" opacity="0.9" stroke="#b7c3ca" strokeWidth="2" />
      <path d="M30 68 L27 90 M50 68 L50 90 M70 68 L73 90" stroke="#b7c3ca" strokeWidth="2" />
    </svg>
  );
}

/* ---------------------------------------------------------------------------
 * TOY SHOP
 * ------------------------------------------------------------------------- */

/** A flat sheet of paper with shaped stickers on it. */
function Stickers({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="presentation">
      <g transform="rotate(-6 50 50)">
        <rect x="20" y="18" width="60" height="66" rx="4" fill="#fffdf6" stroke="#c9bfa8" strokeWidth="2" strokeDasharray="5 4" />
        <path d="M36 30 L40 40 L51 41 L43 48 L45 59 L36 53 L27 59 L29 48 L21 41 L32 40 Z" fill="#f2c530" />
        <path d="M64 34 Q64 26 70 26 Q76 26 76 33 Q76 40 64 48 Q52 40 52 33 Q52 26 58 26 Q64 26 64 34 Z" fill="#e8557f" />
        <circle cx="34" cy="72" r="10" fill="#4aa8dd" />
        <rect x="54" y="62" width="20" height="20" rx="4" fill="#5fbf62" transform="rotate(12 64 72)" />
      </g>
    </svg>
  );
}

/** A glossy ball with coloured swirls. */
function BouncyBall({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="presentation">
      <circle cx="50" cy="54" r="34" fill="#3fb7c9" />
      <path d="M50 20 A34 34 0 0 1 84 54 L50 54 Z" fill="#f0576f" />
      <path d="M50 54 L84 54 A34 34 0 0 1 50 88 Z" fill="#f6c93f" />
      <path d="M16 54 A34 34 0 0 1 50 20 L50 54 Z" fill="#7ac05f" />
      <circle cx="50" cy="54" r="34" fill="none" stroke="#2a2f38" strokeWidth="2.5" opacity="0.35" />
      <ellipse cx="38" cy="38" rx="9" ry="6" fill="#ffffff" opacity="0.65" transform="rotate(-32 38 38)" />
    </svg>
  );
}

/** A bubble bottle, its wand, and bubbles in the air. */
function Bubbles({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="presentation">
      <circle cx="26" cy="24" r="10" fill="#bfe6f5" stroke="#79c3e2" strokeWidth="2" />
      <circle cx="23" cy="21" r="2.5" fill="#ffffff" />
      <circle cx="50" cy="14" r="6" fill="#d6f0fa" stroke="#79c3e2" strokeWidth="2" />
      <circle cx="70" cy="26" r="8" fill="#cfeaf7" stroke="#79c3e2" strokeWidth="2" />
      <path d="M38 50 L62 50 L66 86 Q66 92 60 92 L40 92 Q34 92 34 86 Z" fill="#8f6fd0" />
      <rect x="40" y="58" width="20" height="20" rx="3" fill="#f6f0ff" />
      <circle cx="50" cy="68" r="6" fill="none" stroke="#8f6fd0" strokeWidth="2.5" />
      <rect x="44" y="38" width="12" height="14" rx="3" fill="#5f43a3" />
      <path d="M50 38 L76 34" stroke="#5f43a3" strokeWidth="4" strokeLinecap="round" />
      <circle cx="82" cy="52" r="9" fill="none" stroke="#5f43a3" strokeWidth="4" />
    </svg>
  );
}

/** A bright red car, side on, two black wheels. */
function ToyCar({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="presentation">
      <path d="M12 66 L12 54 Q12 48 20 47 L30 47 Q38 30 52 30 L64 30 Q74 30 78 47 L86 49 Q90 51 90 58 L90 66 Z" fill="#e03b34" />
      <path d="M36 46 Q40 34 52 34 L60 34 L60 46 Z" fill="#bfe4f4" />
      <path d="M64 34 Q72 34 75 46 L64 46 Z" fill="#bfe4f4" />
      <rect x="12" y="62" width="78" height="6" rx="3" fill="#a92722" />
      <circle cx="32" cy="70" r="12" fill="#2c3038" />
      <circle cx="32" cy="70" r="5" fill="#cdd3d9" />
      <circle cx="70" cy="70" r="12" fill="#2c3038" />
      <circle cx="70" cy="70" r="5" fill="#cdd3d9" />
      <circle cx="88" cy="55" r="3" fill="#ffe17a" />
    </svg>
  );
}

/** Four pens fanned out, each a different colour, nibs down. */
function Pens({ size }: { size: number }) {
  const pen = (tilt: number, body: string, dark: string, key: string) => (
    <g key={key} transform={`rotate(${tilt} 50 88)`}>
      <rect x="43" y="16" width="14" height="56" rx="4" fill={body} />
      <rect x="43" y="16" width="14" height="14" rx="4" fill={dark} />
      <rect x="46" y="28" width="8" height="10" rx="2" fill={dark} opacity="0.8" />
      <path d="M43 72 L57 72 L50 86 Z" fill="#f4efe2" stroke={dark} strokeWidth="1.5" />
      <path d="M47 78 L53 78 L50 86 Z" fill={dark} />
    </g>
  );
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="presentation">
      {pen(-27, '#e0453f', '#9c2b26', 'r')}
      {pen(-9, '#2f7fd0', '#1c5290', 'b')}
      {pen(9, '#4fa84a', '#2e7230', 'g')}
      {pen(27, '#f2b528', '#b57e0e', 'y')}
    </svg>
  );
}

/** A rope that hangs in a loop, with a wooden handle at each end. */
function Skipping({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="presentation">
      <path d="M26 34 Q10 78 50 82 Q90 78 74 34" fill="none" stroke="#e04a6b" strokeWidth="7" strokeLinecap="round" />
      <path d="M26 34 Q10 78 50 82 Q90 78 74 34" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 10" opacity="0.7" />
      <rect x="18" y="12" width="16" height="28" rx="7" fill="#c98b4b" stroke="#96602c" strokeWidth="2" />
      <rect x="66" y="12" width="16" height="28" rx="7" fill="#c98b4b" stroke="#96602c" strokeWidth="2" />
      <path d="M18 22 L34 22 M66 22 L82 22" stroke="#96602c" strokeWidth="2" />
    </svg>
  );
}

/**
 * The small teddy: chestnut brown, sitting, plain red bow, tucked into the
 * lower half of the frame. It differs from the big teddy in colour, in pose
 * (arms down, sitting) and in what it wears — not just in size, because both
 * are often drawn at the same pixel size.
 */
function SmallTeddy({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="presentation">
      <circle cx="35" cy="46" r="8" fill="#8a5a33" />
      <circle cx="65" cy="46" r="8" fill="#8a5a33" />
      <circle cx="35" cy="46" r="4" fill="#c98f66" />
      <circle cx="65" cy="46" r="4" fill="#c98f66" />
      <ellipse cx="50" cy="76" rx="20" ry="16" fill="#8a5a33" />
      <ellipse cx="30" cy="78" rx="7" ry="9" fill="#8a5a33" transform="rotate(-20 30 78)" />
      <ellipse cx="70" cy="78" rx="7" ry="9" fill="#8a5a33" transform="rotate(20 70 78)" />
      <ellipse cx="50" cy="80" rx="11" ry="9" fill="#c98f66" />
      <circle cx="50" cy="53" r="19" fill="#9c663a" />
      <ellipse cx="50" cy="59" rx="9" ry="7" fill="#d9a878" />
      <circle cx="44" cy="50" r="2.6" fill="#2f2318" />
      <circle cx="56" cy="50" r="2.6" fill="#2f2318" />
      <ellipse cx="50" cy="56" rx="3.4" ry="2.6" fill="#2f2318" />
      <path d="M50 59 L50 62" stroke="#2f2318" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M42 68 L50 64 L58 68 L50 71 Z" fill="#d8443f" />
      <circle cx="50" cy="67" r="2.5" fill="#a92a26" />
    </svg>
  );
}

/**
 * The big teddy: honey-gold, standing with its arms out, wearing a striped
 * scarf, filling the whole frame. Colour, pose and scarf all say "different
 * bear", so it never reads as the small one scaled up.
 */
function BigTeddy({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="presentation">
      <circle cx="27" cy="26" r="11" fill="#d69a3f" />
      <circle cx="73" cy="26" r="11" fill="#d69a3f" />
      <circle cx="27" cy="26" r="6" fill="#f3cf94" />
      <circle cx="73" cy="26" r="6" fill="#f3cf94" />
      <ellipse cx="50" cy="70" rx="26" ry="24" fill="#d69a3f" />
      <ellipse cx="17" cy="60" rx="9" ry="13" fill="#d69a3f" transform="rotate(-38 17 60)" />
      <ellipse cx="83" cy="60" rx="9" ry="13" fill="#d69a3f" transform="rotate(38 83 60)" />
      <ellipse cx="34" cy="92" rx="10" ry="7" fill="#c1862f" />
      <ellipse cx="66" cy="92" rx="10" ry="7" fill="#c1862f" />
      <ellipse cx="50" cy="74" rx="15" ry="13" fill="#f3cf94" />
      <circle cx="50" cy="34" r="24" fill="#e2a94b" />
      <ellipse cx="50" cy="42" rx="12" ry="9" fill="#f7dfae" />
      <circle cx="41" cy="31" r="3.4" fill="#2f2318" />
      <circle cx="59" cy="31" r="3.4" fill="#2f2318" />
      <circle cx="42" cy="30" r="1.1" fill="#ffffff" />
      <circle cx="60" cy="30" r="1.1" fill="#ffffff" />
      <ellipse cx="50" cy="39" rx="4.6" ry="3.4" fill="#2f2318" />
      <path d="M50 42 L50 46 M50 46 Q45 49 42 46 M50 46 Q55 49 58 46" stroke="#2f2318" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M28 54 Q50 66 72 54 L72 62 Q50 74 28 62 Z" fill="#3f8fd0" />
      <path d="M28 57 Q50 69 72 57" stroke="#8fd0f2" strokeWidth="3" fill="none" />
      <path d="M70 60 L80 78 L70 80 L62 63 Z" fill="#3f8fd0" />
      <path d="M66 68 L76 74" stroke="#8fd0f2" strokeWidth="3" />
    </svg>
  );
}

/** A scooter, side on: T-bar, deck, two small wheels. */
function Scooter({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="presentation">
      <path d="M20 78 L64 78 Q72 78 72 70 L72 20" stroke="#5f43a3" strokeWidth="8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M52 20 L88 20" stroke="#3d2b6b" strokeWidth="8" strokeLinecap="round" />
      <rect x="48" y="15" width="10" height="10" rx="4" fill="#e04a6b" />
      <rect x="82" y="15" width="10" height="10" rx="4" fill="#e04a6b" />
      <rect x="14" y="72" width="52" height="10" rx="5" fill="#4ab0c9" />
      <path d="M22 72 L58 72" stroke="#2f8ba1" strokeWidth="3" strokeLinecap="round" />
      <circle cx="18" cy="86" r="10" fill="#2c3038" />
      <circle cx="18" cy="86" r="4" fill="#cdd3d9" />
      <circle cx="76" cy="86" r="10" fill="#2c3038" />
      <circle cx="76" cy="86" r="4" fill="#cdd3d9" />
      <path d="M72 70 L76 78" stroke="#5f43a3" strokeWidth="7" strokeLinecap="round" />
    </svg>
  );
}

/* ---------------------------------------------------------------------------
 * CHARITY SHOP — the same things, but they have been somebody else's first.
 * ------------------------------------------------------------------------- */

/** A well-thumbed sticker book: dog-eared cover, tape on the spine. */
function UsedStickers({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="presentation">
      <g transform="rotate(-4 50 50)">
        <path d="M22 20 L74 20 Q78 20 78 24 L78 82 L22 82 Z" fill="#efe6d2" stroke="#bfae8c" strokeWidth="2" />
        <rect x="16" y="20" width="8" height="62" fill="#c58e5a" />
        <path d="M78 66 L78 82 L62 82 Z" fill="#d9cdb2" stroke="#bfae8c" strokeWidth="2" />
        <path d="M42 32 L45 40 L54 41 L47 47 L49 56 L42 51 L35 56 L37 47 L30 41 L39 40 Z" fill="#d9b23c" opacity="0.85" />
        <circle cx="63" cy="38" r="7" fill="#7fa8c4" opacity="0.85" />
        <path d="M56 62 Q56 56 61 56 Q66 56 66 61 Q66 67 56 74 Q46 67 46 61 Q46 56 51 56 Q56 56 56 62 Z" fill="#cf7f97" opacity="0.8" />
        <Tape x={12} y={44} w={16} h={12} rotate={-8} />
        <Stitch x={34} y={72} s={3.5} colour="#9c8a63" />
      </g>
    </svg>
  );
}

/** A jigsaw: pieces done, and one still to find. */
function UsedJigsaw({ size }: { size: number }) {
  const PIECE =
    'M10 10 h12 a5 5 0 0 1 5 5 a5 5 0 0 0 5 5 a5 5 0 0 0 5 -5 a5 5 0 0 1 5 -5 h12 ' +
    'v12 a5 5 0 0 0 5 5 a5 5 0 0 1 0 10 a5 5 0 0 0 -5 5 v12 h-44 v-12 ' +
    'a5 5 0 0 0 -5 -5 a5 5 0 0 1 0 -10 a5 5 0 0 0 5 -5 Z';
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="presentation">
      <g transform="translate(8 12) scale(0.62)">
        <path d={PIECE} fill="#4aa8dd" stroke="#2b7ba8" strokeWidth="2" />
      </g>
      <g transform="translate(46 12) scale(0.62)">
        <path d={PIECE} fill="#5fbf62" stroke="#3f8f42" strokeWidth="2" />
      </g>
      <g transform="translate(8 50) scale(0.62)">
        <path d={PIECE} fill="#f2b528" stroke="#c48c12" strokeWidth="2" />
      </g>
      <g transform="translate(46 50) scale(0.62)" opacity="0.45">
        <path d={PIECE} fill="none" stroke="#8b7d63" strokeWidth="5" strokeDasharray="8 7" />
      </g>
    </svg>
  );
}

/** The same little car, but faded, scuffed and taped. */
function UsedCar({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="presentation">
      <path d="M12 66 L12 54 Q12 48 20 47 L30 47 Q38 30 52 30 L64 30 Q74 30 78 47 L86 49 Q90 51 90 58 L90 66 Z" fill="#b58f8b" />
      <path d="M36 46 Q40 34 52 34 L60 34 L60 46 Z" fill="#cfd9de" />
      <path d="M64 34 Q72 34 75 46 L64 46 Z" fill="#cfd9de" />
      <rect x="12" y="62" width="78" height="6" rx="3" fill="#8d6c69" />
      <path d="M22 56 L34 54 M26 60 L40 58" stroke="#8d6c69" strokeWidth="2.5" strokeLinecap="round" />
      <Tape x={44} y={30} w={16} h={11} rotate={-10} />
      <circle cx="32" cy="70" r="12" fill="#3a3f47" />
      <circle cx="32" cy="70" r="5" fill="#b6bcc2" />
      <circle cx="70" cy="70" r="11" fill="#4a5058" />
      <circle cx="70" cy="70" r="4" fill="#9aa1a8" />
      <Stitch x={78} y={54} s={3.5} colour="#7b6560" />
    </svg>
  );
}

/** A skipping rope with mismatched handles and a mended middle. */
function UsedSkipping({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="presentation">
      <path d="M26 34 Q10 78 50 82 Q90 78 74 34" fill="none" stroke="#c98fa0" strokeWidth="7" strokeLinecap="round" />
      <path d="M44 80 Q50 72 56 80 Q50 88 44 80 Z" fill="#a86a7c" />
      <Tape x={30} y={64} w={12} h={10} rotate={24} />
      <rect x="18" y="12" width="16" height="28" rx="7" fill="#c0a06e" stroke="#8d7448" strokeWidth="2" />
      <rect x="66" y="14" width="16" height="26" rx="7" fill="#7fa8c4" stroke="#5d7f97" strokeWidth="2" />
      <Stitch x={26} y={26} s={3.5} colour="#8d7448" />
      <path d="M66 26 L82 26" stroke="#5d7f97" strokeWidth="2" />
    </svg>
  );
}

/** A much-loved teddy: faded fur, a patch on its tummy, a stitched ear. */
function UsedTeddy({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="presentation">
      <circle cx="33" cy="42" r="9" fill="#b59a7c" />
      <circle cx="67" cy="42" r="9" fill="#b59a7c" />
      <circle cx="33" cy="42" r="4.5" fill="#d8c4ab" />
      <circle cx="67" cy="42" r="4.5" fill="#d8c4ab" />
      <path d="M60 34 L74 34" stroke="#7d6851" strokeWidth="1.6" strokeDasharray="3 3" />
      <ellipse cx="50" cy="74" rx="22" ry="18" fill="#b59a7c" />
      <ellipse cx="26" cy="74" rx="8" ry="10" fill="#b59a7c" transform="rotate(-24 26 74)" />
      <ellipse cx="74" cy="74" rx="8" ry="10" fill="#b59a7c" transform="rotate(24 74 74)" />
      <ellipse cx="50" cy="78" rx="12" ry="10" fill="#d8c4ab" />
      <rect x="56" y="70" width="18" height="15" rx="3" fill="#8fb2c9" transform="rotate(-10 65 77)" />
      <g transform="rotate(-10 65 77)" stroke="#5d7f97" strokeWidth="1.4" strokeDasharray="3 3" fill="none">
        <rect x="56" y="70" width="18" height="15" rx="3" />
      </g>
      <circle cx="50" cy="50" r="20" fill="#c2a888" />
      <ellipse cx="50" cy="57" rx="10" ry="8" fill="#e0cdb4" />
      <circle cx="43" cy="47" r="2.8" fill="#2f2318" />
      <Stitch x={57} y={47} s={3.2} colour="#5b4636" />
      <ellipse cx="50" cy="53" rx="3.6" ry="2.8" fill="#5b4636" />
      <path d="M50 56 L50 59" stroke="#5b4636" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M34 40 Q40 34 46 36" stroke="#a08a6c" strokeWidth="1.6" fill="none" strokeDasharray="3 3" />
    </svg>
  );
}

/* ------------------------------------------------------------------------- */

const ART: Record<string, (p: { size: number }) => JSX.Element> = {
  // Bakery
  roll: Roll,
  banana_loaf: BananaLoaf,
  iced_bun: IcedBun,
  loaf: Loaf,
  sausage_roll: SausageRoll,
  // Greengrocer
  banana: Banana,
  apple: Apple,
  beans: Beans,
  carrots: Carrots,
  pasta: Pasta,
  milk: Milk,
  potatoes: Potatoes,
  eggs: Eggs,
  strawberries: Strawberries,
  // Toy shop
  stickers: Stickers,
  bouncy_ball: BouncyBall,
  bubbles: Bubbles,
  toy_car: ToyCar,
  pens: Pens,
  skipping: Skipping,
  small_teddy: SmallTeddy,
  big_teddy: BigTeddy,
  scooter: Scooter,
  // Charity shop
  used_stickers: UsedStickers,
  used_jigsaw: UsedJigsaw,
  used_car: UsedCar,
  used_skipping: UsedSkipping,
  used_teddy: UsedTeddy,
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
