# High Street

A UK money-education game for a six-year-old, running as an installable PWA on an iPad.

## Non-negotiable constraints

These are not preferences. Breaking one is a bug, however good the reason looks.

### Money is integer pence

Every monetary value in the codebase is a whole number of pence held in a TypeScript
`number`. Floats are forbidden for money. Never use `*`, `/` or a decimal literal to
derive a monetary amount. Formatting to `"£1.20"` happens **only** at the display layer,
via `formatMoney()`.

This is enforced by an ESLint rule (`no-restricted-syntax` on decimal numeric literals)
scoped to `src/engine/**` and `src/data/**`. `coins.ts` and `geometry.ts` are excluded
because they carry physical millimetre measurements, which are genuinely fractional.

### Zero network requests

The app makes no network requests at runtime. No analytics, no telemetry, no error
reporting, no CDN fonts, no external images, no API calls. Every asset is bundled or
generated in code. This is locked down by a CSP in `index.html` with `connect-src 'none'`
— do not relax it. All state lives in `localStorage` on the device. No accounts, no sync,
no cloud.

`npm run verify` asserts zero off-origin requests against the built app.

### Curriculum

UK Year 1/2. Calculations never cross the £/p boundary — never add £1.20 to 60p. Amounts
of 100p and above display as pence in stages 1–3. **Numerals only, never number words.**

### No fail states

No timers, no lives, no streaks, no second currency. Pence are the only reward in the
game — no stars, gems, XP or points anywhere.

Paying too little is not a failure. No coins move, nothing is deducted, nothing visible
is recorded against her. The same applies to running out of food or electricity: they
produce one calm line of dialogue and nothing else. Darkness is never a punishment and
the screen is never blacked out.

### Interaction

**Tap to pay, never drag.** HTML5 drag-and-drop does not work in iOS Safari, and drag
gestures are unreliable for a six-year-old. There are no drag handlers anywhere.

Landscape only. All interactive elements need `touch-action: manipulation`.

## Architecture

```
/src
  /engine       Pure functions, no React, fully unit tested
  /data         Prices, wages, bills as typed constants
  /state        Save (localStorage), reducer, context
  /components   Shared UI, including /coins
  /screens      One file per screen; a screen enum in state, no router
/tests          Mirrors /src
/scripts        verify.mjs — live checks against the built app
```

No state management library (`useReducer` + context). No routing library. No animation
library (CSS transitions only). No icon library (inline SVG).

### The purse is a list of coins

`purse: CoinValue[]`, never a balance. She holds coins, not a number. The same goes for
`moneyBox`. This is why `canMakeExactlyFrom(price, purse)` treats its coin list as a
finite multiset — each coin can be spent once.

### Coin diameters are maximum diameters

The quoted millimetre figures are vertex-to-vertex, not across-the-flats. The £1 is
fractionally *smaller* than the 10p, and the size order
`5p < 1p < 20p < £1 < 10p < 2p < 50p < £2` is asserted in
`tests/coins/geometry.test.ts` from measured geometry. The size-versus-value mismatch is
the single most important thing this game teaches.

## Temporary scaffolding

### `TEMP_SHIFT_STANDIN` — DELETE IN PROMPT 3

`src/data/economy.ts` exports `TEMP_SHIFT_STANDIN: Pence = 25`, paid alongside pocket
money in the Saturday sequence. It exists only because the bakery shift does not exist
yet, leaving weekly income of 30p against essentials of 23–40p — nothing left for toys,
and joyless to test.

**It must not survive into the finished game.** Earning has to be something she chooses
to do. When the bakery shift lands in prompt 3, delete the constant, its payment in the
Saturday sequence, and this section.

## Commands

```
npm run dev       Vite dev server
npm run build     tsc -b && vite build
npm test          vitest run
npm run lint      eslint
npm run verify    build first, then live checks in headless Chromium
```
