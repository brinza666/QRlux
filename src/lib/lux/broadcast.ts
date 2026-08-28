import { fpsFromEncodeMs } from "./device";
import { bytesToB64, drawMatrix, drawUrlQr, encodeFrameQr, qrVersionForBytes } from "./qr";
import type { RxStats, Transmitter } from "./codec";
import { RECEIVE_WEB_URL } from "./site";
import { loadTune, type Tune } from "./settings";

export function startBroadcast(opts: {
  tx: Transmitter;
  canvas: HTMLCanvasElement | null | (() => HTMLCanvasElement | null);
  payloadBytes: number;
  filename: string;
  getTargetFps?: () => number;
  getTune?: () => Tune;
  handshakeUrl?: string;
  onStats: (patch: Partial<RxStats>) => void;
  onFrameBytes?: (bytes: Uint8Array) => void;
}): { stop: () => void } {
  const handshake = opts.handshakeUrl ?? RECEIVE_WEB_URL;
  const first = opts.tx.headerBytes();
  const version = qrVersionForBytes(bytesToB64(first).length);
  let cancelled = false;
  let raf = 0;
  let lastT = 0;
  let frames = 0;
  let fpsWindow = performance.now();
  let ema = 12;
  let esi = 0;
  let unique = 0;
  let holdLeft = 0;
  let pending = first;
  const cycleAt = performance.now();

  const tuneNow = () => opts.getTune?.() ?? loadTune();
  const cap = () => Math.max(8, opts.getTargetFps?.() ?? tuneNow().fps);

  opts.onStats({
    filename: opts.filename,
    payloadBytes: opts.payloadBytes,
    k: opts.tx.header.k,
    blockLen: opts.tx.header.blockSize,
    locked: true,
    session: (opts.tx.header.session >>> 0).toString(16).padStart(8, "0").slice(-4),
    bytesPerFrame: first.byteLength,
  });

  const canvasOf = () => (typeof opts.canvas === "function" ? opts.canvas() : opts.canvas);

  const drawBytes = (bytes: Uint8Array) => {
    const t0 = performance.now();
    const qr = encodeFrameQr(bytes, version);
    const canvas = canvasOf();
    if (canvas) drawMatrix(canvas, qr.matrix);
    opts.onFrameBytes?.(bytes);
    ema = ema * 0.8 + (performance.now() - t0) * 0.2;
    frames += 1;
    const now = performance.now();
    if (now - fpsWindow >= 400) {
      opts.onStats({
        txFps: (frames / (now - fpsWindow)) * 1000,
        captureFps: (frames / (now - fpsWindow)) * 1000,
        bytesPerFrame: bytes.byteLength,
        filename: opts.filename,
        payloadBytes: opts.payloadBytes,
        k: opts.tx.header.k,
        blockLen: opts.tx.header.blockSize,
        locked: true,
        framesNew: unique,
        recovered: Math.min(unique, opts.tx.header.k),
      });
      frames = 0;
      fpsWindow = now;
    }
  };

  const nextUnique = (tune: Tune): Uint8Array => {
    unique += 1;
    if (unique <= 8 || unique % tune.headerEvery === 0) {
      return opts.tx.headerBytes();
    }
    if (tune.echoPct > 0 && esi > 4 && Math.random() * 100 < tune.echoPct) {
      const span = Math.min(esi, Math.max(2, opts.tx.header.k * 2));
      const echo = (Math.floor(Math.random() * (span / 2)) * 2) % Math.max(2, span);
      return opts.tx.symbolAt(echo);
    }
    const bytes = opts.tx.symbolAt(esi);
    esi += 1;
    return bytes;
  };

  drawBytes(pending);
  holdLeft = Math.max(0, tuneNow().hold - 1);

  const loop = (t: number) => {
    if (cancelled) return;
    const tune = tuneNow();
    const frameMs = 1000 / fpsFromEncodeMs(ema, cap());
    if (t - lastT >= frameMs) {
      lastT = t;
      const canvas = canvasOf();
      const inHandshake = tune.handshakeLoop && canvas && (t - cycleAt) % 9000 < 1200;
      if (inHandshake) {
        drawUrlQr(canvas, handshake);
      } else if (holdLeft > 0) {
        drawBytes(pending);
        holdLeft -= 1;
      } else {
        pending = nextUnique(tune);
        drawBytes(pending);
        holdLeft = Math.max(0, tune.hold - 1);
      }
    }
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);

  return {
    stop() {
      cancelled = true;
      cancelAnimationFrame(raf);
    },
  };
}
