export type DeviceProfile = {
  cores: number;
  memoryGB: number;
  isMobile: boolean;
  baseFps: number;
  label: string;
};

export function probeDevice(): DeviceProfile {
  const cores = Math.max(1, navigator.hardwareConcurrency || 4);
  const nav = navigator as Navigator & { deviceMemory?: number };
  const memoryGB = nav.deviceMemory ?? (isProbablyMobile() ? 4 : 8);
  const isMobile = isProbablyMobile();
  let baseFps: number;
  if (isMobile) baseFps = cores >= 8 ? 30 : cores >= 4 ? 24 : 18;
  else baseFps = cores >= 8 && memoryGB >= 8 ? 48 : cores >= 4 ? 36 : 24;
  const kind = isMobile ? "Phone" : "PC";
  const label = `${kind} · ${cores} cores · ${memoryGB} GB · aim ${baseFps} fps`;
  return { cores, memoryGB, isMobile, baseFps, label };
}

function isProbablyMobile(): boolean {
  if (typeof navigator === "undefined") return false;
  if (/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) return true;
  return window.matchMedia?.("(max-width: 720px)").matches ?? false;
}

/** Map measured encode cost to a sustainable frame rate. */
export function fpsFromEncodeMs(encodeMs: number, cap: number): number {
  const raw = 1000 / Math.max(8, encodeMs * 1.2);
  return Math.max(10, Math.min(cap, Math.round(raw)));
}
