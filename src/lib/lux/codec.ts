import {
  encodeSymbol,
  getCdf,
  LTDecoder,
  splitBlocks,
  symbolNeighbors,
} from "./fountain";
import { densityCap, loadTune } from "./settings";

export const MAGIC = new Uint8Array([0x4c, 0x55, 0x58, 0x01]); // LUX\x01
export const TYPE_HEADER = 1;
export const TYPE_SYMBOL = 2;
export const MAX_FILE_BYTES = 16 * 1024 * 1024;
export const HEADER_PERIOD = 6;
export const MAX_K = 24_000;

export type FilePayload = {
  filename: string;
  mime: string;
  bytes: Uint8Array;
};

export type Header = {
  k: number;
  blockSize: number;
  payloadSize: number;
  origSize: number;
  session: number;
  sha256: Uint8Array;
  gzip: boolean;
  filename: string;
  mime: string;
  frameLen: number;
};

export type Unpacked =
  | { kind: "header"; header: Header }
  | { kind: "symbol"; esi: number; payload: Uint8Array };

const NAME_MAX = 80;
const MIME_MAX = 40;
const HEADER_CORE = 4 + 1 + 1 + 2 + 2 + 4 + 4 + 4 + 32 + 1 + NAME_MAX + 1 + MIME_MAX;

export function chooseBlockSize(payloadSize: number): number {
  let density = loadTune().density;
  if (payloadSize > 800_000 && density === "easy") density = "fast";
  else if (payloadSize > 250_000 && density === "easy") density = "balanced";
  const { min, max, targetK } = densityCap(density);
  const aim = payloadSize < 80_000 ? Math.min(32, targetK) : targetK;
  let bs = Math.ceil(payloadSize / aim);
  bs = Math.max(min, Math.min(max, bs));
  bs = Math.ceil(bs / 16) * 16;
  return bs;
}

export function frameLength(blockSize: number): number {
  return Math.max(9 + blockSize, HEADER_CORE);
}

function writeUtf8Padded(buf: Uint8Array, offset: number, max: number, text: string): void {
  const encoded = new TextEncoder().encode(text).slice(0, max);
  buf[offset] = encoded.length;
  buf.set(encoded, offset + 1);
}

function readUtf8Padded(buf: Uint8Array, offset: number, max: number): string {
  const len = Math.min(buf[offset] ?? 0, max);
  return new TextDecoder().decode(buf.subarray(offset + 1, offset + 1 + len));
}

export function packHeader(h: Header): Uint8Array {
  const buf = new Uint8Array(h.frameLen);
  const dv = new DataView(buf.buffer);
  buf.set(MAGIC, 0);
  buf[4] = TYPE_HEADER;
  buf[5] = h.gzip ? 1 : 0;
  dv.setUint16(6, h.k, false);
  dv.setUint16(8, h.blockSize, false);
  dv.setUint32(10, h.payloadSize, false);
  dv.setUint32(14, h.origSize, false);
  dv.setUint32(18, h.session, false);
  buf.set(h.sha256, 22);
  writeUtf8Padded(buf, 54, NAME_MAX, h.filename);
  writeUtf8Padded(buf, 54 + 1 + NAME_MAX, MIME_MAX, h.mime);
  return buf;
}

export function packSymbol(esi: number, payload: Uint8Array, frameLen: number): Uint8Array {
  const buf = new Uint8Array(frameLen);
  const dv = new DataView(buf.buffer);
  buf.set(MAGIC, 0);
  buf[4] = TYPE_SYMBOL;
  dv.setUint32(5, esi, false);
  buf.set(payload, 9);
  return buf;
}

function hasMagic(buf: Uint8Array): boolean {
  if (buf.length < 5) return false;
  for (let i = 0; i < 4; i++) if (buf[i] !== MAGIC[i]) return false;
  return true;
}

export function unpackFrame(buf: Uint8Array): Unpacked | null {
  if (!hasMagic(buf)) return null;
  const type = buf[4];
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  if (type === TYPE_HEADER) {
    if (buf.length < HEADER_CORE) return null;
    const gzip = (buf[5] & 1) === 1;
    const k = dv.getUint16(6, false);
    const blockSize = dv.getUint16(8, false);
    const payloadSize = dv.getUint32(10, false);
    const origSize = dv.getUint32(14, false);
    const session = dv.getUint32(18, false);
    const sha256 = buf.subarray(22, 54).slice();
    const filename = readUtf8Padded(buf, 54, NAME_MAX);
    const mime = readUtf8Padded(buf, 54 + 1 + NAME_MAX, MIME_MAX);
    if (k < 1 || k > MAX_K || blockSize < 16 || blockSize > 4096) return null;
    return {
      kind: "header",
      header: {
        k,
        blockSize,
        payloadSize,
        origSize,
        session,
        sha256,
        gzip,
        filename,
        mime,
        frameLen: buf.length,
      },
    };
  }
  if (type === TYPE_SYMBOL) {
    if (buf.length < 9) return null;
    const esi = dv.getUint32(5, false);
    const payload = buf.subarray(9);
    return { kind: "symbol", esi, payload };
  }
  return null;
}

export async function sha256(data: Uint8Array): Promise<Uint8Array> {
  const hash = await crypto.subtle.digest("SHA-256", bytesToBuffer(data));
  return new Uint8Array(hash);
}

function bytesToBuffer(data: Uint8Array): ArrayBuffer {
  return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
}

export async function maybeGzip(data: Uint8Array): Promise<{ data: Uint8Array; gzip: boolean }> {
  if (typeof CompressionStream === "undefined") return { data, gzip: false };
  try {
    const stream = new Blob([bytesToBuffer(data)]).stream().pipeThrough(new CompressionStream("gzip"));
    const compressed = new Uint8Array(await new Response(stream).arrayBuffer());
    if (compressed.length < data.length * 0.9) return { data: compressed, gzip: true };
  } catch {
    /* gzip optional */
  }
  return { data, gzip: false };
}

export async function gunzip(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytesToBuffer(data)]).stream().pipeThrough(new DecompressionStream("gzip"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

export type TxFrame = {
  bytes: Uint8Array;
  kind: "header" | "symbol";
  esi?: number;
};

export class Transmitter {
  readonly header: Header;
  readonly origBytes: Uint8Array;
  private readonly blocks: Uint8Array[];
  private readonly cdf: Float64Array;
  private esi = 0;
  private tick = 0;

  private constructor(header: Header, origBytes: Uint8Array, blocks: Uint8Array[]) {
    this.header = header;
    this.origBytes = origBytes;
    this.blocks = blocks;
    this.cdf = getCdf(header.k);
  }

  static async fromFile(file: FilePayload): Promise<Transmitter> {
    if (file.bytes.byteLength > MAX_FILE_BYTES) {
      throw new Error(`File is over the ${Math.round(MAX_FILE_BYTES / (1024 * 1024))} MB limit.`);
    }
    const hash = await sha256(file.bytes);
    const { data: payload, gzip } = await maybeGzip(file.bytes);
    const blockSize = chooseBlockSize(payload.byteLength);
    const blocks = splitBlocks(payload, blockSize);
    const session = crypto.getRandomValues(new Uint32Array(1))[0]!;
    const header: Header = {
      k: blocks.length,
      blockSize,
      payloadSize: payload.byteLength,
      origSize: file.bytes.byteLength,
      session,
      sha256: hash,
      gzip,
      filename: file.filename.slice(0, NAME_MAX),
      mime: (file.mime || "application/octet-stream").slice(0, MIME_MAX),
      frameLen: frameLength(blockSize),
    };
    return new Transmitter(header, file.bytes, blocks);
  }

  headerBytes(): Uint8Array {
    return packHeader(this.header);
  }

  symbolAt(esi: number): Uint8Array {
    const neigh = symbolNeighbors(esi, this.header.k, this.cdf);
    const payload = encodeSymbol(this.blocks, neigh);
    return packSymbol(esi, payload, this.header.frameLen);
  }

  next(): TxFrame {
    this.tick += 1;
    if (this.tick === 1 || this.tick % HEADER_PERIOD === 0) {
      return { bytes: packHeader(this.header), kind: "header" };
    }
    const esi = this.esi++;
    const neigh = symbolNeighbors(esi, this.header.k, this.cdf);
    const payload = encodeSymbol(this.blocks, neigh);
    return { bytes: packSymbol(esi, payload, this.header.frameLen), kind: "symbol", esi };
  }
}

export type RxStats = {
  captureFps: number;
  decodeFps: number;
  locked: boolean;
  dropped: number;
  goodputKBs: number;
  elapsedSec: number;
  framesNew: number;
  framesDup: number;
  framesRed: number;
  session: string;
  blockLen: number;
  payloadBytes: number;
  recovered: number;
  k: number;
  complete: boolean;
  bytesPerFrame: number;
  txFps: number;
  filename: string;
};

export const emptyStats = (): RxStats => ({
  captureFps: 0,
  decodeFps: 0,
  locked: false,
  dropped: 0,
  goodputKBs: 0,
  elapsedSec: 0,
  framesNew: 0,
  framesDup: 0,
  framesRed: 0,
  session: "—",
  blockLen: 0,
  payloadBytes: 0,
  recovered: 0,
  k: 0,
  complete: false,
  bytesPerFrame: 0,
  txFps: 0,
  filename: "",
});

export type CompleteResult = {
  blob: Blob;
  header: Header;
  bytes: Uint8Array;
  elapsedMs: number;
  goodputKBs: number;
};

export class Receiver {
  header: Header | null = null;
  decoder: LTDecoder | null = null;
  complete: CompleteResult | null = null;
  stats: RxStats = emptyStats();
  onComplete: ((result: CompleteResult) => void) | null = null;
  onHeader: ((header: Header) => void) | null = null;
  error: string | null = null;

  private seen = new Set<number>();
  private early: { esi: number; payload: Uint8Array }[] = [];
  private startedAt = 0;
  private decodeEvents = 0;
  private decodeWindowStart = 0;
  private finishing = false;

  reset(): void {
    this.header = null;
    this.decoder = null;
    this.complete = null;
    this.stats = emptyStats();
    this.error = null;
    this.seen.clear();
    this.early = [];
    this.startedAt = 0;
    this.decodeEvents = 0;
    this.decodeWindowStart = 0;
    this.finishing = false;
  }

  push(bytes: Uint8Array, now = performance.now()): void {
    if (this.complete) return;
    this.stats.bytesPerFrame = bytes.byteLength;
    const frame = unpackFrame(bytes);
    if (!frame) {
      this.stats.dropped += 1;
      return;
    }
    this.decodeEvents += 1;
    if (!this.decodeWindowStart) this.decodeWindowStart = now;
    const dt = (now - this.decodeWindowStart) / 1000;
    if (dt >= 0.4) {
      this.stats.decodeFps = this.decodeEvents / dt;
      this.decodeEvents = 0;
      this.decodeWindowStart = now;
    }

    if (frame.kind === "header") {
      if (!this.header) this.applyHeader(frame.header, now);
      return;
    }

    const payload = frame.payload;
    if (!this.decoder || !this.header) {
      if (this.early.length < 128) this.early.push({ esi: frame.esi, payload: payload.slice() });
      return;
    }
    this.ingestSymbol(frame.esi, payload, now);
  }

  private applyHeader(header: Header, now: number): void {
    this.header = header;
    this.decoder = new LTDecoder(header.k, header.blockSize);
    this.startedAt = now;
    this.stats.locked = true;
    this.stats.k = header.k;
    this.stats.blockLen = header.blockSize;
    this.stats.session = (header.session >>> 0).toString(16).padStart(8, "0").slice(-4);
    this.stats.filename = header.filename;
    this.stats.payloadBytes = header.origSize;
    this.onHeader?.(header);
    const queued = this.early;
    this.early = [];
    for (const s of queued) this.ingestSymbol(s.esi, s.payload, now);
  }

  private ingestSymbol(esi: number, rawPayload: Uint8Array, now: number): void {
    const dec = this.decoder;
    const header = this.header;
    if (!dec || !header || this.complete) return;
    if (this.seen.has(esi)) {
      this.stats.framesDup += 1;
      return;
    }
    this.seen.add(esi);
    const payload =
      rawPayload.length === header.blockSize
        ? rawPayload
        : rawPayload.subarray(0, header.blockSize);
    const before = dec.recovered;
    const helped = dec.add(esi, payload);
    if (helped || dec.recovered > before) this.stats.framesNew += 1;
    else this.stats.framesRed += 1;
    this.stats.recovered = dec.recovered;
    const elapsed = Math.max(0.001, (now - this.startedAt) / 1000);
    this.stats.elapsedSec = elapsed;
    this.stats.goodputKBs = (dec.recovered * header.blockSize) / 1024 / elapsed;
    if (dec.done && !this.complete) void this.finish(now);
  }

  private async finish(now: number): Promise<void> {
    const dec = this.decoder;
    const header = this.header;
    if (!dec || !header || this.complete || this.finishing) return;
    this.finishing = true;
    try {
      let payload = dec.assemble(header.payloadSize);
      if (header.gzip) payload = await gunzip(payload);
      const hash = await sha256(payload);
      if (!bytesEqual(hash, header.sha256)) {
        this.error = "SHA-256 mismatch — payload discarded";
        this.stats.dropped += 1;
        this.finishing = false;
        return;
      }
      const elapsedMs = Math.max(1, now - this.startedAt);
      const blob = new Blob([bytesToBuffer(payload)], { type: header.mime });
      const result: CompleteResult = {
        blob,
        header,
        bytes: payload,
        elapsedMs,
        goodputKBs: payload.byteLength / 1024 / (elapsedMs / 1000),
      };
      this.complete = result;
      this.stats.complete = true;
      this.stats.payloadBytes = payload.byteLength;
      this.stats.elapsedSec = elapsedMs / 1000;
      this.stats.goodputKBs = result.goodputKBs;
      this.onComplete?.(result);
    } catch (err) {
      this.error = err instanceof Error ? err.message : "Failed to assemble payload";
      this.stats.dropped += 1;
      this.finishing = false;
    }
  }
}
