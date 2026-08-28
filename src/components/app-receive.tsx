import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { CompleteCard } from "@/components/complete-card";
import { StatGrid } from "@/components/stat-grid";
import { Button } from "@/components/ui/button";
import { emptyStats, Receiver, type CompleteResult, type RxStats } from "@/lib/lux/codec";
import { parseQrText } from "@/lib/lux/qr";

type Detector = { detect: (src: ImageBitmapSource) => Promise<{ rawValue: string }[]> };

function getBarcodeDetector(): Detector | null {
  const Ctor = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => Detector })
    .BarcodeDetector;
  if (!Ctor) return null;
  try {
    return new Ctor({ formats: ["qr_code"] });
  } catch {
    return null;
  }
}

export function AppReceive() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const workRef = useRef<HTMLCanvasElement>(null);
  const [stats, setStats] = useState<RxStats>(emptyStats());
  const [result, setResult] = useState<CompleteResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const [runId, setRunId] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    const work = workRef.current;
    if (!video || !work) return;

    let cancelled = false;
    let raf = 0;
    let stream: MediaStream | null = null;
    const rx = new Receiver();
    const statsRef = { current: emptyStats() };
    rx.onComplete = (res) => {
      if (cancelled) return;
      setResult(res);
      statsRef.current = { ...rx.stats };
      setStats({ ...rx.stats });
      try {
        navigator.vibrate?.(80);
      } catch {
        /* optional */
      }
    };

    const flush = window.setInterval(() => {
      if (!cancelled) setStats({ ...statsRef.current });
    }, 120);

    const detector = getBarcodeDetector();
    let frames = 0;
    let windowStart = performance.now();
    let lastScan = 0;

    async function readQr(): Promise<string | null> {
      if (detector) {
        try {
          const codes = await detector.detect(video!);
          if (codes[0]?.rawValue) return codes[0].rawValue;
        } catch {
          /* jsQR fallback */
        }
      }
      const ctx = work!.getContext("2d", { willReadFrequently: true });
      if (!ctx || !video!.videoWidth) return null;
      const w = Math.min(720, video!.videoWidth);
      const h = Math.round((video!.videoHeight * w) / video!.videoWidth);
      if (work!.width !== w || work!.height !== h) {
        work!.width = w;
        work!.height = h;
      }
      ctx.drawImage(video!, 0, 0, w, h);
      const img = ctx.getImageData(0, 0, w, h);
      const code = jsQR(img.data, w, h, { inversionAttempts: "dontInvert" });
      return code?.data ?? null;
    }

    const loop = async (t: number) => {
      if (cancelled) return;
      raf = requestAnimationFrame((nt) => void loop(nt));
      frames += 1;
      if (t - windowStart >= 400) {
        statsRef.current.captureFps = (frames / (t - windowStart)) * 1000;
        frames = 0;
        windowStart = t;
      }
      if (rx.complete || t - lastScan < 45) {
        statsRef.current = { ...rx.stats, captureFps: statsRef.current.captureFps };
        return;
      }
      lastScan = t;
      const text = await readQr();
      if (cancelled || rx.complete) return;
      if (text) {
        const bytes = parseQrText(text);
        if (bytes) rx.push(bytes, t);
        else rx.stats.dropped += 1;
      }
      statsRef.current = { ...rx.stats, captureFps: statsRef.current.captureFps };
    };

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
        if (cancelled) {
          stream.getTracks().forEach((tr) => tr.stop());
          return;
        }
        video.srcObject = stream;
        await video.play();
        setLive(true);
        raf = requestAnimationFrame((t) => void loop(t));
      } catch {
        if (!cancelled) {
          setError("Camera permission is required. Allow the camera, then tap Reset.");
        }
      }
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.clearInterval(flush);
      stream?.getTracks().forEach((tr) => tr.stop());
    };
  }, [runId]);

  const progress = stats.k ? Math.min(1, stats.recovered / stats.k) : 0;

  return (
    <div className="flex min-h-dvh flex-col bg-bg text-fg">
      <header className="flex items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2">
        <p className="font-mono text-[0.65rem] tracking-[0.18em] text-subtle uppercase">
          LUX Receive
        </p>
        <p className="font-mono text-[0.65rem] text-muted">{stats.locked ? "LOCK" : "hunting"}</p>
      </header>

      {result ? (
        <div className="px-4 pb-3">
          <CompleteCard
            result={result}
            onReplay={() => {
              setResult(null);
              setRunId((n) => n + 1);
            }}
          />
        </div>
      ) : null}

      <div className="relative mx-4 overflow-hidden rounded-xl bg-surface-2">
        <video
          ref={videoRef}
          className="aspect-[3/4] w-full bg-bg object-cover"
          playsInline
          muted
          autoPlay
        />
        <canvas ref={workRef} className="hidden" />
        {!live ? (
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-muted">
            Waiting for camera…
          </div>
        ) : null}
      </div>

      <div className="mt-4 px-4">
        <div className="rounded-xl border border-border bg-surface p-4">
          <StatGrid stats={stats} />
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full bg-accent transition-[width] duration-150"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>
        {error ? <p className="mt-3 text-sm text-muted">{error}</p> : null}
      </div>

      <div className="mt-auto px-4 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            setResult(null);
            setError(null);
            setRunId((n) => n + 1);
          }}
        >
          Reset session
        </Button>
      </div>
    </div>
  );
}
