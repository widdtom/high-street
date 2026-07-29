# High Street

A quiet British high street, built for one six-year-old to learn what money is.

Pocket money arrives. The bakery wants 12p for a loaf. You count out a 10p and a
2p, you hand them over, and the loaf is yours. That is the whole game. There are
no points, no timers, no stars, no adverts, and nobody to beat.

It runs as an installed app on an iPad home screen, in landscape, offline.

---

## The three rules this project does not bend

### 1. Money is integer pence

Every monetary amount in the codebase is a whole number of **pence**, stored in a
plain integer. £1.20 is `120`. Never `1.2`.

Floating point is not a small risk here, it is the wrong tool: `0.1 + 0.2` is
`0.30000000000000004`, and the one person who must never meet a rounding error is
a child learning to count change. Decimals are converted to a `"£1.20"` string at
the very edge of rendering and nowhere else.

This is enforced by ESLint, not just by convention — see
[`.eslintrc.cjs`](.eslintrc.cjs). A `no-restricted-syntax` rule bans decimal
numeric literals (plus `parseFloat` and `.toFixed()`) throughout `src/engine/**`
and `src/data/**`. Coin diameters in millimetres and the mm-to-pixel scale are
genuinely fractional physical facts rather than money, so those files are
exempted explicitly and individually.

### 2. Zero network requests at runtime

Once installed, the app never talks to anything. No analytics. No telemetry. No
crash reporting. No CDN fonts. No remote images. No APIs. Nothing about a
six-year-old's play leaves the iPad.

This is enforced three ways:

- **Content Security Policy.** A `<meta http-equiv="Content-Security-Policy">`
  in [`index.html`](index.html) sets `connect-src 'none'`, which kills `fetch`,
  `XMLHttpRequest`, `WebSocket`, `EventSource` and `navigator.sendBeacon`
  outright. `default-src 'self'` and `font-src 'self'` mean no third-party
  origin can be reached at all.
- **No network primitive in the bundle.** Vite's modulepreload polyfill — the
  only thing in a default build that calls `fetch()` — is switched off in
  [`vite.config.ts`](vite.config.ts). Grep the built `dist/assets/*.js` for
  `fetch(`, `XMLHttpRequest`, `WebSocket` or `sendBeacon` and you get nothing.
- **Typography.** The font stack is the system stack (see
  `tailwind.config.js`). There is no `@font-face` anywhere, so not one byte of
  font is fetched.

The only absolute URLs that survive into `dist/` are inert strings: the W3C XML
namespace URIs that SVG and XHTML require (`http://www.w3.org/2000/svg` and
friends — identifiers, never dereferenced), a documentation link inside a
Workbox `console.warn`, and React's minified-error message prefix
(`https://reactjs.org/docs/error-decoder.html?invariant=`). None of them is
ever requested, and the CSP would block them if anything tried.

### 3. It works on a plane

The service worker precaches every emitted asset — JS, CSS, HTML, SVG, PNG and
the web manifest — so after the first load the game runs with the iPad in
aeroplane mode. There are no runtime caching rules, because a runtime cache rule
implies a network fetch, and there are no network fetches.

---

## Deployment

The app is a GitHub Pages **project** site:

| | |
|---|---|
| URL | `https://widdtom.github.io/high-street/` |
| Vite `base` | `/high-street/` |
| Manifest `start_url` | `/high-street/` |
| Manifest `scope` | `/high-street/` |
| Service worker | `/high-street/sw.js`, registered with `scope: '/high-street/'` |
| Navigation fallback | `/high-street/index.html` |

**Those five paths must move together.** A service worker whose scope does not
match the base path is the single most common reason a Pages-hosted PWA silently
refuses to install: the browser accepts the manifest, shows no error, and simply
never offers "Add to Home Screen". If the repository is ever renamed, change
`BASE` in [`vite.config.ts`](vite.config.ts) — everything else is derived from it.

[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) builds on every
push to `main` (Node 20, `npm ci`, lint, test, build) and publishes `./dist` via
`actions/configure-pages` → `actions/upload-pages-artifact` →
`actions/deploy-pages`. Enable it once in **Settings → Pages → Build and
deployment → Source: GitHub Actions**.

---

## Installing on the iPad

1. Open `https://widdtom.github.io/high-street/` in **Safari** (Chrome on iOS
   cannot install PWAs).
2. Share → **Add to Home Screen**.
3. Launch from the home screen. It opens full-screen with no browser chrome.
4. Turn Wi-Fi off and launch it again to confirm the offline precache took.

The app is **landscape only**. Held in portrait, a full-screen overlay shows a
tilting iPad glyph and no text at all — the player cannot read yet.
[`src/components/RotateOverlay.tsx`](src/components/RotateOverlay.tsx) is driven
purely by the CSS media query

```
@media (hover: none) and (pointer: coarse) and (orientation: portrait)
```

so it can never appear on a desktop browser during development, however narrow
you make the window. No user-agent sniffing, no JavaScript orientation listener.

---

## iPad shell details

[`src/index.css`](src/index.css) makes the page behave like an app rather than a
document:

- `touch-action: manipulation` on every interactive element, which removes
  Safari's 300 ms double-tap-to-zoom delay.
- `-webkit-user-select`, `user-select`, `-webkit-touch-callout` and
  `-webkit-tap-highlight-color` all disabled on the game surface, so
  long-pressing a coin never raises the iOS selection handles or the copy/share
  callout.
- `position: fixed` body at `100dvh` (with a `100vh` fallback) plus
  `overflow: hidden` and `overscroll-behavior: none` — no scrolling, no
  rubber-band bounce.
- `viewport-fit=cover` in the meta tag, with the notch and home-indicator
  margins handed back through `env(safe-area-inset-*)`.

Safe-area helpers available to screens: `.safe-px`, `.safe-py`, `.safe-p`,
`.safe-inset`, `.safe-mt`, `.safe-mb`, plus `.game-surface`, `.no-select` and
`.select-text-ok`. The raw insets are also exposed as `--safe-top`,
`--safe-right`, `--safe-bottom` and `--safe-left` for use inside `calc()`.

> These helpers are written as plain CSS *after* the `@tailwind` directives
> rather than inside `@layer components`. Tailwind tree-shakes anything in a
> `@layer` that it cannot find in its `content` globs, which would delete a
> utility the moment no screen happened to use it.

---

## Icons

The icons are **generated, not drawn by hand and not downloaded** — a £ coin on
the warm street background, rendered as signed-distance primitives at 4×
supersampling and box-downsampled for clean antialiased edges, then encoded
straight to PNG using only Node core (`zlib.deflateSync` for the IDAT stream and
a hand-rolled CRC32 for the chunk checksums). No image library, no new
dependency.

| File | Size | Purpose |
|---|---|---|
| `public/icon-192.png` | 192×192 | manifest, `purpose: any` |
| `public/icon-512.png` | 512×512 | manifest, `purpose: any` |
| `public/icon-512-maskable.png` | 512×512 | manifest, `purpose: maskable` — art confined to the inner 62%, well inside the 80% safe zone |
| `public/apple-touch-icon.png` | 180×180 | iOS home screen (opaque; iOS applies its own rounded-rect mask) |
| `public/favicon.svg` | vector | browser tab |

---

## Local development

```sh
npm install
npm run dev      # vite dev server; no service worker, so no stale-cache confusion
npm run lint     # ESLint, including the integer-pence rule
npm run test     # vitest
npm run build    # tsc -b && vite build
npm run preview  # serve dist/ at the real /high-street/ base path
```

Use `npm run preview` — not `npm run dev` — to test PWA install and offline
behaviour, since the service worker is deliberately disabled during development.
