import { useEffect, useRef, useState } from "react";
import { CompleteCard } from "@/components/complete-card";
import { FeedbackToggle } from "@/components/feedback-toggle";
import { LockPill, ScanHud, Viewfinder } from "@/components/scan-hud";
import { StatGrid } from "@/components/stat-grid";
import { Button } from "@/components/ui/button";
import { useTransferCues } from "@/components/use-transfer-cues";
import {
  acquireCamera,
  listCameras,
  pickDefaultCamera,
  releaseCamera,
  setTorch,
  setZoom,
  trackCaps,
  type CameraInfo,
} from "@/lib/lux/camera";
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
  const deviceIdRef = useRef("");
  const [cameras, setCameras] = useState<CameraInfo[]>([]);
  const [deviceId, setDeviceId] = useState("");
  const [torch, setTorchOn] = useState(false);
  const [zoom, setZoomVal] = useState(1);
  const [caps, setCaps] = useState({ torch: false, zoom: false, zoomMin: 1, zoomMax: 1 });
  const [hint, setHint] = useState("Aim at the glowing square on the other screen.");

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
    const scanStarted = performance.now();
    let busy = false;
    let lastQrAt = 0;

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
        lastQrAt = t;
        const bytes = parseQrText(text);
        if (bytes) rx.push(bytes, t);
        else rx.stats.dropped += 1;
      } else if (!rx.stats.locked && lastQrAt === 0 && t - scanStarted > 4000) {
        setHint("No QR in view. Switch lens if this camera points at the floor.");
      }
      statsRef.current = { ...rx.stats, captureFps: statsRef.current.captureFps };
      busy = false;
    };

    (async () => {
      try {
        const stream = await acquireCamera(deviceIdRef.current || undefined);
        if (cancelled) {
          releaseCamera();
          return;
        }
        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;
        video.disablePictureInPicture = true;
        await video.play();
        const listed = await listCameras();
        if (!cancelled) {
          setCameras(listed);
          const used =
            stream.getVideoTracks()[0]?.getSettings?.().deviceId ||
            deviceIdRef.current ||
            pickDefaultCamera(listed);
          if (used && used !== deviceIdRef.current) {
            deviceIdRef.current = used;
            setDeviceId(used);
          }
          setCaps(trackCaps());
        }
        setLive(true);
        setNeedTap(false);
        raf = requestAnimationFrame((t) => void loop(t));
      } catch {
        if (!cancelled) {
          setNeedTap(true);
          setError("Tap Start camera, then allow access. Switch lens if the wrong camera opens.");
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
  }, [runId]);

  function reset() {
    setResult(null);
    setError(null);
    setHint("Aim at the glowing square on the other screen.");
    setRunId((n) => n + 1);
  }

  function cycleCamera() {
    if (cameras.length < 2) {
      setRunId((n) => n + 1);
      return;
    }
    const idx = Math.max(0, cameras.findIndex((c) => c.id === deviceIdRef.current));
    const next = cameras[(idx + 1) % cameras.length]!;
    deviceIdRef.current = next.id;
    setDeviceId(next.id);
    setTorchOn(false);
    setRunId((n) => n + 1);
  }

  async function toggleTorch() {
    const next = !torch;
    setTorchOn(next);
    await setTorch(next);
  }

  const activeCam = cameras.find((c) => c.id === deviceId);

  const camera = (
    <div className="relative overflow-hidden rounded-xl bg-surface-2">
      <div className="lux-cam-src" aria-hidden="true">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          disablePictureInPicture
          controls={false}
        />
      </div>
      <canvas
        ref={previewRef}
        className={cn(
          "w-full bg-bg object-cover",
          variant === "app" ? "h-[min(72dvh,100vw)]" : "aspect-[3/4] sm:aspect-square",
        )}
      />
      <canvas ref={workRef} className="hidden" />
      <Viewfinder locked={stats.locked} />
      {!live ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-sm text-muted">
          {needTap ? <Button onClick={reset}>Start camera</Button> : "Waiting for camera…"}
        </div>
      ) : null}
      <div className="absolute top-3 right-3 left-3 flex items-center justify-between gap-2">
        <LockPill locked={stats.locked} />
        <div className="flex items-center gap-2">
          {variant === "app" ? (
            <FeedbackToggle className="pointer-events-auto size-9 bg-bg/70 text-fg" />
          ) : null}
        </div>
      </div>
      <div className="absolute top-14 right-3 flex flex-col gap-2">
        <button
          type="button"
          onClick={cycleCamera}
          className="pointer-events-auto rounded-md bg-bg/80 px-3 py-2 text-xs text-fg"
        >
          {cameras.length ? `Lens ${cameras.findIndex((c) => c.id === deviceId) + 1}/${cameras.length}` : "Switch lens"}
        </button>
        {caps.torch ? (
          <button
            type="button"
            onClick={() => void toggleTorch()}
            className="pointer-events-auto rounded-md bg-bg/80 px-3 py-2 text-xs text-fg"
          >
            {torch ? "Torch on" : "Torch"}
          </button>
        ) : null}
      </div>
      <div className="absolute right-3 bottom-3 left-3">
        <ScanHud stats={stats} role="receive" />
        {!stats.locked ? (
          <p className="mt-2 text-center text-xs text-muted">{hint}</p>
        ) : null}
      </div>
    </div>
  );

  const extras = (
    <div className="flex flex-col gap-3">
      {cameras.length > 1 ? (
        <label className="text-xs text-muted">
          Camera
          <select
            className="mt-1 h-10 w-full rounded-md border border-border bg-surface px-2 text-sm text-fg"
            value={deviceId}
            onChange={(e) => {
              deviceIdRef.current = e.target.value;
              setDeviceId(e.target.value);
              setTorchOn(false);
              setRunId((n) => n + 1);
            }}
          >
            {cameras.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <p className="text-xs text-muted">
          {activeCam ? activeCam.label : "One camera in use. Switch lens if this is the selfie or ultra-wide."}
        </p>
      )}
      {caps.zoom ? (
        <label className="text-xs text-muted">
          Zoom {zoom.toFixed(1)}×
          <input
            type="range"
            min={caps.zoomMin}
            max={caps.zoomMax}
            step={0.1}
            value={zoom}
            onChange={(e) => {
              const z = Number(e.target.value);
              setZoomVal(z);
              void setZoom(z);
            }}
            className="mt-2 h-2 w-full accent-accent"
          />
        </label>
      ) : null}
    </div>
  );

  if (variant === "app") {
    return (
      <div className="lux-app flex min-h-dvh flex-col bg-bg text-fg">
        <header className="flex items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2">
          <p className="font-mono text-xs tracking-[0.18em] text-subtle uppercase">LUX Receive</p>
        </header>
        {result ? (
          <div className="px-4 pb-3">
            <CompleteCard result={result} onReplay={reset} />
          </div>
        ) : null}
        <div className="px-3">{camera}</div>
        <div className="mt-3 px-4">{extras}</div>
        <div className="mt-3 px-4">
          <div className="rounded-xl border border-border bg-surface p-4">
            <StatGrid stats={stats} />
          </div>
          {error ? <p className="mt-3 text-sm text-muted">{error}</p> : null}
        </div>
        <div className="mt-auto px-4 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
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
          Pick the lens that looks at the other screen — not the floor. Filename and time left
          stay on the finder while you scan.
        </p>
        {camera}
        {error ? <p className="mt-3 text-sm text-muted">{error}</p> : null}
      </div>
      <div className="flex flex-col gap-5 lg:pt-16">
        {result ? <CompleteCard result={result} onReplay={reset} /> : null}
        {extras}
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
