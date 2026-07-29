import { describe, expect, it } from 'vitest';
import {
  COIN_GEOMETRY,
  MM_TO_PX,
  coinDiameterPx,
  coinEdgePath,
  renderedMaxDiameterPx,
} from '../../src/components/coins/geometry';
import { ALL_COIN_VALUES } from '../../src/engine';
import type { CoinValue } from '../../src/engine/types';

/* ---------------------------------------------------------------------------
 * An independent SVG path sampler.
 *
 * This deliberately does NOT reuse the geometry module's own maths. It parses
 * the emitted `d` string and walks it, so the measurements below are a genuine
 * check on the rendered outline rather than a restatement of how it was built.
 * ------------------------------------------------------------------------- */

interface P {
  x: number;
  y: number;
}

/** Sample points along an SVG path made of M, L, Q, A and Z commands. */
function samplePath(d: string, perSegment = 96): P[] {
  const tokens = d.match(/[MLQAZ]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi) ?? [];
  const out: P[] = [];
  let i = 0;
  let cur: P = { x: 0, y: 0 };
  let start: P = { x: 0, y: 0 };

  const num = (): number => {
    const t = tokens[i];
    i += 1;
    const n = Number(t);
    if (!Number.isFinite(n)) throw new Error(`bad number in path: ${String(t)}`);
    return n;
  };

  while (i < tokens.length) {
    const cmd = tokens[i];
    i += 1;
    switch (cmd) {
      case 'M': {
        cur = { x: num(), y: num() };
        start = cur;
        out.push(cur);
        break;
      }
      case 'L': {
        const p = { x: num(), y: num() };
        for (let s = 1; s <= perSegment; s += 1) {
          const t = s / perSegment;
          out.push({ x: cur.x + (p.x - cur.x) * t, y: cur.y + (p.y - cur.y) * t });
        }
        cur = p;
        break;
      }
      case 'Q': {
        const c = { x: num(), y: num() };
        const p = { x: num(), y: num() };
        for (let s = 1; s <= perSegment; s += 1) {
          const t = s / perSegment;
          const u = 1 - t;
          out.push({
            x: u * u * cur.x + 2 * u * t * c.x + t * t * p.x,
            y: u * u * cur.y + 2 * u * t * c.y + t * t * p.y,
          });
        }
        cur = p;
        break;
      }
      case 'A': {
        const rx = num();
        num(); // ry — always equal to rx here
        num(); // x-axis rotation
        const largeArc = num();
        const sweep = num();
        const p = { x: num(), y: num() };

        // Endpoint -> centre parameterisation for a circular arc.
        const dx = p.x - cur.x;
        const dy = p.y - cur.y;
        const dist = Math.hypot(dx, dy);
        const r = Math.max(rx, dist / 2);
        const mid = { x: (cur.x + p.x) / 2, y: (cur.y + p.y) / 2 };
        const h = Math.sqrt(Math.max(0, r * r - (dist / 2) ** 2));
        const nx = -dy / dist;
        const ny = dx / dist;
        const sign = largeArc !== sweep ? 1 : -1;
        const c = { x: mid.x + sign * h * nx, y: mid.y + sign * h * ny };

        const a0 = Math.atan2(cur.y - c.y, cur.x - c.x);
        let a1 = Math.atan2(p.y - c.y, p.x - c.x);
        if (sweep === 1 && a1 < a0) a1 += Math.PI * 2;
        if (sweep === 0 && a1 > a0) a1 -= Math.PI * 2;

        for (let s = 1; s <= perSegment; s += 1) {
          const a = a0 + ((a1 - a0) * s) / perSegment;
          out.push({ x: c.x + r * Math.cos(a), y: c.y + r * Math.sin(a) });
        }
        cur = p;
        break;
      }
      case 'Z': {
        cur = start;
        break;
      }
      default:
        throw new Error(`unsupported path command: ${String(cmd)}`);
    }
  }
  return out;
}

/** Greatest distance between any two points on the outline. */
function measuredMaxDiameter(value: CoinValue): number {
  const pts = samplePath(coinEdgePath(value));
  let best = 0;
  for (let a = 0; a < pts.length; a += 1) {
    for (let b = a + 1; b < pts.length; b += 1) {
      const pa = pts[a];
      const pb = pts[b];
      if (pa === undefined || pb === undefined) continue;
      const dist = Math.hypot(pa.x - pb.x, pa.y - pb.y);
      if (dist > best) best = dist;
    }
  }
  return best;
}

/* -------------------------------------------------------------------------
 * The tests
 * ----------------------------------------------------------------------- */

// The real size order of UK coins. This is the single most important visual
// fact the game teaches: value and size are unrelated.
const EXPECTED_ORDER: CoinValue[] = [5, 1, 20, 100, 10, 2, 50, 200];

describe('coin diameters', () => {
  it('sorting the coins by quoted diameter gives the real size order', () => {
    const byDiameter = [...ALL_COIN_VALUES].sort(
      (a, b) => COIN_GEOMETRY[a].diameterMm - COIN_GEOMETRY[b].diameterMm,
    );
    expect(byDiameter).toEqual(EXPECTED_ORDER);
  });

  it('sorting by RENDERED maximum diameter gives the same order', () => {
    const measured = new Map<CoinValue, number>(
      ALL_COIN_VALUES.map((v) => [v, measuredMaxDiameter(v)]),
    );
    const byMeasured = [...ALL_COIN_VALUES].sort(
      (a, b) => (measured.get(a) ?? 0) - (measured.get(b) ?? 0),
    );
    expect(byMeasured).toEqual(EXPECTED_ORDER);
  });

  it('the £1 renders strictly smaller than the 10p, as in real life', () => {
    // The bug this test exists to prevent: treating the £1's quoted 23.4mm as
    // an across-the-flats measurement inflates its true maximum diameter to
    // ~24.2mm, overtaking the 10p at 24.5mm and inverting the real order.
    expect(measuredMaxDiameter(100)).toBeLessThan(measuredMaxDiameter(10));
    expect(measuredMaxDiameter(100)).toBeGreaterThan(measuredMaxDiameter(20));
  });

  it('every coin renders at its quoted maximum diameter', () => {
    for (const value of ALL_COIN_VALUES) {
      const expected = COIN_GEOMETRY[value].diameterMm * MM_TO_PX;
      const actual = measuredMaxDiameter(value);
      // The £1's corner fillets shave a hair off the vertex-to-vertex span;
      // everything else lands on the nose.
      expect(actual).toBeGreaterThan(expected * 0.97);
      expect(actual).toBeLessThanOrEqual(expected * 1.001);
      expect(renderedMaxDiameterPx(value)).toBeCloseTo(expected, 6);
    }
  });

  it('no coin overflows the square box it is drawn in', () => {
    for (const value of ALL_COIN_VALUES) {
      const box = coinDiameterPx(value);
      for (const p of samplePath(coinEdgePath(value))) {
        expect(p.x).toBeGreaterThanOrEqual(-0.01);
        expect(p.y).toBeGreaterThanOrEqual(-0.01);
        expect(p.x).toBeLessThanOrEqual(box + 0.01);
        expect(p.y).toBeLessThanOrEqual(box + 0.01);
      }
    }
  });

  it('the 5p is visibly smaller than the 2p at every scale used in the app', () => {
    for (const scale of [0.72, 0.85, 0.92, 1]) {
      expect(coinDiameterPx(5, scale)).toBeLessThan(coinDiameterPx(2, scale) * 0.75);
    }
  });

  it('the heptagons are genuinely constant width', () => {
    for (const value of [20, 50] as CoinValue[]) {
      const pts = samplePath(coinEdgePath(value));
      const widths: number[] = [];
      for (let deg = 0; deg < 180; deg += 2) {
        const a = (deg * Math.PI) / 180;
        const ux = Math.cos(a);
        const uy = Math.sin(a);
        let lo = Infinity;
        let hi = -Infinity;
        for (const p of pts) {
          const proj = p.x * ux + p.y * uy;
          if (proj < lo) lo = proj;
          if (proj > hi) hi = proj;
        }
        widths.push(hi - lo);
      }
      const min = Math.min(...widths);
      const max = Math.max(...widths);
      expect(max - min).toBeLessThan(0.02);
    }
  });
});
