import { FPS_DEFAULT, FPS_MAX, FPS_MIN } from "./site";

export type Density = "easy" | "balanced" | "fast";

export type Tune = {
  fps: number;
  hold: number;
  headerEvery: number;
  echoPct: number;
  handshakeLoop: boolean;
  handshakeSec: number;
  density: Density;
};

const KEY = "lux.tune.v1";

export const TUNE_DEFAULT: Tune = {
  fps: 10,
  hold: 2,
  headerEvery: 3,
  echoPct: 12,
  handshakeLoop: false,
  handshakeSec: 8,
  density: "easy",
};

export const TUNE_META = {
  fps: { min: FPS_MIN, max: FPS_MAX, label: "Display fps", hint: "How fast the plate flips. Lower is easier for the camera." },
  hold: { min: 1, max: 8, label: "Hold each QR", hint: "Repeat the same code this many times so the camera can freeze it." },
  headerEvery: { min: 2, max: 12, label: "Header every N", hint: "Lock frames. More headers = faster lock, slightly less data." },
  echoPct: { min: 0, max: 40, label: "Echo %", hint: "Randomly re-send earlier pieces so you never wait for a full loop." },
} as const;

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(n)));
}

export function sanitizeTune(raw: Partial<Tune> | null | undefined): Tune {
  const d = TUNE_DEFAULT;
  const fps = clamp(Number(raw?.fps ?? d.fps), FPS_MIN, FPS_MAX);
  const density: Density =
    raw?.density === "balanced" || raw?.density === "fast" || raw?.density === "easy"
      ? raw.density
      : d.density;
  return {
    fps,
    hold: clamp(Number(raw?.hold ?? d.hold), 1, 8),
    headerEvery: clamp(Number(raw?.headerEvery ?? d.headerEvery), 2, 12),
    echoPct: clamp(Number(raw?.echoPct ?? d.echoPct), 0, 40),
    handshakeLoop: Boolean(raw?.handshakeLoop),
    handshakeSec: clamp(Number(raw?.handshakeSec ?? d.handshakeSec), 3, 20),
    density,
  };
}

export function loadTune(): Tune {
  if (typeof window === "undefined") return TUNE_DEFAULT;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { ...TUNE_DEFAULT };
    return sanitizeTune(JSON.parse(raw) as Partial<Tune>);
  } catch {
    return { ...TUNE_DEFAULT };
  }
}

export function saveTune(tune: Tune): Tune {
  const next = sanitizeTune(tune);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

export function densityCap(density: Density): { min: number; max: number; targetK: number } {
  // Block sizes stay inside a phone-scannable QR (see FOUNTAIN_MAX_VERSION).
  if (density === "easy") return { min: 160, max: 320, targetK: 80 };
  if (density === "fast") return { min: 240, max: 400, targetK: 120 };
  return { min: 192, max: 360, targetK: 96 };
}
