import { useCallback, useEffect, useRef, useState } from "react";
import { FeedbackToggle } from "@/components/feedback-toggle";
import { QrPlate } from "@/components/qr-plate";
import { TunePanel } from "@/components/tune-panel";
import { Button } from "@/components/ui/button";
import { startBroadcast } from "@/lib/lux/broadcast";
import {
  emptyStats,
  MAX_FILE_BYTES,
  Transmitter,
  type FilePayload,
  type RxStats,
} from "@/lib/lux/codec";
import { probeDevice } from "@/lib/lux/device";
import { playCue, installAudioUnlock } from "@/lib/lux/feedback";
import { drawUrlQr } from "@/lib/lux/qr";
import { fileFromBlob, loadApkSample, makeNote, makeWindowLight } from "@/lib/lux/samples";
import { loadTune, saveTune, type Tune } from "@/lib/lux/settings";
import { isInternal, setInternal } from "@/lib/lux/internal";
import { RECEIVE_WEB_URL } from "@/lib/lux/site";
import { formatBytes } from "@/lib/utils";

type SampleId = "photo" | "note" | "file" | "apk-send" | "apk-receive";
type Phase = "handshake" | "fountain";

export function AppSend() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const tuneRef = useRef<Tune>(loadTune());
  const [stats, setStats] = useState<RxStats>(emptyStats());
  const [status, setStatus] = useState("Scan the first QR with your phone camera.");
  const [error, setError] = useState<string | null>(null);
  const [sample, setSample] = useState<SampleId>("apk-receive");
  const [picked, setPicked] = useState<FilePayload | null>(null);
  const [phase, setPhase] = useState<Phase>("handshake");
  const [runId, setRunId] = useState(0);
  const [tune, setTune] = useState<Tune>(tuneRef.current);
  const [showTune, setShowTune] = useState(false);
  const [internal, setInternalOn] = useState(() => isInternal());
  const [deviceLabel, setDeviceLabel] = useState("");
  const titleTaps = useRef(0);

  const applyTune = (next: Tune) => {
    const saved = saveTune(next);
    tuneRef.current = saved;
    setTune(saved);
  };

  useEffect(() => installAudioUnlock(), []);
  useEffect(() => {
    setDeviceLabel(probeDevice().label);
  }, []);

  useEffect(() => {
    if (phase !== "handshake") return;
    let cancelled = false;
    const paint = () => {
      const canvas = canvasRef.current;
      if (canvas && !cancelled) drawUrlQr(canvas, RECEIVE_WEB_URL);
    };
    paint();
    const id = window.setInterval(paint, 800);
    const wait = tuneRef.current.handshakeSec;
    const auto =
      wait > 0
        ? window.setTimeout(() => {
            if (!cancelled) setPhase("fountain");
          }, wait * 1000)
        : 0;
    return () => {
      cancelled = true;
      window.clearInterval(id);
      if (auto) window.clearTimeout(auto);
    };
  }, [phase, runId]);

  const loadPayload = useCallback(async (): Promise<FilePayload> => {
    if (picked) return picked;
    if (sample === "note") return makeNote();
    if (sample === "apk-send") return loadApkSample("send");
    if (sample === "apk-receive") return loadApkSample("receive");
    if (sample === "photo") return makeWindowLight();
    return loadApkSample("receive");
  }, [picked, sample]);

  useEffect(() => {
    if (phase !== "fountain") return;
    let cancelled = false;
    let stop: (() => void) | null = null;
    const statsRef = { current: emptyStats() };
    const flush = window.setInterval(() => {
      if (!cancelled) setStats({ ...statsRef.current });
    }, 160);

    (async () => {
      try {
        setError(null);
        setStatus("Encoding fountain…");
        const payload = await loadPayload();
        if (cancelled) return;
        const tx = await Transmitter.fromFile(payload);
        if (cancelled) return;
        playCue("start");
        setStatus(
          `${payload.filename} · ${formatBytes(payload.bytes.byteLength)} · ${tx.header.k} pieces`,
        );
        const handle = startBroadcast({
          tx,
          canvas: () => canvasRef.current,
          payloadBytes: payload.bytes.byteLength,
          filename: payload.filename,
          handshakeUrl: RECEIVE_WEB_URL,
          getTargetFps: () => tuneRef.current.fps,
          getTune: () => tuneRef.current,
          onStats(patch) {
            statsRef.current = { ...statsRef.current, ...patch };
          },
        });
        stop = handle.stop;
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to start transfer");
      }
    })();

    return () => {
      cancelled = true;
      stop?.();
      window.clearInterval(flush);
    };
  }, [phase, runId, loadPayload]);

  async function onPick(list: FileList | null) {
    const file = list?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setError(`Keep files under ${formatBytes(MAX_FILE_BYTES)}.`);
      return;
    }
    const payload = await fileFromBlob(file);
    setPicked(payload);
    setSample("file");
    setPhase("fountain");
    setRunId((n) => n + 1);
  }

  function startSample(id: SampleId) {
    setPicked(null);
    setSample(id);
    setPhase("fountain");
    setRunId((n) => n + 1);
  }

  return (
    <div className="lux-app flex min-h-dvh flex-col bg-bg text-fg">
      <header className="flex items-center justify-between gap-2 px-3 pt-[max(0.5rem,env(safe-area-inset-top))] pb-1">
        <button
          type="button"
          className="font-mono text-xs tracking-[0.16em] text-subtle uppercase"
          onClick={() => {
            titleTaps.current += 1;
            if (titleTaps.current >= 5) {
              setInternal(true);
              setInternalOn(true);
            }
          }}
        >
          LUX Send
        </button>
        <p className="min-w-0 truncate font-mono text-xs text-muted">
          {deviceLabel}
          {stats.txFps ? ` · ${stats.txFps.toFixed(0)} fps` : ""}
        </p>
        <FeedbackToggle className="size-9 shrink-0" />
      </header>

      <div className="flex min-h-0 flex-1 flex-col px-2">
        <div className="mx-auto flex w-full max-w-[min(100vw,100dvh)] flex-1 items-center justify-center">
          <QrPlate
            canvasRef={canvasRef}
            size="hero"
            className="w-full max-w-[min(96vw,96dvh)]"
          />
        </div>
        <p className="px-2 pt-2 text-center text-sm font-medium">
          {phase === "handshake"
            ? "Scan this with your phone camera — opens Receive"
            : stats.filename
              ? `Broadcasting ${stats.filename}`
              : status}
        </p>
        <p className="px-2 text-center text-xs text-muted">
          {phase === "handshake"
            ? "This QR stays until you tap Start fountain. On the phone, pick a lens first."
            : `${formatBytes(stats.payloadBytes || 0)} · ${stats.k || "—"} pieces · keep the screen bright`}
        </p>
        {error ? <p className="px-2 text-center text-xs text-fg">{error}</p> : null}
      </div>

      <div className="flex flex-col gap-2 px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Button
            size="sm"
            variant={sample === "apk-receive" && !picked ? "default" : "outline"}
            onClick={() => startSample("apk-receive")}
          >
            Receive APK
          </Button>
          <Button
            size="sm"
            variant={sample === "apk-send" && !picked ? "default" : "outline"}
            onClick={() => startSample("apk-send")}
          >
            Send APK
          </Button>
          <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()}>
            {picked ? picked.filename : "Your file"}
          </Button>
          <Button
            size="sm"
            variant={phase === "handshake" ? "default" : "outline"}
            onClick={() => {
              if (phase === "handshake") setPhase("fountain");
              else {
                setPhase("handshake");
                setRunId((n) => n + 1);
              }
            }}
          >
            {phase === "handshake" ? "Start fountain" : "Setup QR"}
          </Button>
        </div>
        {internal ? (
          <Button size="sm" variant="ghost" onClick={() => setShowTune((v) => !v)}>
            {showTune ? "Hide advanced" : "Advanced"}
          </Button>
        ) : null}
        {internal && showTune ? (
          <div className="max-h-[40dvh] overflow-y-auto rounded-xl border border-border bg-surface p-4">
            <TunePanel tune={tune} onChange={applyTune} />
          </div>
        ) : null}
        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          onChange={(e) => void onPick(e.target.files)}
        />
      </div>
    </div>
  );
}
