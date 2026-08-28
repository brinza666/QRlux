import { useEffect, useRef, useState } from "react";
import { CompleteCard } from "@/components/complete-card";
import { FeedbackToggle } from "@/components/feedback-toggle";
import { LockPill, ScanHud, Viewfinder } from "@/components/scan-hud";
import { StatGrid } from "@/components/stat-grid";
import { Button } from "@/components/ui/button";
import { useTransferCues } from "@/components/use-transfer-cues";
import { emptyStats, Receiver, type CompleteResult, type RxStats } from "@/lib/lux/codec";
import { installAudioUnlock } from "@/lib/lux/feedback";
import { parseQrText } from "@/lib/lux/qr";
import { createScanner } from "@/lib/lux/scan";
import { cn } from "@/lib/utils";

export function ReceiveStage({ variant }: { variant: "page" | "app" }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const workRef = useRef<HTMLCanvasElement>(null);
  const [stats, setStats] = useState<RxStats>(emptyStats());
  const [result, setResult] = useState<CompleteResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const [runId, setRunId] = useState(0);

  useTransferCues(stats, { complete: Boolean(result), error });

  useEffect(() => installAudioUnlock(), []);

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
    }, 100);

    const scanner = createScanner(video, work);
    let frames = 0;
    let windowStart = performance.now();
    let busy = false;

    const loop = async (t: number) => {
      if (cancelled) return;
      raf = requestAnimationFrame((nt) => void loop(nt));
      frames += 1;
      if (t - windowStart >= 400) {
        statsRef.current.captureFps = (frames / (t - windowStart)) * 1000;
        frames = 0;
        windowStart = t;
      }
      if (rx.complete || busy) {
        statsRef.current = { ...rx.stats, captureFps: statsRef.current.captureFps };
        return;
      }
      busy = true;
      const text = await scanner.read(rx.stats.locked);
      if (cancelled || rx.complete) {
        busy = false;
        return;
      }
      if (text) {
        const bytes = parseQrText(text);
        if (bytes) rx.push(bytes, t);
        else rx.stats.dropped += 1;
      }
      statsRef.current = { ...rx.stats, captureFps: statsRef.current.captureFps };
      busy = false;
    };

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
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
          setError(
            variant === "app"
              ? "Camera permission is required. Allow the camera, then tap Reset."
              : "Camera permission is required. You can still run the loopback demo on Home.",
          );
        }
      }
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.clearInterval(flush);
      stream?.getTracks().forEach((tr) => tr.stop());
    };
  }, [runId, variant]);

  function reset() {
    setResult(null);
    setError(null);
    setRunId((n) => n + 1);
  }

  const camera = (
    <div className="relative overflow-hidden rounded-xl bg-surface-2">
      <video
        ref={videoRef}
        className={cn("w-full bg-bg object-cover", variant === "app" ? "aspect-[3/4]" : "aspect-[3/4] sm:aspect-square")}
        playsInline
        muted
        autoPlay
      />
      <canvas ref={workRef} className="hidden" />
      <Viewfinder locked={stats.locked} />
      {!live ? (
        <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-muted">
          Waiting for camera…
        </div>
      ) : null}
      <div className="absolute top-3 right-3 left-3 flex items-center justify-between gap-2">
        <LockPill locked={stats.locked} />
        {variant === "app" ? <FeedbackToggle className="pointer-events-auto size-9 bg-bg/70 text-fg" /> : null}
      </div>
      <div className="absolute right-3 bottom-3 left-3">
        <ScanHud stats={stats} role="receive" />
      </div>
    </div>
  );

  if (variant === "app") {
    return (
      <div className="flex min-h-dvh flex-col bg-bg text-fg">
        <header className="flex items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2">
          <p className="font-mono text-xs tracking-[0.18em] text-subtle uppercase">LUX Receive</p>
        </header>
        {result ? (
          <div className="px-4 pb-3">
            <CompleteCard result={result} onReplay={reset} />
          </div>
        ) : null}
        <div className="px-4">{camera}</div>
        <div className="mt-4 px-4">
          <div className="rounded-xl border border-border bg-surface p-4">
            <StatGrid stats={stats} />
          </div>
          {error ? <p className="mt-3 text-sm text-muted">{error}</p> : null}
        </div>
        <div className="mt-auto px-4 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <Button variant="outline" className="w-full" onClick={reset}>
            Reset session
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid w-full gap-6 lg:grid-cols-2">
      <div>
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <p className="font-mono text-xs tracking-[0.22em] text-subtle uppercase">Receiver</p>
            <h1 className="mt-2 text-3xl font-medium tracking-tight sm:text-4xl">Point and drink</h1>
          </div>
          <FeedbackToggle />
        </div>
        <p className="mb-5 max-w-md text-sm leading-relaxed text-muted">
          Filename, size, and time left stay on the camera while you scan. Fountain coding means
          you can shake, miss frames, or start mid-stream.
        </p>
        {camera}
        {error ? <p className="mt-3 text-sm text-muted">{error}</p> : null}
      </div>
      <div className="flex flex-col gap-5 lg:pt-16">
        {result ? <CompleteCard result={result} onReplay={reset} /> : null}
        <div className="rounded-xl border border-border bg-surface p-5">
          <StatGrid stats={stats} />
        </div>
        <Button variant="outline" onClick={reset}>
          Reset session
        </Button>
      </div>
    </div>
  );
}
