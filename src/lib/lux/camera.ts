export type CameraInfo = {
  id: string;
  label: string;
  facing: "environment" | "user" | "unknown";
};

let active: MediaStream | null = null;
let owners = 0;

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

/** Higher is better. Macro / ultra-wide / front score last. Plain "wide" is the main lens. */
export function scoreCamera(cam: CameraInfo): number {
  const l = cam.label.toLowerCase();
  if (cam.facing === "user" || /front|selfie|face/.test(l)) return -1000;
  if (/\bmacro\b/.test(l)) return -900;
  if (/depth|tof|infrared|\bir\b/.test(l)) return -800;
  let s = 0;
  if (/ultra[\s-]?wide|ultrawide/.test(l)) s -= 700;
  else if (/\btele(photo)?\b/.test(l)) s -= 400;
  if (cam.facing === "environment" || /back|rear|environment|world/.test(l)) s += 300;
  if (/\bmain\b|\bprimary\b|\bstandard\b/.test(l)) s += 200;
  if (/\bwide\b/.test(l) && !/ultra/.test(l)) s += 150;
  const idx = camIndex(cam.label);
  if (idx !== null) s += Math.max(0, 80 - idx * 25);
  return s;
}

export function pickDefaultCamera(cams: CameraInfo[]): string {
  if (!cams.length) return "";
  const ranked = [...cams].sort((a, b) => scoreCamera(b) - scoreCamera(a));
  return ranked[0]!.id;
}

export async function acquireCamera(deviceId?: string): Promise<MediaStream> {
  stopCamera();
  const video: MediaTrackConstraints = deviceId
    ? { deviceId: { exact: deviceId }, width: { ideal: 1920 }, height: { ideal: 1080 } }
    : {
        facingMode: { ideal: "environment" },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      };
  const attempts: MediaStreamConstraints[] = [
    { audio: false, video },
    { audio: false, video: deviceId ? { deviceId: { exact: deviceId } } : { facingMode: "environment" } },
    { audio: false, video: true },
  ];
  let last: unknown;
  for (const c of attempts) {
    try {
      active = await navigator.mediaDevices.getUserMedia(c);
      owners = 1;
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
