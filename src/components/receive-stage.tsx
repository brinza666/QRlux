import { useEffect, useRef, useState } from "react";
import { CompleteCard } from "@/components/complete-card";
import { FeedbackToggle } from "@/components/feedback-toggle";
import { LockPill, ScanHud, Viewfinder } from "@/components/scan-hud";
import { StatGrid } from "@/components/stat-grid";
import { Button } from "@/components/ui/button";
import { useTransferCues } from "@/components/use-transfer-cues";
import {
  acquireCamera,
  bindVideoEl,
  currentZoom,
  probeCameras,
  rankCameras,
  releaseCamera,
  resetZoomToUnity,
  saveSavedLens,
  setTorch,
  setZoom,
  stopCamera,
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
  const [stats, setStats] = useState<RxStats>(emptyStats());
  const [result, setResult] = useState<CompleteResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const [needTap, setNeedTap] = useState(true);
  const deviceIdRef = useRef("");
  const [cameras, setCameras] = useState<CameraInfo[]>([]);
  const [deviceId, setDeviceId] = useState("");
  const [torch, setTorchOn] = useState(false);
  const [zoom, setZoomVal] = useState(1);
  const [caps, setCaps] = useState({ torch: false, zoom: false, zoomMin: 1, zoomMax: 1 });
  const [hint, setHint] = useState("Allow the camera, then pick a lens. Do not start zoomed.");
  const [phase, setPhase] = useState<"pick" | "scan">("pick");
  const [armed, setArmed] = useState(false);
  const [probeTick, setProbeTick] = useState(0);

  useTransferCues(stats, { complete: Boolean(result), error });
  useEffect(() => installAudioUnlock(), []);

  useEffect(() => {
    if (probeTick === 0) return;
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
        setNeedTap(false);
        setError(null);
        setHint("Tap the lens that sees the whole screen — not a close-up of skin or a crop.");
      } catch {
        if (!cancelled) {
          setNeedTap(true);
          setError("Allow the camera, then pick a lens. Nothing is opened until you tap one.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [probeTick]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !armed || !deviceIdRef.current) {
      if (!armed) {
        video && (video.srcObject = null);
        stopCamera();
        setLive(false);
      }
      return;
    }

    let cancelled = false;
    bindVideoEl(video);

    (async () => {
      try {
        const stream = await acquireCamera(deviceIdRef.current);
        if (cancelled) {
          releaseCamera();
          return;
        }
        const zoomNow = await resetZoomToUnity();
        video.srcObject = stream;
        await video.play().catch(() => undefined);
        if (!cancelled) {
          setZoomVal(currentZoom() || zoomNow);
          setCaps(trackCaps());
          setLive(true);
          setNeedTap(false);
          const used = stream.getVideoTracks()[0]?.getSettings?.().deviceId;
          if (used) {
            deviceIdRef.current = used;
            setDeviceId(used);
          }
        }
      } catch {
        if (!cancelled) {
          setLive(false);
          setError("Could not open that lens. Try another.");
        }
      }
    })();

    return () => {
      cancelled = true;
      video.srcObject = null;
      releaseCamera();
    };
  }, [armed, deviceId]);

  useEffect(() => {
    const video = videoRef.current;
    const work = workRef.current;
    if (!video || !work || phase !== "scan" || !live) return;

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
        if (/^https?:\/\//i.test(text.trim())) {
          busy = false;
          return;
        }
        const bytes = parseQrText(text);
        if (bytes) rx.push(bytes, t);
        else rx.stats.dropped += 1;
      } else if (!rx.stats.locked && lastQrAt === 0 && t - scanStarted > 4000) {
        setHint("No QR in view. Change lens if this is a crop or the floor.");
      }
      statsRef.current = { ...rx.stats, captureFps: statsRef.current.captureFps };
      busy = false;
    };
    raf = requestAnimationFrame((t) => void loop(t));

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.clearInterval(flush);
    };
  }, [phase, live]);

  function selectLens(id: string) {
    deviceIdRef.current = id;
    setDeviceId(id);
    setTorchOn(false);
    setArmed(true);
    setPhase("pick");
    setResult(null);
  }

  function startScan() {
    if (deviceIdRef.current) saveSavedLens(deviceIdRef.current);
    setResult(null);
    setError(null);
    setHint("Aim at the glowing square on the other screen.");
    setPhase("scan");
  }

  function backToLenses() {
    setPhase("pick");
    setArmed(false);
    setLive(false);
    setResult(null);
    setStats(emptyStats());
    setHint("Tap a lens. Wait until the preview shows the whole computer screen.");
    stopCamera();
  }

  function reset() {
    setResult(null);
    setError(null);
    setHint("Aim at the glowing square on the other screen.");
    setStats(emptyStats());
    setPhase("scan");
  }

  async function toggleTorch() {
    const next = !torch;
    setTorchOn(next);
    await setTorch(next);
  }

  const activeCam = cameras.find((c) => c.id === deviceId);
  const zoomed = zoom > 1.35;

  const camera = (
    <div className="relative overflow-hidden rounded-xl bg-surface-2">
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        disablePictureInPicture
        controls={false}
        className={cn(
          "lux-finder w-full bg-bg object-contain",
          variant === "app" ? "h-[min(48dvh,100vw)]" : "aspect-[3/4] sm:aspect-square",
          live ? "block" : "hidden",
        )}
      />
      <canvas ref={workRef} className="lux-work" />
      {phase === "scan" && live ? <Viewfinder locked={stats.locked} /> : null}
      {!live ? (
        <div
          className={cn(
            "flex flex-col items-center justify-center gap-3 bg-surface-2 p-6 text-center text-sm text-muted",
            variant === "app" ? "h-[min(48dvh,100vw)]" : "aspect-[3/4] sm:aspect-square",
          )}
        >
          {needTap || !cameras.length ? (
            <Button onClick={() => setProbeTick((n) => n + 1)}>Allow camera</Button>
          ) : (
            "Tap a lens below to open it — nothing is filming yet."
          )}
        </div>
      ) : null}
      <div className="absolute top-3 right-3 left-3 flex items-center justify-between gap-2">
        {phase === "scan" ? (
          <LockPill locked={stats.locked} />
        ) : live ? (
          <span
            className={cn(
              "rounded-full px-2.5 py-1 font-mono text-xs tracking-wide uppercase",
              zoomed ? "bg-warn/20 text-warn" : "bg-bg/80 text-muted",
            )}
          >
            {zoomed ? `Zoomed ${zoom.toFixed(1)}× — try another lens` : `Preview ${zoom.toFixed(1)}×`}
          </span>
        ) : null}
        {variant === "app" ? (
          <FeedbackToggle className="pointer-events-auto size-9 bg-bg/70 text-fg" />
        ) : null}
      </div>
      {phase === "scan" && live ? (
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
      {phase === "scan" && live ? (
        <div className="absolute right-3 bottom-3 left-3">
          <ScanHud stats={stats} role="receive" />
          {!stats.locked ? <p className="mt-2 text-center text-xs text-muted">{hint}</p> : null}
        </div>
      ) : null}
    </div>
  );

  const lensPicker = (
    <div className="flex flex-col gap-3">
      <p className="text-sm leading-relaxed text-muted">
        Android often opens the <span className="text-fg">macro / telephoto</span> camera first.
        Pick a lens <span className="text-fg">before</span> scanning. You want the whole computer
        screen in view, not a palm or a cropped corner.
      </p>
      <div className="flex flex-col gap-2">
        {cameras.map((c, i) => {
          const selected = c.id === deviceId && armed;
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
                {i === 0
                  ? "Try this first — usually the main rear lens"
                  : c.facing === "user"
                    ? "Front / selfie"
                    : "Tap to open this lens only"}
              </span>
            </button>
          );
        })}
        {!cameras.length ? (
          <p className="text-xs text-muted">Tap Allow camera so we can list the lenses. No preview until you pick one.</p>
        ) : null}
      </div>
      {live && zoomed ? (
        <p className="text-sm text-warn">
          This lens is still at {zoom.toFixed(1)}×. Tap another lens — the palm close-up is macro.
        </p>
      ) : null}
      {live && caps.zoom && caps.zoomMax > 1.05 ? (
        <label className="text-xs text-muted">
          Zoom {zoom.toFixed(1)}× (keep at 1×)
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
      <Button className="w-full" onClick={startScan} disabled={!live}>
        Whole screen is in view — start scan
      </Button>
      {error ? <p className="text-sm text-muted">{error}</p> : null}
    </div>
  );

  const extras =
    phase === "scan" ? (
      <div className="flex flex-col gap-3">
        <p className="text-xs text-muted">
          {activeCam ? activeCam.label : "Scanning."} Change lens if this is zoomed or the floor.
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
        <div className="mt-3 px-4">{phase === "pick" ? lensPicker : extras}</div>
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
            ? "Nothing films until you tap a lens. Skip the palm close-up — that is macro."
            : "Hold still on the square. Change lens if the view is a crop."}
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
