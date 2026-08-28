export type CameraInfo = {
  id: string;
  label: string;
  facing: "environment" | "user" | "unknown";
};

const SAVED_LENS_KEY = "lux.lens.v1";

let active: MediaStream | null = null;
let owners = 0;

export function loadSavedLens(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(SAVED_LENS_KEY) || "";
  } catch {
    return "";
  }
}

export function saveSavedLens(id: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SAVED_LENS_KEY, id);
  } catch {
    /* ignore */
  }
}

export async function listCameras(): Promise<CameraInfo[]> {
  if (!navigator.mediaDevices?.enumerateDevices) return [];
  const devices = await navigator.mediaDevices.enumerateDevices();
  const cams = devices.filter((d) => d.kind === "videoinput");
  return cams.map((d, i) => {
    const label = d.label || `Camera ${i + 1}`;
    const facing: CameraInfo["facing"] = /front|user|face|selfie/i.test(label)
      ? "user"
      : /back|rear|environment|world/i.test(label)
        ? "environment"
        : "unknown";
    return { id: d.deviceId, label, facing };
  });
}

function camIndex(label: string): number | null {
  const m = label.match(/camera(?:2)?\s*(\d+)/i);
  return m ? Number(m[1]) : null;
}

/** Higher is better. Macro / telephoto / ultra-wide / front score last. Plain "wide" is the main lens. */
export function scoreCamera(cam: CameraInfo): number {
  const l = cam.label.toLowerCase();
  if (cam.facing === "user" || /front|selfie|face/.test(l)) return -1000;
  if (/\bmacro\b/.test(l)) return -900;
  if (/depth|tof|infrared|\bir\b/.test(l)) return -800;
  let s = 0;
  if (/ultra[\s-]?wide|ultrawide/.test(l)) s -= 700;
  if (/\btele(photo)?\b|periscope/.test(l)) s -= 600;
  if (/\b([2-9]|1[0-9])(\.\d+)?x\b/.test(l)) s -= 500;
  if (cam.facing === "environment" || /back|rear|environment|world/.test(l)) s += 300;
  if (/\bmain\b|\bprimary\b|\bstandard\b/.test(l)) s += 200;
  if (/\bwide\b/.test(l) && !/ultra/.test(l)) s += 150;
  const idx = camIndex(cam.label);
  if (idx !== null) s += Math.max(0, 80 - idx * 25);
  return s;
}

export function rankCameras(cams: CameraInfo[]): CameraInfo[] {
  return [...cams].sort((a, b) => scoreCamera(b) - scoreCamera(a));
}

export function pickDefaultCamera(cams: CameraInfo[]): string {
  if (!cams.length) return "";
  const ranked = [...cams].sort((a, b) => scoreCamera(b) - scoreCamera(a));
  return ranked[0]!.id;
}

export async function acquireCamera(deviceId?: string): Promise<MediaStream> {
  stopCamera();
  // Do not ask for 1080p — on many phones that selects the telephoto crop
  // ("mega zoom") instead of the main wide lens. Prefer 1x zoom.
  const video = (
    deviceId
      ? { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 }, zoom: 1 }
      : { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 }, zoom: 1 }
  ) as MediaTrackConstraints;
  const attempts: MediaStreamConstraints[] = [
    { audio: false, video },
    {
      audio: false,
      video: deviceId ? { deviceId: { exact: deviceId } } : { facingMode: "environment" },
    },
    { audio: false, video: true },
  ];
  let last: unknown;
  for (const c of attempts) {
    try {
      active = await navigator.mediaDevices.getUserMedia(c);
      owners = 1;
      await resetZoomToUnity();
      return active;
    } catch (err) {
      last = err;
    }
  }
  throw last instanceof Error ? last : new Error("Camera unavailable");
}

/** Open a camera, then switch to the best rear (non-macro) lens if the OS picked badly. */
export async function acquireBestCamera(preferredId?: string): Promise<{
  stream: MediaStream;
  cameras: CameraInfo[];
  deviceId: string;
}> {
  let stream = await acquireCamera(preferredId || undefined);
  const cameras = await listCameras();
  const used = stream.getVideoTracks()[0]?.getSettings?.().deviceId ?? "";
  const best = preferredId || pickDefaultCamera(cameras);
  if (best && used && best !== used && !preferredId) {
    releaseCamera();
    stream = await acquireCamera(best);
  }
  const id =
    stream.getVideoTracks()[0]?.getSettings?.().deviceId ||
    best ||
    used ||
    cameras[0]?.id ||
    "";
  return { stream, cameras, deviceId: id };
}

export function releaseCamera(): void {
  owners = Math.max(0, owners - 1);
  if (owners === 0) stopCamera();
}

function stopCamera(): void {
  active?.getTracks().forEach((t) => t.stop());
  active = null;
  owners = 0;
}

export function currentTrack(): MediaStreamTrack | null {
  return active?.getVideoTracks()[0] ?? null;
}

type Caps = { torch?: boolean; zoom?: { min: number; max: number } };

export function trackCaps(): {
  torch: boolean;
  zoom: boolean;
  zoomMin: number;
  zoomMax: number;
} {
  const track = currentTrack();
  const caps = track?.getCapabilities?.() as Caps | undefined;
  return {
    torch: Boolean(caps?.torch),
    zoom: Boolean(caps?.zoom),
    zoomMin: caps?.zoom?.min ?? 1,
    zoomMax: caps?.zoom?.max ?? 1,
  };
}

export async function setTorch(on: boolean): Promise<void> {
  const track = currentTrack();
  if (!track) return;
  try {
    await track.applyConstraints({ advanced: [{ torch: on } as MediaTrackConstraintSet] });
  } catch {
    /* not supported */
  }
}

export async function setZoom(zoom: number): Promise<void> {
  const track = currentTrack();
  if (!track) return;
  try {
    await track.applyConstraints({ advanced: [{ zoom } as MediaTrackConstraintSet] });
  } catch {
    /* not supported */
  }
}

/** Snap to optical 1× so Receive never starts on a telephoto crop. */
export async function resetZoomToUnity(): Promise<number> {
  const track = currentTrack();
  if (!track) return 1;
  const caps = track.getCapabilities?.() as Caps | undefined;
  if (!caps?.zoom) return 1;
  const min = caps.zoom.min ?? 1;
  const max = caps.zoom.max ?? 1;
  const target = min <= 1 && 1 <= max ? 1 : min;
  try {
    await track.applyConstraints({ advanced: [{ zoom: target } as MediaTrackConstraintSet] });
  } catch {
    try {
      await track.applyConstraints({ zoom: target } as MediaTrackConstraintSet);
    } catch {
      /* not supported */
    }
  }
  const now = track.getSettings?.() as { zoom?: number } | undefined;
  return now?.zoom ?? target;
}

export type ProbeResult = {
  cameras: CameraInfo[];
  recommended: string;
  saved: string;
};

/** Permission ping + labels, then stop. Lets the user pick a lens before a live zoomed preview. */
export async function probeCameras(): Promise<ProbeResult> {
  const stream = await acquireCamera();
  const cameras = rankCameras(await listCameras());
  const used = stream.getVideoTracks()[0]?.getSettings?.().deviceId ?? "";
  releaseCamera();
  const recommended = pickDefaultCamera(cameras) || used || cameras[0]?.id || "";
  const saved = loadSavedLens();
  return { cameras, recommended, saved };
}
