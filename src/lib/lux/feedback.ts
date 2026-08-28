const STORAGE = "lux-feedback";

let audioCtx: AudioContext | null = null;
let lastTick = 0;
let enabled = true;
let gestured = false;

function readPref(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE);
    if (raw === "off") return false;
    if (raw === "on") return true;
  } catch {
    /* private mode */
  }
  return true;
}

enabled = typeof window !== "undefined" ? readPref() : true;

export function isFeedbackOn(): boolean {
  return enabled;
}

export function setFeedbackOn(on: boolean): void {
  enabled = on;
  try {
    localStorage.setItem(STORAGE, on ? "on" : "off");
  } catch {
    /* ignore */
  }
}

function ctx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!audioCtx) audioCtx = new AC();
  if (audioCtx.state === "suspended") void audioCtx.resume();
  return audioCtx;
}

function tone(freq: number, durMs: number, gain = 0.06, type: OscillatorType = "sine"): void {
  const ac = ctx();
  if (!ac) return;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, ac.currentTime);
  g.gain.exponentialRampToValueAtTime(gain, ac.currentTime + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + durMs / 1000);
  osc.connect(g);
  g.connect(ac.destination);
  osc.start();
  osc.stop(ac.currentTime + durMs / 1000 + 0.02);
}

export function haptic(pattern: number | number[]): void {
  if (!enabled || !gestured) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* optional */
  }
}

export function installAudioUnlock(): () => void {
  if (typeof window === "undefined") return () => {};
  const unlock = () => {
    gestured = true;
    ctx();
  };
  window.addEventListener("pointerdown", unlock, { once: true });
  window.addEventListener("touchstart", unlock, { once: true });
  window.addEventListener("click", unlock, { once: true });
  return () => {
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("touchstart", unlock);
    window.removeEventListener("click", unlock);
  };
}

export type Cue = "lock" | "tick" | "complete" | "error" | "start";

export function playCue(cue: Cue): void {
  if (!enabled) return;
  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  switch (cue) {
    case "start":
      tone(392, 70, 0.04);
      haptic(12);
      break;
    case "lock":
      tone(523, 90, 0.07);
      haptic([18, 30, 24]);
      break;
    case "tick": {
      const now = performance.now();
      if (now - lastTick < 140) return;
      lastTick = now;
      if (reduced) return;
      tone(880, 28, 0.028, "triangle");
      break;
    }
    case "complete":
      tone(523, 110, 0.08);
      window.setTimeout(() => tone(784, 180, 0.09), 120);
      haptic([40, 40, 80]);
      break;
    case "error":
      tone(196, 180, 0.07, "square");
      haptic([60, 40, 60]);
      break;
  }
}
