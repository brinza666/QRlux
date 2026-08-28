import type { FilePayload } from "./codec";

function fillRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

/** Procedural still — a window of light, generated at runtime so the payload is original. */
export async function makeWindowLight(): Promise<FilePayload> {
  const w = 720;
  const h = 405;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("Canvas unavailable");

  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#14151a");
  sky.addColorStop(1, "#070708");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  const beam = ctx.createRadialGradient(w * 0.62, h * 0.28, 12, w * 0.55, h * 0.42, w * 0.55);
  beam.addColorStop(0, "rgba(244,244,245,0.55)");
  beam.addColorStop(0.35, "rgba(196,200,208,0.18)");
  beam.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = beam;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.translate(w * 0.58, h * 0.08);
  ctx.fillStyle = "#0c0c0e";
  ctx.fillRect(-8, -8, 220, 250);
  ctx.fillStyle = "#d8dbe2";
  ctx.fillRect(0, 0, 204, 234);
  ctx.fillStyle = "#9aa1ad";
  ctx.fillRect(0, 0, 204, 18);
  ctx.fillRect(0, 108, 204, 10);
  ctx.fillRect(96, 0, 10, 234);
  ctx.restore();

  for (let i = 0; i < 7; i++) {
    const x = 40 + i * 28;
    fillRect(ctx, x, 0, 10, h, `rgba(8,8,10,${0.18 + (i % 2) * 0.08})`);
  }

  ctx.fillStyle = "#101114";
  ctx.fillRect(0, h - 70, w, 70);
  ctx.fillStyle = "#1a1b20";
  ctx.fillRect(0, h - 78, w, 10);

  const grain = ctx.getImageData(0, 0, w, h);
  const d = grain.data;
  for (let i = 0; i < d.length; i += 16) {
    const n = (Math.random() - 0.5) * 18;
    d[i] = Math.max(0, Math.min(255, (d[i] ?? 0) + n));
    d[i + 1] = Math.max(0, Math.min(255, (d[i + 1] ?? 0) + n));
    d[i + 2] = Math.max(0, Math.min(255, (d[i + 2] ?? 0) + n));
  }
  ctx.putImageData(grain, 0, 0);

  ctx.fillStyle = "rgba(244,244,245,0.55)";
  ctx.font = "500 13px Sora, system-ui, sans-serif";
  ctx.fillText("LUX  ·  arrived as light", 28, h - 28);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("jpeg failed"))), "image/jpeg", 0.62);
  });
  const bytes = new Uint8Array(await blob.arrayBuffer());
  return { filename: "window-light.jpg", mime: "image/jpeg", bytes };
}

export function makeNote(): FilePayload {
  const text = `LUX optical transfer
====================

This note never touched a network path between the two devices.
It was split into source blocks, mixed with a Luby Transform fountain
code, and painted as a stream of QR frames.

Any subset of those frames — in any order, with drops — is enough
to rebuild the file. The camera is the only radio.

SHA-256 is checked before the file is offered back.

— transmitted as light
`;
  const bytes = new TextEncoder().encode(text);
  return { filename: "arrived-as-light.txt", mime: "text/plain", bytes };
}

export const APK_MIME = "application/vnd.android.package-archive";

export const APK_SAMPLES = {
  send: {
    filename: "lux-send.apk",
    urls: [
      "./releases/lux-send.apk",
      "/releases/lux-send.apk",
      "https://github.com/brinza666/QRlux/releases/download/v1.0.0/lux-send.apk",
    ],
  },
  receive: {
    filename: "lux-receive.apk",
    urls: [
      "./releases/lux-receive.apk",
      "/releases/lux-receive.apk",
      "https://github.com/brinza666/QRlux/releases/download/v1.0.0/lux-receive.apk",
    ],
  },
} as const;

export type ApkKind = keyof typeof APK_SAMPLES;

export async function loadApkSample(kind: ApkKind): Promise<FilePayload> {
  const spec = APK_SAMPLES[kind];
  let lastErr: unknown;
  for (const url of spec.urls) {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        lastErr = new Error(`${url} → ${res.status}`);
        continue;
      }
      const bytes = new Uint8Array(await res.arrayBuffer());
      if (bytes.byteLength < 1000) {
        lastErr = new Error(`${url} too small`);
        continue;
      }
      return { filename: spec.filename, mime: APK_MIME, bytes };
    } catch (err) {
      lastErr = err;
    }
  }
  throw new Error(
    `Could not load ${spec.filename}. ${lastErr instanceof Error ? lastErr.message : ""}`.trim(),
  );
}

export async function fileFromBlob(file: File): Promise<FilePayload> {
  const buf = new Uint8Array(await file.arrayBuffer());
  return {
    filename: file.name || "untitled.bin",
    mime: file.type || "application/octet-stream",
    bytes: buf,
  };
}

