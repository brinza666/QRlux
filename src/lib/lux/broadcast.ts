import { fpsFromEncodeMs } from "./device";
import { bytesToB64, drawMatrix, drawUrlQr, encodeFrameQr, qrVersionForBytes } from "./qr";
import type { RxStats } from "./codec";
import type { Transmitter } from "./codec";
import { FPS_DEFAULT, RECEIVE_WEB_URL } from "./site";

export function startBroadcast(opts: {
  tx: Transmitter;
  canvas: HTMLCanvasElement | null | (() => HTMLCanvasElement | null);
  payloadBytes: number;
  filename: string;
  getTargetFps?: () => number;
  handshakeUrl?: string;
  onStats: (patch: Partial<RxStats>) => void;
  onFrameBytes?: (bytes: Uint8Array) => void;
}): { stop: () => void } {
  const first = opts.tx.next();
  const version = qrVersionForBytes(bytesToB64(first.bytes).length);
  const handshake = opts.handshakeUrl ?? RECEIVE_WEB_URL;
  let cancelled = false;
  let raf = 0;
  let last = 0;
  let frames = 0;
  let fpsWindow = performance.now();
  let ema = 12;
  const cap = () => Math.max(8, opts.getTargetFps?.() ?? FPS_DEFAULT);
  let frameMs = 1000 / cap();
  let pending = first.bytes;
  let cycleAt = performance.now();

  opts.onStats({
    filename: opts.filename,
    payloadBytes: opts.payloadBytes,
    k: opts.tx.header.k,
    blockLen: opts.tx.header.blockSize,
    locked: true,
    session: (opts.tx.header.session >>> 0).toString(16).padStart(8, "0").slice(-4),
    bytesPerFrame: first.bytes.byteLength,
  });

  const canvasOf = () => (typeof opts.canvas === "function" ? opts.canvas() : opts.canvas);

  const pumpFountain = (bytes: Uint8Array) => {
    const t0 = performance.now();
    const qr = encodeFrameQr(bytes, version);
    const canvas = canvasOf();
    if (canvas) drawMatrix(canvas, qr.matrix);
    opts.onFrameBytes?.(bytes);
    const cost = performance.now() - t0;
    ema = ema * 0.8 + cost * 0.2;
    const fps = fpsFromEncodeMs(ema, cap());
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

  pumpFountain(pending);
  pending = opts.tx.next().bytes;

  const loop = (t: number) => {
    if (cancelled) return;
    if (t - last >= frameMs) {
      last = t;
      const elapsed = t - cycleAt;
      const inHandshake = elapsed % 9000 < 1400;
      const canvas = canvasOf();
      if (inHandshake && canvas) {
        drawUrlQr(canvas, handshake);
      } else {
        pumpFountain(pending);
        pending = opts.tx.next().bytes;
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
