import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { CompleteCard } from "@/components/complete-card";
import { SiteHeader } from "@/components/site-header";
import { StatGrid } from "@/components/stat-grid";
import { Button } from "@/components/ui/button";
import { emptyStats, Receiver, type CompleteResult, type RxStats } from "@/lib/lux/codec";
import { parseQrText } from "@/lib/lux/qr";

export const Route = createFileRoute("/receive")({ component: ReceivePage });

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

function ReceivePage() {
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
          /* fall through to jsQR */
        }
      }
      const ctx = work!.getContext("2d", { willReadFrequently: true });
      if (!ctx || !video!.videoWidth) return null;
      const w = Math.min(640, video!.videoWidth);
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
      if (rx.complete || t - lastScan < 40) {
        statsRef.current = {
          ...rx.stats,
          captureFps: statsRef.current.captureFps,
        };
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
      statsRef.current = {
        ...rx.stats,
        captureFps: statsRef.current.captureFps,
      };
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
          setError("Camera permission is required to receive. You can still run the loopback demo on Home.");
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
    <div className="min-h-dvh bg-bg text-fg">
      <SiteHeader />
      <main className="mx-auto grid w-full max-w-6xl gap-6 px-4 pb-20 sm:px-6 lg:grid-cols-2">
        <div className="pt-4 sm:pt-8">
          <p className="font-mono text-[0.7rem] tracking-[0.22em] text-subtle uppercase">Receiver</p>
          <h1 className="mt-3 text-3xl font-medium tracking-tight sm:text-4xl">Point and drink</h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
            Hold the camera on the sender’s QR plate. Fountain coding means you can shake, miss
            frames, or start mid-stream.
          </p>
          <div className="relative mt-6 overflow-hidden rounded-xl bg-surface-2">
            <video
              ref={videoRef}
              className="aspect-[3/4] w-full bg-bg object-cover sm:aspect-square"
              playsInline
              muted
            />
            <canvas ref={workRef} className="hidden" />
            {!live ? (
              <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-muted">
                Waiting for camera…
              </div>
            ) : null}
          </div>
          {error ? <p className="mt-3 text-sm text-muted">{error}</p> : null}
        </div>

        <div className="flex flex-col gap-5 pt-2 lg:pt-24">
          <div className="rounded-xl border border-border bg-surface p-5">
            <StatGrid stats={stats} />
            <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full bg-accent transition-[width] duration-150"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          </div>
          {result ? (
            <CompleteCard
              result={result}
              onReplay={() => {
                setResult(null);
                setRunId((n) => n + 1);
              }}
            />
          ) : (
            <Button variant="outline" onClick={() => setRunId((n) => n + 1)}>
              Reset session
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}
