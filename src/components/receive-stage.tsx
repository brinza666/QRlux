import { useEffect, useRef, useState } from "react";
import { CompleteCard } from "@/components/complete-card";
import { FeedbackToggle } from "@/components/feedback-toggle";
import { LockPill, ScanHud, Viewfinder } from "@/components/scan-hud";
import { StatGrid } from "@/components/stat-grid";
import { Button } from "@/components/ui/button";
import { useTransferCues } from "@/components/use-transfer-cues";
import {
  acquireCamera,
  probeCameras,
  rankCameras,
  releaseCamera,
  resetZoomToUnity,
  saveSavedLens,
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
  const [hint, setHint] = useState("Pick the lens that sees the other screen — then start scan.");
  const [phase, setPhase] = useState<"pick" | "scan">("pick");
  const [probed, setProbed] = useState(false);

  useTransferCues(stats, { complete: Boolean(result), error });
  useEffect(() => installAudioUnlock(), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const found = await probeCameras();
        if (cancelled) return;
        const cams = found.cameras.length ? found.cameras : rankCameras([]);
        setCameras(cams);
        const savedOk = Boolean(found.saved && cams.some((c) => c.id === found.saved));
        const id = savedOk ? found.saved : found.recommended;
        deviceIdRef.current = id;
        setDeviceId(id);
        setProbed(true);
        setNeedTap(false);
        setError(null);
        setHint("If this looks zoomed or shows the floor, pick another lens first.");
        setRunId((n) => n + 1);
      } catch {
        if (!cancelled) {
          setNeedTap(true);
          setError("Allow the camera, then pick a lens before scanning.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    const work = workRef.current;
    const preview = previewRef.current;
    if (!video || !work) return;
    if (!deviceIdRef.current && phase === "pick" && !probed) return;

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

    const scanner = phase === "scan" ? createScanner(video, work) : null;
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
      if (phase !== "scan" || !scanner || rx.complete || busy) {
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
        if (/^https?:\/\//i.test(text.trim())) {
          busy = false;
          return;
        }
        const bytes = parseQrText(text);
        if (bytes) rx.push(bytes, t);
        else rx.stats.dropped += 1;
      } else if (!rx.stats.locked && lastQrAt === 0 && t - scanStarted > 4000) {
        setHint("No QR in view. Go back and pick a different lens.");
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
        const zoomNow = await resetZoomToUnity();
        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;
        video.disablePictureInPicture = true;
        await video.play();
        if (!cancelled) {
          setZoomVal(zoomNow);
          setCaps(trackCaps());
          setLive(true);
          setNeedTap(false);
          const used = stream.getVideoTracks()[0]?.getSettings?.().deviceId;
          if (used) {
            deviceIdRef.current = used;
            setDeviceId(used);
          }
        }
        raf = requestAnimationFrame((t) => void loop(t));
      } catch {
        if (!cancelled) {
          setNeedTap(true);
          setLive(false);
          setError("Allow the camera, then pick the lens that sees the other screen.");
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
  }, [runId, phase, probed]);

  function selectLens(id: string) {
    deviceIdRef.current = id;
    setDeviceId(id);
    setTorchOn(false);
    setLive(false);
    setRunId((n) => n + 1);
  }

  function startScan() {
    if (deviceIdRef.current) saveSavedLens(deviceIdRef.current);
    setResult(null);
    setError(null);
    setHint("Aim at the glowing square on the other screen.");
    setPhase("scan");
    setRunId((n) => n + 1);
  }

  function backToLenses() {
    setPhase("pick");
    setResult(null);
    setStats(emptyStats());
    setHint("If this looks zoomed or shows the floor, pick another lens first.");
    setRunId((n) => n + 1);
  }

  function reset() {
    setResult(null);
    setError(null);
    setHint("Aim at the glowing square on the other screen.");
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
          "w-full bg-bg object-contain",
          variant === "app" ? "h-[min(56dvh,100vw)]" : "aspect-[3/4] sm:aspect-square",
        )}
      />
      <canvas ref={workRef} className="hidden" />
      {phase === "scan" ? <Viewfinder locked={stats.locked} /> : null}
      {!live ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-sm text-muted">
          {needTap ? <Button onClick={() => setRunId((n) => n + 1)}>Allow camera</Button> : "Waiting for camera…"}
        </div>
      ) : null}
      <div className="absolute top-3 right-3 left-3 flex items-center justify-between gap-2">
        {phase === "scan" ? <LockPill locked={stats.locked} /> : (
          <span className="rounded-full bg-bg/80 px-2.5 py-1 font-mono text-xs tracking-wide text-muted uppercase">
            Preview 1×
          </span>
        )}
        <div className="flex items-center gap-2">
          {variant === "app" ? (
            <FeedbackToggle className="pointer-events-auto size-9 bg-bg/70 text-fg" />
          ) : null}
        </div>
      </div>
      {phase === "scan" ? (
        <div className="absolute top-14 right-3 flex flex-col gap-2">
          <button
            type="button"
            onClick={backToLenses}
            className="pointer-events-auto rounded-md bg-bg/80 px-3 py-2 text-xs text-fg"
          >
            Change lens
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
      ) : null}
      {phase === "scan" ? (
        <div className="absolute right-3 bottom-3 left-3">
          <ScanHud stats={stats} role="receive" />
          {!stats.locked ? (
            <p className="mt-2 text-center text-xs text-muted">{hint}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );

  const lensPicker = (
    <div className="flex flex-col gap-3">
      <p className="text-sm leading-relaxed text-muted">
        Choose a lens <span className="text-fg">before</span> scanning. You want the main rear
        camera — not macro, not 3× zoom. The preview stays at 1×.
      </p>
      <div className="flex flex-col gap-2">
        {cameras.map((c, i) => {
          const selected = c.id === deviceId;
          return (
            <button
              key={c.id || i}
              type="button"
              onClick={() => selectLens(c.id)}
              className={cn(
                "rounded-xl border px-3 py-3 text-left text-sm",
                selected ? "border-accent bg-surface-2 text-fg" : "border-border bg-surface text-muted",
              )}
            >
              <span className="block font-medium text-fg">{c.label || `Camera ${i + 1}`}</span>
              <span className="mt-0.5 block text-xs">
                {i === 0 ? "Recommended — usually the main rear lens" : c.facing === "user" ? "Front / selfie" : "Tap to preview at 1×"}
              </span>
            </button>
          );
        })}
        {!cameras.length ? (
          <p className="text-xs text-muted">Allow the camera so we can list the lenses.</p>
        ) : null}
      </div>
      {caps.zoom && caps.zoomMax > 1.05 ? (
        <label className="text-xs text-muted">
          Zoom {zoom.toFixed(1)}× (keep near 1×)
          <input
            type="range"
            min={caps.zoomMin}
            max={Math.min(caps.zoomMax, 2)}
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
      <Button className="w-full" onClick={startScan} disabled={!deviceId && !cameras.length}>
        This lens sees the screen — start scan
      </Button>
      {error ? <p className="text-sm text-muted">{error}</p> : null}
    </div>
  );

  const extras = phase === "scan" ? (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted">
        {activeCam ? activeCam.label : "Scanning."} Tap Change lens if this is zoomed or the floor.
      </p>
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
  ) : null;

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
        <div className="mt-3 px-4">
          {phase === "pick" ? lensPicker : extras}
        </div>
        {phase === "scan" ? (
          <div className="mt-3 px-4">
            <div className="rounded-xl border border-border bg-surface p-4">
              <StatGrid stats={stats} />
            </div>
            {error ? <p className="mt-3 text-sm text-muted">{error}</p> : null}
          </div>
        ) : null}
        <div className="mt-auto px-4 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          {phase === "scan" ? (
            <Button variant="outline" className="w-full" onClick={reset}>
              Reset session
            </Button>
          ) : null}
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
            <h1 className="mt-2 text-3xl font-medium tracking-tight sm:text-4xl">
              {phase === "pick" ? "Pick a lens first" : "Point and drink"}
            </h1>
          </div>
          <FeedbackToggle />
        </div>
        <p className="mb-5 max-w-md text-sm leading-relaxed text-muted">
          {phase === "pick"
            ? "The first camera Android offers is often the zoomed one. Choose the main rear lens, then start."
            : "Hold still on the square. Change lens if the view is the floor or a crop."}
        </p>
        {camera}
        {error ? <p className="mt-3 text-sm text-muted">{error}</p> : null}
      </div>
      <div className="flex flex-col gap-5 lg:pt-16">
        {result ? <CompleteCard result={result} onReplay={reset} /> : null}
        {phase === "pick" ? lensPicker : extras}
        {phase === "scan" ? (
          <>
            <div className="rounded-xl border border-border bg-surface p-5">
              <StatGrid stats={stats} />
            </div>
            <Button variant="outline" onClick={reset}>
              Reset session
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}
