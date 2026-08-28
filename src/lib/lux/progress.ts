import type { RxStats } from "./codec";
import { formatBytes, formatRate } from "@/lib/utils";

export type TransferProgress = {
  pct: number;
  remainingBlocks: number | null;
  etaSec: number | null;
  phrase: string;
  detail: string;
};

export function transferProgress(stats: RxStats, role: "receive" | "send" | "demo"): TransferProgress {
  const k = stats.k;
  const recovered = stats.recovered;
  const pct = k ? Math.min(1, recovered / Math.max(k, 1)) : 0;
  const remainingBlocks = k ? Math.max(0, k - recovered) : null;

  let etaSec: number | null = null;
  if (k && recovered >= 2 && stats.elapsedSec > 0.35) {
    const rate = recovered / stats.elapsedSec;
    const need = Math.max(0, k * 1.08 - recovered);
    etaSec = rate > 0.08 ? need / rate : null;
  }

  let phrase: string;
  let detail: string;

  if (role === "send") {
    phrase = stats.filename ? `Broadcasting ${stats.filename}` : "Waiting for a file";
    detail = stats.payloadBytes
      ? `${formatBytes(stats.payloadBytes)} · ${k || "—"} pieces · keep the screen bright`
      : "Pick a file to start the QR fountain";
    return { pct: stats.filename ? 1 : 0, remainingBlocks: null, etaSec: null, phrase, detail };
  }

  if (stats.complete) {
    phrase = "File is ready";
    detail = stats.filename
      ? `${stats.filename} · ${formatBytes(stats.payloadBytes)}`
      : "Checksum matched";
    return { pct: 1, remainingBlocks: 0, etaSec: 0, phrase, detail };
  }

  if (!stats.locked) {
    phrase = role === "demo" ? "Encoding the fountain…" : "Point the camera at the QR";
    detail = "Waiting for a header frame — hold still once you see the plate";
    return { pct: 0, remainingBlocks: null, etaSec: null, phrase, detail };
  }

  if (remainingBlocks !== null && remainingBlocks <= 0) {
    phrase = "Finishing checksum…";
    detail = stats.filename ? stats.filename : "Verifying the file";
  } else if (remainingBlocks !== null && remainingBlocks <= 4) {
    phrase = `Almost there — ${remainingBlocks} piece${remainingBlocks === 1 ? "" : "s"} left`;
    detail = etaLabel(etaSec);
  } else {
    phrase = stats.filename ? `Receiving ${stats.filename}` : "Locked on — gathering pieces";
    const bits = [
      k ? `${recovered} of ${k} pieces` : null,
      stats.payloadBytes ? formatBytes(stats.payloadBytes) : null,
      stats.goodputKBs ? formatRate(stats.goodputKBs * 1024) : null,
    ].filter(Boolean);
    detail = bits.join(" · ");
  }

  return { pct, remainingBlocks, etaSec, phrase, detail };
}

export function etaLabel(sec: number | null): string {
  if (sec == null || !Number.isFinite(sec)) return "estimating time left…";
  if (sec < 0.8) return "a moment";
  if (sec < 90) return `about ${Math.max(1, Math.ceil(sec))}s left`;
  return `about ${Math.ceil(sec / 60)} min left`;
}

export function percentLabel(pct: number): string {
  if (pct <= 0) return "0%";
  if (pct >= 1) return "100%";
  return `${Math.floor(pct * 100)}%`;
}
