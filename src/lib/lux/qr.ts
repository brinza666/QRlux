import { encode } from "uqr";

const QR_L_BYTES = [
  0, 17, 32, 53, 78, 106, 134, 154, 192, 230, 271, 321, 367, 425, 458, 520, 586, 644, 718, 792,
  858, 929, 1003, 1091, 1171, 1273, 1367, 1465, 1528, 1628, 1732, 1840, 1952, 2068, 2188, 2303,
  2431, 2563, 2699, 2809, 2953,
];

export function qrVersionForBytes(n: number): number {
  for (let v = 1; v <= 40; v++) {
    if ((QR_L_BYTES[v] ?? 0) >= n + 8) return v;
  }
  return 40;
}

export function bytesToB64(bytes: Uint8Array): string {
  let s = "";
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) {
    s += String.fromCharCode(...bytes.subarray(i, i + step));
  }
  return btoa(s);
}

export function b64ToBytes(s: string): Uint8Array {
  const bin = atob(s.trim());
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export type QrFrame = {
  matrix: boolean[][];
  size: number;
  version: number;
  text: string;
};

export function encodeFrameQr(bytes: Uint8Array, pinnedVersion?: number): QrFrame {
  const text = bytesToB64(bytes);
  const version = pinnedVersion ?? qrVersionForBytes(text.length);
  const result = encode(text, {
    ecc: "L",
    minVersion: version,
    maxVersion: 40,
    border: 4,
    boostEcc: false,
  });
  return { matrix: result.data, size: result.size, version: result.version, text };
}

export const PLATE_PX = 888;

let scratch: HTMLCanvasElement | null = null;

function scratchOf(size: number): HTMLCanvasElement {
  if (!scratch) scratch = document.createElement("canvas");
  if (scratch.width !== size || scratch.height !== size) {
    scratch.width = size;
    scratch.height = size;
  }
  return scratch;
}

export function blitMatrix(canvas: HTMLCanvasElement, matrix: boolean[][]): void {
  const size = matrix.length;
  const src = scratchOf(size);
  const sctx = src.getContext("2d", { alpha: false });
  if (!sctx) return;
  const img = sctx.createImageData(size, size);
  const buf = img.data;
  for (let y = 0; y < size; y++) {
    const row = matrix[y]!;
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const v = row[x] ? 10 : 244;
      buf[i] = v;
      buf[i + 1] = v;
      buf[i + 2] = v;
      buf[i + 3] = 255;
    }
  }
  sctx.putImageData(img, 0, 0);
  if (canvas.width !== PLATE_PX || canvas.height !== PLATE_PX) {
    canvas.width = PLATE_PX;
    canvas.height = PLATE_PX;
  }
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) return;
  ctx.fillStyle = "#f4f4f2";
  ctx.fillRect(0, 0, PLATE_PX, PLATE_PX);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(src, 0, 0, PLATE_PX, PLATE_PX);
}

export function drawMatrix(canvas: HTMLCanvasElement, matrix: boolean[][]): void {
  blitMatrix(canvas, matrix);
}

export function drawUrlQr(canvas: HTMLCanvasElement, url: string): void {
  const result = encode(url, {
    ecc: "M",
    minVersion: 4,
    maxVersion: 12,
    border: 4,
    boostEcc: false,
  });
  drawMatrix(canvas, result.data);
}

export function parseQrText(text: string): Uint8Array | null {
  try {
    return b64ToBytes(text);
  } catch {
    return null;
  }
}
