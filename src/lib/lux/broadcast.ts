import { fpsFromEncodeMs, probeDevice } from "./device";
import { bytesToB64, drawMatrix, encodeFrameQr, qrVersionForBytes } from "./qr";
import type { RxStats } from "./codec";
import type { Transmitter } from "./codec";

export function startBroadcast(opts: {
  tx: Transmitter;
  canvas: HTMLCanvasElement | null | (() => HTMLCanvasElement | null);
  payloadBytes: number;
  filename: string;
  onStats: (patch: Partial<RxStats>) => void;
  onFrameBytes?: (bytes: Uint8Array) => void;
}): { stop: () => void } {
  const profile = probeDevice();
  const first = opts.tx.next();
  const version = qrVersionForBytes(bytesToB64(first.bytes).length);
  let cancelled = false;
  let raf = 0;
  let last = 0;
  let frames = 0;
  let fpsWindow = performance.now();
  let ema = 12;
  let frameMs = 1000 / profile.baseFps;
  let pending = first.bytes;

  opts.onStats({
    filename: opts.filename,
    payloadBytes: opts.payloadBytes,
    k: opts.tx.header.k,
    blockLen: opts.tx.header.blockSize,
    locked: true,
    session: (opts.tx.header.session >>> 0).toString(16).padStart(8, "0").slice(-4),
    bytesPerFrame: first.bytes.byteLength,
  });

  const pump = (bytes: Uint8Array) => {
    const t0 = performance.now();
    const qr = encodeFrameQr(bytes, version);
    const canvas = typeof opts.canvas === "function" ? opts.canvas() : opts.canvas;
    if (canvas) drawMatrix(canvas, qr.matrix);
    opts.onFrameBytes?.(bytes);
    const cost = performance.now() - t0;
    ema = ema * 0.8 + cost * 0.2;
    const fps = fpsFromEncodeMs(ema, profile.baseFps);
    frameMs = 1000 / fps;
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
      });
      frames = 0;
      fpsWindow = now;
    }
  };

  pump(pending);
  pending = opts.tx.next().bytes;

  const loop = (t: number) => {
    if (cancelled) return;
    if (t - last >= frameMs) {
      last = t;
      pump(pending);
      pending = opts.tx.next().bytes;
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
