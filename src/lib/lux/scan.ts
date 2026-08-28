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

export async function readQrFromVideo(
  video: HTMLVideoElement,
  work: HTMLCanvasElement,
  detector: Detector | null,
): Promise<string | null> {
  if (detector) {
    try {
      const codes = await detector.detect(video);
      if (codes[0]?.rawValue) return codes[0].rawValue;
    } catch {
      /* jsQR fallback */
    }
  }
  const ctx = work.getContext("2d", { willReadFrequently: true });
  if (!ctx || !video.videoWidth) return null;
  const w = Math.min(720, video.videoWidth);
  const h = Math.round((video.videoHeight * w) / video.videoWidth);
  if (work.width !== w || work.height !== h) {
    work.width = w;
    work.height = h;
  }
  ctx.drawImage(video, 0, 0, w, h);
  const img = ctx.getImageData(0, 0, w, h);
  const code = jsQR(img.data, w, h, { inversionAttempts: "dontInvert" });
  return code?.data ?? null;
}
