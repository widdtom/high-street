/* =============================================================================
 * ROTATE OVERLAY
 *
 * High Street is a LANDSCAPE-ONLY game. When the iPad is held in portrait this
 * covers the whole screen and asks — wordlessly, because the player is six and
 * the rest of the app is text-free — for the device to be turned.
 *
 * Visibility is decided ENTIRELY in CSS (`.rotate-overlay` in src/index.css):
 *
 *     @media (hover: none) and (pointer: coarse) and (orientation: portrait)
 *
 * There is no user-agent sniffing and no JS orientation listener, so it is
 * structurally impossible for this to block a desktop browser during
 * development: a desktop pointer has hover and is fine, so the overlay stays
 * `display: none` no matter how narrow the window gets.
 *
 * Render it once, near the root, as a sibling of the game surface.
 * ============================================================================= */

/** Full-screen portrait lock-out. Takes no props; mount it and forget it. */
export default function RotateOverlay() {
  return (
    <div
      className="rotate-overlay"
      // Purely instructional decoration; the game beneath owns the a11y tree.
      role="img"
      aria-label="Turn the iPad sideways"
    >
      <svg
        className="rotate-overlay__glyph"
        width="220"
        height="220"
        viewBox="0 0 120 120"
        fill="none"
        aria-hidden="true"
        focusable="false"
      >
        {/* Curved arrow sweeping anticlockwise over the top of the tablet. */}
        <path
          d="M22 40a42 42 0 0 1 76 0"
          stroke="#b87333"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <path
          d="M98 40 88.5 24.5 M98 40l-17.5 3"
          stroke="#b87333"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* The tablet: portrait body, rounded, with a bezel and a home dot. */}
        <rect
          x="38"
          y="46"
          width="44"
          height="62"
          rx="7"
          fill="#f4ead8"
          stroke="#3c2f1c"
          strokeWidth="5"
        />
        <rect x="45" y="53" width="30" height="42" rx="2.5" fill="#d4af37" />
        <circle cx="60" cy="101.5" r="2.6" fill="#3c2f1c" />
      </svg>
    </div>
  );
}
