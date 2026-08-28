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
    const facing: CameraInfo["facing"] = /front|user|face/i.test(label)
      ? "user"
      : /back|rear|environment|world/i.test(label)
        ? "environment"
        : "unknown";
    return { id: d.deviceId, label, facing };
  });
}

export function pickDefaultCamera(cams: CameraInfo[]): string {
  const backMain = cams.find(
    (c) =>
      c.facing === "environment" &&
      !/ultra|wide|tele|macro|depth/i.test(c.label),
  );
  if (backMain) return backMain.id;
  const back = cams.find((c) => c.facing === "environment");
  if (back) return back.id;
  return cams[0]?.id ?? "";
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
