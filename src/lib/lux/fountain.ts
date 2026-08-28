/** Luby Transform fountain code with a robust soliton degree distribution.
 *
 * Knobs worth turning when you fork this:
 *   - `robustSolitonCdf` c / delta — extra-degree mass
 *   - `symbolNeighbors` — mix of systematic (degree-1) vs rateless LT symbols
 *   - ESI is the only thing the receiver needs; both sides re-derive the
 *     neighbor set from (esi, k) so packets stay small.
 */

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function robustSolitonCdf(k: number): Float64Array {
  const c = 0.1;
  const delta = 0.05;
  const R = Math.max(1, c * Math.log(k / delta) * Math.sqrt(k));
  const pdf = new Float64Array(k + 1);
  pdf[1] += 1 / k;
  for (let d = 2; d <= k; d++) pdf[d] += 1 / (d * (d - 1));
  const kR = Math.max(1, Math.min(k, Math.floor(k / R)));
  for (let d = 1; d < kR; d++) pdf[d] += R / (d * k);
  pdf[kR] += (R * Math.log(R / delta)) / k;
  let sum = 0;
  for (let d = 1; d <= k; d++) sum += pdf[d];
  const cdf = new Float64Array(k + 1);
  let acc = 0;
  for (let d = 1; d <= k; d++) {
    acc += pdf[d] / sum;
    cdf[d] = acc;
  }
  cdf[k] = 1;
  return cdf;
}

const cdfCache = new Map<number, Float64Array>();

export function getCdf(k: number): Float64Array {
  let cdf = cdfCache.get(k);
  if (!cdf) {
    cdf = robustSolitonCdf(k);
    cdfCache.set(k, cdf);
  }
  return cdf;
}

function sampleDegree(rng: () => number, cdf: Float64Array): number {
  const r = rng();
  const k = cdf.length - 1;
  for (let d = 1; d <= k; d++) {
    if (r <= cdf[d]!) return d;
  }
  return k;
}

export function ltNeighbors(esi: number, k: number, cdf: Float64Array): number[] {
  if (k <= 1) return [0];
  const rng = mulberry32((Math.imul(esi + 1, 0x9e3779b9) ^ Math.imul(k, 0x85ebca6b)) >>> 0);
  const degree = Math.min(k, Math.max(1, sampleDegree(rng, cdf)));
  const set = new Set<number>();
  let guard = 0;
  while (set.size < degree && guard < degree * 16) {
    set.add(Math.floor(rng() * k));
    guard++;
  }
  if (set.size === 0) set.add(esi % k);
  return [...set];
}

/** Mix of LT symbols and systematic (degree-1) symbols so decoding cannot stall. */
export function symbolNeighbors(esi: number, k: number, cdf: Float64Array): number[] {
  if (k <= 1) return [0];
  if (esi >= k * 2) return [esi % k];
  if (esi % 2 === 0) return [(esi / 2) % k];
  return ltNeighbors(esi, k, cdf);
}

export function splitBlocks(data: Uint8Array, blockSize: number): Uint8Array[] {
  const k = Math.max(1, Math.ceil(data.length / blockSize) || 1);
  const blocks: Uint8Array[] = [];
  for (let i = 0; i < k; i++) {
    const b = new Uint8Array(blockSize);
    const start = i * blockSize;
    const end = Math.min(start + blockSize, data.length);
    if (end > start) b.set(data.subarray(start, end));
    blocks.push(b);
  }
  return blocks;
}

export function xorInto(target: Uint8Array, src: Uint8Array): void {
  const n = target.length;
  for (let i = 0; i < n; i++) target[i] ^= src[i]!;
}

export function encodeSymbol(blocks: Uint8Array[], neighbors: number[]): Uint8Array {
  const out = new Uint8Array(blocks[0]!.length);
  for (const i of neighbors) xorInto(out, blocks[i]!);
  return out;
}

type Pending = { neigh: number[]; data: Uint8Array };

export class LTDecoder {
  readonly k: number;
  readonly blockSize: number;
  readonly blocks: (Uint8Array | null)[];
  recovered = 0;
  private pending: Pending[] = [];

  constructor(k: number, blockSize: number) {
    this.k = k;
    this.blockSize = blockSize;
    this.blocks = Array.from({ length: k }, () => null);
  }

  get done(): boolean {
    return this.recovered >= this.k;
  }

  add(esi: number, payload: Uint8Array): boolean {
    if (this.done) return false;
    if (payload.length !== this.blockSize) return false;
    const neigh = symbolNeighbors(esi, this.k, getCdf(this.k));
    const data = payload.slice();
    return this.ingest(neigh, data);
  }

  private ingest(rawNeigh: number[], data: Uint8Array): boolean {
    const neigh: number[] = [];
    for (const i of rawNeigh) {
      const known = this.blocks[i];
      if (known) xorInto(data, known);
      else neigh.push(i);
    }
    if (neigh.length === 0) return false;
    if (neigh.length === 1) {
      return this.recover(neigh[0]!, data);
    }
    this.pending.push({ neigh, data });
    return false;
  }

  private recover(index: number, data: Uint8Array): boolean {
    if (this.blocks[index]) return false;
    const copy = data.slice();
    this.blocks[index] = copy;
    this.recovered += 1;
    if (this.done) {
      this.pending = [];
      return true;
    }
    const still: Pending[] = [];
    const extra: Pending[] = [];
    for (const p of this.pending) {
      const at = p.neigh.indexOf(index);
      if (at === -1) {
        still.push(p);
        continue;
      }
      p.neigh.splice(at, 1);
      xorInto(p.data, copy);
      if (p.neigh.length === 0) continue;
      extra.push(p);
    }
    this.pending = still;
    for (const p of extra) this.ingest(p.neigh, p.data);
    return true;
  }

  assemble(byteLength: number): Uint8Array {
    const out = new Uint8Array(this.k * this.blockSize);
    for (let i = 0; i < this.k; i++) {
      const b = this.blocks[i];
      if (!b) throw new Error(`Missing block ${i}`);
      out.set(b, i * this.blockSize);
    }
    return out.subarray(0, byteLength);
  }
}

export function roundtripFountain(bytes: Uint8Array, blockSize: number): {
  ok: boolean;
  symbols: number;
  k: number;
} {
  const blocks = splitBlocks(bytes, blockSize);
  const k = blocks.length;
  const cdf = getCdf(k);
  const dec = new LTDecoder(k, blockSize);
  let esi = 0;
  const cap = k * 8;
  while (!dec.done && esi < cap) {
    const n = symbolNeighbors(esi, k, cdf);
    dec.add(esi, encodeSymbol(blocks, n));
    esi++;
  }
  if (!dec.done) return { ok: false, symbols: esi, k };
  const out = dec.assemble(bytes.length);
  const ok = out.length === bytes.length && out.every((b, i) => b === bytes[i]);
  return { ok, symbols: esi, k };
}
