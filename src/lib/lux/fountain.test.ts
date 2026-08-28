import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  encodeSymbol,
  getCdf,
  LTDecoder,
  roundtripFountain,
  splitBlocks,
  symbolNeighbors,
} from "./fountain.ts";

describe("fountain roundtrip", () => {
  it("rebuilds random payloads of several sizes", () => {
    for (const n of [1, 17, 400, 4096, 12_000]) {
      const bytes = new Uint8Array(n);
      for (let i = 0; i < n; i++) bytes[i] = (i * 37 + n) & 0xff;
      const result = roundtripFountain(bytes, 64);
      assert.equal(result.ok, true, `n=${n} k=${result.k} symbols=${result.symbols}`);
      assert.ok(result.symbols <= result.k * 8);
    }
  });

  it("peels systematic then LT symbols", () => {
    const data = new Uint8Array(320);
    for (let i = 0; i < data.length; i++) data[i] = i & 0xff;
    const blockSize = 32;
    const blocks = splitBlocks(data, blockSize);
    const k = blocks.length;
    const cdf = getCdf(k);
    const dec = new LTDecoder(k, blockSize);
    let esi = 0;
    while (!dec.done && esi < k * 6) {
      const neigh = symbolNeighbors(esi, k, cdf);
      dec.add(esi, encodeSymbol(blocks, neigh));
      esi += 1;
    }
    assert.equal(dec.done, true);
    const out = dec.assemble(data.length);
    assert.deepEqual(out, data);
  });
});
