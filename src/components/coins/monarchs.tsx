/* =============================================================================
 * OBVERSE PORTRAITS
 *
 * Two simplified, child-legible profile silhouettes. Deliberately NOT
 * photorealistic: at 58 px (the 5p) a six-year-old needs to tell them apart at
 * a glance, and a flat silhouette does that where a detailed engraving cannot.
 *
 * The differences are made loud on purpose:
 *   Elizabeth II — crowned, smaller head, hair bun at the nape, faces RIGHT.
 *   Charles III  — uncrowned, larger head, swept hair, visible ear, faces LEFT.
 * (Successive monarchs alternate direction on real UK coinage, so the facing is
 * both the clearest cue and the historically correct one.)
 *
 * Everything is authored in a 0–100 square (PORTRAIT_BOX). Callers place it
 * with their own <g transform>.
 * ============================================================================= */

import type { Monarch } from '../../engine/types';

/** Portraits are authored in this square coordinate space. */
export const PORTRAIT_BOX = 100;

export interface MonarchPortraitProps {
  monarch: Monarch;
  /** Fill for the main silhouette. */
  fill: string;
  /** Darker accent for the hair mass, the crown band and the ear. */
  shade: string;
}

/* -- Elizabeth II, authored facing right ---------------------------------- */

const ELIZABETH_HEAD =
  'M 45 16 ' +
  'C 57 15 65.4 23 66.6 33.4 ' +
  'C 66.9 35.4 66.2 36.9 65.4 38.2 ' +
  'C 68.2 41.4 71.2 45.6 72.2 49.4 ' +
  'C 72.6 51.6 70.6 52.9 67.6 53.2 ' +
  'C 68.6 54.4 68.4 56 66.6 57 ' +
  'C 67.9 58.1 67.9 59.8 66.2 61 ' +
  'C 68 62.6 68.2 66.6 64.6 69.6 ' +
  'C 59.6 73.4 52.6 75.6 47 75 ' +
  'L 47 82.6 C 56.6 86.4 62.4 92 65 100 L 16 100 C 19.6 90.6 25.4 85.4 32.4 83 ' +
  'C 24.6 77.6 21 65.6 21.4 53.6 ' +
  'C 21.9 33.6 30 17 45 16 Z';

const ELIZABETH_BUN =
  'M 23 53 C 14.6 52.4 11.4 60 13.6 66.6 ' +
  'C 15.8 73.2 23.4 75.4 26.8 70.6 ' +
  'C 23.4 65 22.6 59.4 23 53 Z';

const ELIZABETH_CROWN = 'M 25 33 L 28.4 13.4 L 36.4 25.4 L 45.4 5 L 54.4 23.6 L 62.6 13.4 L 66 30.6 Z';

const ELIZABETH_BAND = 'M 24.6 29.4 Q 45.4 22.4 66.4 26.6 L 67 32.4 Q 45.4 28.4 25.4 35.6 Z';

const ELIZABETH_ORB = 'M 45.4 2 a 3 3 0 1 0 0.01 0 Z';

/* -- Charles III, authored facing right then mirrored --------------------- */

const CHARLES_HEAD =
  'M 43 10 ' +
  'C 60 9.4 68.6 17.6 71 29 ' +
  'C 71.9 35.9 70.9 38 69.6 39.6 ' +
  'C 73.4 43.4 78.4 49 79.8 53.6 ' +
  'C 80.3 56.2 77.4 57.8 73 58.2 ' +
  'C 74.2 59.7 74 61.7 71.9 63 ' +
  'C 73.4 64.3 73.4 66.6 70.9 68.2 ' +
  'C 73 70.4 72.6 75 67.6 78.4 ' +
  'C 61 83 52 85 46 84 ' +
  'L 46 89.6 C 56 93.4 62.6 96.6 66 100 L 11 100 C 14.6 92.4 20.6 87.4 27.6 85 ' +
  'C 18.6 78 14.6 64 15.5 48 ' +
  'C 16.5 24 27 11 43 10 Z';

const CHARLES_HAIR =
  'M 15.5 47 C 16.4 24 27 11 43 10 ' +
  'C 60 9.4 68.6 17.6 71 29 ' +
  'C 68.4 24.4 61 18.6 50 18.4 ' +
  'C 30 21.6 19.6 30 18 50 Z';

/** A small filled ear rim, low and well back — Elizabeth's is hidden by hair. */
const CHARLES_EAR =
  'M 38.6 49.4 C 43.6 47.8 46.6 51.4 45.8 56 ' +
  'C 45.2 59.6 42.6 62.4 39.8 62.4 ' +
  'C 42 58.6 42.4 52.6 38.6 49.4 Z';

/** Elizabeth II: crowned, compact, facing right. */
export function ElizabethIIPortrait({ fill, shade }: Omit<MonarchPortraitProps, 'monarch'>): JSX.Element {
  return (
    <g>
      <path d={ELIZABETH_BUN} fill={fill} />
      <path d={ELIZABETH_HEAD} fill={fill} />
      <path d={ELIZABETH_CROWN} fill={fill} />
      <path d={ELIZABETH_BAND} fill={shade} />
      <path d={ELIZABETH_ORB} fill={fill} />
    </g>
  );
}

/** Charles III: uncrowned, larger, facing left. */
export function CharlesIIIPortrait({ fill, shade }: Omit<MonarchPortraitProps, 'monarch'>): JSX.Element {
  return (
    <g transform={`translate(${PORTRAIT_BOX},0) scale(-1,1)`}>
      <path d={CHARLES_HEAD} fill={fill} />
      <path d={CHARLES_HAIR} fill={shade} />
      <path d={CHARLES_EAR} fill={shade} />
    </g>
  );
}

/** Draws the requested monarch inside the 0–100 portrait box. */
export function MonarchPortrait({ monarch, fill, shade }: MonarchPortraitProps): JSX.Element {
  return monarch === 'elizabeth' ? (
    <ElizabethIIPortrait fill={fill} shade={shade} />
  ) : (
    <CharlesIIIPortrait fill={fill} shade={shade} />
  );
}

export default MonarchPortrait;
