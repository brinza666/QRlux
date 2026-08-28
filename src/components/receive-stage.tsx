import { useEffect, useRef, useState } from "react";
import { CompleteCard } from "@/components/complete-card";
import { FeedbackToggle } from "@/components/feedback-toggle";
import { LockPill, ScanHud, Viewfinder } from "@/components/scan-hud";
import { StatGrid } from "@/components/stat-grid";
import { Button } from "@/components/ui/button";
import { useTransferCues } from "@/components/use-transfer-cues";
import { acquireCamera, releaseCamera } from "@/lib/lux/camera";
import { emptyStats, Receiver, type CompleteResult, type RxStats } from "@/lib/lux/codec";
import { installAudioUnlock } from "@/lib/lux/feedback";
import { parseQrText } from "@/lib/lux/qr";
import { createScanner } from "@/lib/lux/scan";
import { cn } from "@/lib/utils";

export function ReceiveStage({ variant }: { variant: "page" | "app" }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const workRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const [stats, setStats] = useState<RxStats>(emptyStats());
  const [result, setResult] = useState<CompleteResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const [runId, setRunId] = useState(0);
  const [needTap, setNeedTap] = useState(false);

  useTransferCues(stats, { complete: Boolean(result), error });
  useEffect(() => installAudioUnlock(), []);

  useEffect(() => {
    const video = videoRef.current;
    const work = workRef.current;
    const preview = previewRef.current;
    if (!video || !work) return;

    let cancelled = false;
    let raf = 0;
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
      if (preview && video.videoWidth) {
        if (preview.width !== video.videoWidth || preview.height !== video.videoHeight) {
          preview.width = video.videoWidth;
          preview.height = video.videoHeight;
        }
        const ctx = preview.getContext("2d", { alpha: false });
        ctx?.drawImage(video, 0, 0);
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
        const stream = await acquireCamera();
        if (cancelled) {
          releaseCamera();
          return;
        }
        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;
        await video.play();
        setLive(true);
        setNeedTap(false);
        raf = requestAnimationFrame((t) => void loop(t));
      } catch {
        if (!cancelled) {
          setNeedTap(true);
          setError(
            variant === "app"
              ? "Tap Allow camera, then Start camera."
              : "Camera permission is required. Tap Start camera. If Opera pops out a second video, turn off video pop-out / booster in Opera settings.",
          );
        }
      }
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.clearInterval(flush);
      video.srcObject = null;
      releaseCamera();
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
        className="pointer-events-none absolute h-px w-px opacity-0"
        playsInline
        muted
        autoPlay
        disablePictureInPicture
        controls={false}
        disableRemotePlayback
      />
      <canvas
        ref={previewRef}
        className={cn(
          "w-full bg-bg object-cover",
          variant === "app" ? "aspect-[3/4]" : "aspect-[3/4] sm:aspect-square",
        )}
      />
      <canvas ref={workRef} className="hidden" />
      <Viewfinder locked={stats.locked} />
      {!live ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-sm text-muted">
          {needTap ? (
            <Button onClick={reset}>Start camera</Button>
          ) : (
            "Waiting for camera…"
          )}
        </div>
      ) : null}
      <div className="absolute top-3 right-3 left-3 flex items-center justify-between gap-2">
        <LockPill locked={stats.locked} />
        {variant === "app" ? (
          <FeedbackToggle className="pointer-events-auto size-9 bg-bg/70 text-fg" />
        ) : null}
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
          Filename, size, and time left stay on the camera while you scan. If the browser pops
          out a second video window, disable Opera video pop-out / booster.
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
