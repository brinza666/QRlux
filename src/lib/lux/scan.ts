import jsQR from "jsqr";

type Detector = { detect: (src: ImageBitmapSource) => Promise<{ rawValue: string }[]> };

export function getBarcodeDetector(): Detector | null {
  const Ctor = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => Detector })
    .BarcodeDetector;
  if (!Ctor) return null;
  try {
    return new Ctor({ formats: ["qr_code"] });
  } catch {
    return null;
  }
}

let liveStream: MediaStream | null = null;

export function stopCameraStream(): void {
  liveStream?.getTracks().forEach((t) => t.stop());
  liveStream = null;
}

export async function openCamera(): Promise<MediaStream> {
  stopCameraStream();
  const constraints: MediaStreamConstraints[] = [
    {
      audio: false,
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
    },
    { audio: false, video: { facingMode: "environment" } },
    { audio: false, video: true },
  ];
  let last: unknown;
  for (const c of constraints) {
    try {
      liveStream = await navigator.mediaDevices.getUserMedia(c);
      return liveStream;
    } catch (err) {
      last = err;
    }
  }
  throw last instanceof Error ? last : new Error("Camera unavailable");
}

/** One decoder at a time. Prefer BarcodeDetector; switch to jsQR only if it never locks. */
export function createScanner(video: HTMLVideoElement, work: HTMLCanvasElement) {
  const detector = getBarcodeDetector();
  let engine: "bd" | "jsqr" = detector ? "bd" : "jsqr";
  const started = performance.now();
  let lastHit = 0;

  return {
    engine: () => engine,
    async read(locked: boolean): Promise<string | null> {
      if (engine === "bd" && detector) {
        try {
          const codes = await detector.detect(video);
          const value = codes[0]?.rawValue ?? null;
          if (value) {
            lastHit = performance.now();
            return value;
          }
        } catch {
          /* stay on BD until the grace window ends */
        }
        if (!locked && performance.now() - started > 2500) engine = "jsqr";
        else return null;
      }
      const ctx = work.getContext("2d", { willReadFrequently: true });
      if (!ctx || !video.videoWidth) return null;
      const w = Math.min(1280, video.videoWidth);
      const h = Math.round((video.videoHeight * w) / video.videoWidth);
      if (work.width !== w || work.height !== h) {
        work.width = w;
        work.height = h;
      }
      ctx.drawImage(video, 0, 0, w, h);
      const img = ctx.getImageData(0, 0, w, h);
      const code = jsQR(img.data, w, h, { inversionAttempts: "attemptBoth" });
      if (code?.data) lastHit = performance.now();
      return code?.data ?? null;
    },
    lastHit: () => lastHit,
  };
}
