/**
 * The bakery's regulars, drawn from the waist up so they stand behind the
 * counter. Inline SVG only, in the same flat warm style as ItemArt. Each one is
 * told apart at a glance by a hat or hairdo, not by reading a name.
 *
 * `mood` changes only the face: waiting (a small smile), thinking (an "o" and
 * a raised eyebrow — never a frown, nobody here is cross) and happy.
 */

export type CustomerMood = 'waiting' | 'thinking' | 'happy';

interface Look {
  skin: string;
  body: string;
  trim: string;
  hair: string;
  /** Hat, hairdo and anything else that makes them them. Drawn over the head. */
  top: JSX.Element;
  /** Drawn on the face: glasses, a moustache, freckles. */
  face?: JSX.Element;
  /** Drawn on the body: a satchel strap, a flower, buttons. */
  chest?: JSX.Element;
  /** A child is drawn a little smaller and lower. */
  child?: boolean;
}

const LOOKS: Look[] = [
  // 0 Granny Jo — grey bun, round glasses, lilac cardigan.
  {
    skin: '#f3cfb0',
    body: '#b99ad6',
    trim: '#8f6fb0',
    hair: '#d9d9d9',
    top: (
      <g>
        <circle cx="60" cy="26" r="13" fill="#d9d9d9" />
        <path d="M33 52 Q34 30 60 30 Q86 30 87 52 Q78 40 60 40 Q42 40 33 52 Z" fill="#d9d9d9" />
      </g>
    ),
    face: (
      <g stroke="#6b5b4b" strokeWidth="2.2" fill="none">
        <circle cx="50" cy="56" r="7" />
        <circle cx="70" cy="56" r="7" />
        <path d="M57 56 L63 56" />
      </g>
    ),
    chest: (
      <g fill="#fff8">
        <circle cx="60" cy="112" r="2.5" />
        <circle cx="60" cy="124" r="2.5" />
      </g>
    ),
  },
  // 1 Captain Nia — pirate hat, navy coat, gold buttons.
  {
    skin: '#8d5a3b',
    body: '#2f4a7a',
    trim: '#e3b341',
    hair: '#2b1a10',
    top: (
      <g>
        <path d="M24 40 Q60 6 96 40 Q78 32 60 34 Q42 32 24 40 Z" fill="#26211d" />
        <rect x="34" y="34" width="52" height="7" rx="3" fill="#26211d" />
        <circle cx="60" cy="25" r="5" fill="#f2f2f2" />
        <path d="M57 23 L63 27 M63 23 L57 27" stroke="#26211d" strokeWidth="1.5" />
      </g>
    ),
    chest: (
      <g fill="#e3b341">
        <circle cx="50" cy="112" r="3" />
        <circle cx="70" cy="112" r="3" />
        <circle cx="50" cy="126" r="3" />
        <circle cx="70" cy="126" r="3" />
      </g>
    ),
  },
  // 2 Postman Pete — peaked cap, red jumper, satchel strap.
  {
    skin: '#f0c19c',
    body: '#d64545',
    trim: '#a83232',
    hair: '#6b4423',
    top: (
      <g>
        <path d="M36 42 Q36 24 60 24 Q84 24 84 42 Z" fill="#253b6e" />
        <path d="M58 42 Q76 40 92 46 Q76 48 58 46 Z" fill="#1b2b52" />
        <rect x="55" y="29" width="10" height="6" rx="1.5" fill="#e3b341" />
      </g>
    ),
    chest: <path d="M34 98 L86 140" stroke="#6b4423" strokeWidth="7" strokeLinecap="round" />,
  },
  // 3 Little Sam — messy hair, freckles, yellow T-shirt.
  {
    skin: '#f6d2b6',
    body: '#f2c94c',
    trim: '#d9a92c',
    hair: '#7a4a24',
    child: true,
    top: (
      <path
        d="M36 52 Q30 26 52 26 Q56 18 66 24 Q72 18 78 28 Q92 34 84 52 Q78 38 66 40 Q50 36 36 52 Z"
        fill="#7a4a24"
      />
    ),
    face: (
      <g fill="#c98b5f">
        <circle cx="46" cy="64" r="1.4" />
        <circle cx="50" cy="66" r="1.4" />
        <circle cx="70" cy="66" r="1.4" />
        <circle cx="74" cy="64" r="1.4" />
      </g>
    ),
  },
  // 4 Chef Remy — tall white hat, curly moustache, white jacket.
  {
    skin: '#f1c7a5',
    body: '#f7f7f2',
    trim: '#d0d0c8',
    hair: '#3b2a18',
    top: (
      <g>
        <rect x="40" y="26" width="40" height="16" fill="#ffffff" stroke="#ddd" strokeWidth="1.5" />
        <circle cx="46" cy="18" r="11" fill="#ffffff" stroke="#ddd" strokeWidth="1.5" />
        <circle cx="60" cy="12" r="12" fill="#ffffff" stroke="#ddd" strokeWidth="1.5" />
        <circle cx="74" cy="18" r="11" fill="#ffffff" stroke="#ddd" strokeWidth="1.5" />
        <rect x="41" y="20" width="38" height="14" fill="#ffffff" />
      </g>
    ),
    face: (
      <path
        d="M48 68 Q54 64 60 68 Q66 64 72 68 Q68 72 60 70 Q52 72 48 68 Z"
        fill="#3b2a18"
      />
    ),
    chest: (
      <g fill="#c0392b">
        <circle cx="52" cy="112" r="2.5" />
        <circle cx="68" cy="112" r="2.5" />
        <circle cx="52" cy="124" r="2.5" />
        <circle cx="68" cy="124" r="2.5" />
      </g>
    ),
  },
  // 5 Mr Bloom — flat cap, beard, green jumper, a flower.
  {
    skin: '#e9b48c',
    body: '#5a9a4a',
    trim: '#3f7a33',
    hair: '#8a5a32',
    top: (
      <g>
        <path d="M34 44 Q36 26 60 26 Q84 26 88 40 Q96 42 94 46 Q70 44 34 46 Z" fill="#7a6a4a" />
      </g>
    ),
    face: <path d="M42 64 Q44 86 60 88 Q76 86 78 64 Q72 76 60 76 Q48 76 42 64 Z" fill="#8a5a32" />,
    chest: (
      <g>
        <circle cx="74" cy="112" r="5" fill="#f2c94c" />
        {[0, 72, 144, 216, 288].map((deg) => (
          <circle
            key={deg}
            cx={74 + 7 * Math.cos((deg * Math.PI) / 180)}
            cy={112 + 7 * Math.sin((deg * Math.PI) / 180)}
            r="4"
            fill="#e86a8a"
          />
        ))}
        <circle cx="74" cy="112" r="4" fill="#f2c94c" />
      </g>
    ),
  },
  // 6 Mrs Crumb, the boss — red curls, a little baker's cap, a floury apron.
  {
    skin: '#f4cdb0',
    body: '#e98aa8',
    trim: '#c76a88',
    hair: '#c4552d',
    top: (
      <g>
        <circle cx="34" cy="52" r="9" fill="#c4552d" />
        <circle cx="86" cy="52" r="9" fill="#c4552d" />
        <circle cx="38" cy="66" r="7" fill="#c4552d" />
        <circle cx="82" cy="66" r="7" fill="#c4552d" />
        <path d="M38 38 Q38 22 60 22 Q82 22 82 38 Z" fill="#ffffff" stroke="#ddd" strokeWidth="1.5" />
        <rect x="36" y="34" width="48" height="8" rx="3" fill="#ffffff" stroke="#ddd" strokeWidth="1.5" />
      </g>
    ),
    chest: (
      <g>
        <path d="M40 104 H80 V140 H40 Z" fill="#ffffff" />
        <path d="M40 104 L34 96 M80 104 L86 96" stroke="#ffffff" strokeWidth="4" />
        <rect x="50" y="116" width="20" height="12" rx="3" fill="#f3e6d6" />
        <circle cx="46" cy="132" r="2" fill="#f0e2cc" />
        <circle cx="72" cy="110" r="2.5" fill="#f0e2cc" />
      </g>
    ),
  },
];

/** The look index of Mrs Crumb, who runs the bakery. Not one of the customers. */
export const BOSS_LOOK = 6;

export default function CustomerArt({
  look,
  mood,
  size = 200,
}: {
  look: number;
  mood: CustomerMood;
  size?: number;
}) {
  const l = LOOKS[look % LOOKS.length] ?? LOOKS[0];
  if (l === undefined) return null;
  const scale = l.child === true ? 0.86 : 1;

  return (
    <svg
      viewBox="0 0 120 140"
      width={size}
      height={(size * 140) / 120}
      role="presentation"
      data-testid="customer-art"
      data-mood={mood}
    >
      <g transform={`translate(${60 - 60 * scale} ${140 - 140 * scale}) scale(${scale})`}>
        {/* Body */}
        <path d="M18 140 Q18 96 60 94 Q102 96 102 140 Z" fill={l.body} />
        <path d="M48 94 L60 108 L72 94" fill="none" stroke={l.trim} strokeWidth="4" />
        {l.chest}

        {/* Neck and head */}
        <rect x="52" y="78" width="16" height="18" rx="6" fill={l.skin} />
        <circle cx="60" cy="58" r="26" fill={l.skin} />
        <path d="M34 54 Q36 34 60 34 Q84 34 86 54 Q76 44 60 44 Q44 44 34 54 Z" fill={l.hair} />

        {/* Eyes, with a raised brow when thinking */}
        <circle cx="50" cy="57" r="3" fill="#2b1d12" />
        <circle cx="70" cy="57" r="3" fill="#2b1d12" />
        {mood === 'thinking' && (
          <path d="M65 47 Q70 43 75 47" stroke="#2b1d12" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        )}

        {/* Cheeks */}
        <circle cx="42" cy="66" r="5" fill="#f08a7a" opacity={mood === 'happy' ? 0.55 : 0.3} />
        <circle cx="78" cy="66" r="5" fill="#f08a7a" opacity={mood === 'happy' ? 0.55 : 0.3} />

        {l.face}

        {/* Mouth */}
        {mood === 'happy' && <path d="M48 70 Q60 84 72 70 Z" fill="#8a2f2f" />}
        {mood === 'waiting' && (
          <path d="M51 72 Q60 78 69 72" stroke="#5a2a1a" strokeWidth="3" fill="none" strokeLinecap="round" />
        )}
        {mood === 'thinking' && <ellipse cx="60" cy="74" rx="4" ry="3.5" fill="#5a2a1a" />}

        {l.top}
      </g>
    </svg>
  );
}
