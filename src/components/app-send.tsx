import { useCallback, useEffect, useRef, useState } from "react";
import { FeedbackToggle } from "@/components/feedback-toggle";
import { QrPlate } from "@/components/qr-plate";
import { ScanHud } from "@/components/scan-hud";
import { StatGrid } from "@/components/stat-grid";
import { Button } from "@/components/ui/button";
import { useTransferCues } from "@/components/use-transfer-cues";
import {
  emptyStats,
  MAX_FILE_BYTES,
  Transmitter,
  type FilePayload,
  type RxStats,
} from "@/lib/lux/codec";
import { playCue, installAudioUnlock } from "@/lib/lux/feedback";
import { bytesToB64, drawMatrix, encodeFrameQr, qrVersionForBytes } from "@/lib/lux/qr";
import { fileFromBlob, loadApkSample, makeNote, makeWindowLight } from "@/lib/lux/samples";
import { formatBytes } from "@/lib/utils";

const TARGET_FPS = 24;
const APK_FPS = 12;

type SampleId = "photo" | "note" | "file" | "apk-send" | "apk-receive";

export function AppSend() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [stats, setStats] = useState<RxStats>(emptyStats());
  const [status, setStatus] = useState("Pick a payload to start broadcasting.");
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [sample, setSample] = useState<SampleId>("photo");
  const [picked, setPicked] = useState<FilePayload | null>(null);
  const [armed, setArmed] = useState(false);
  const [runId, setRunId] = useState(0);

  useTransferCues(stats, { error });
  useEffect(() => installAudioUnlock(), []);

  const loadPayload = useCallback(async (): Promise<FilePayload> => {
    if (picked) return picked;
    if (sample === "note") return makeNote();
    if (sample === "apk-send") return loadApkSample("send");
    if (sample === "apk-receive") return loadApkSample("receive");
    return makeWindowLight();
  }, [picked, sample]);

  useEffect(() => {
    if (!armed) return;
    let cancelled = false;
    let raf = 0;
    const statsRef = { current: emptyStats() };
    const flush = window.setInterval(() => {
      if (!cancelled) setStats({ ...statsRef.current });
    }, 160);

    (async () => {
      try {
        setError(null);
        setStatus("Encoding fountain stream…");
        const payload = await loadPayload();
        if (cancelled) return;
        const tx = await Transmitter.fromFile(payload);
        if (cancelled) return;
        const first = tx.next();
        const version = qrVersionForBytes(bytesToB64(first.bytes).length);
        setRunning(true);
        playCue("start");
        setStatus(
          `${payload.filename} · ${formatBytes(payload.bytes.byteLength)} · ${tx.header.k} blocks`,
        );

        let last = 0;
        let frames = 0;
        let fpsWindow = performance.now();
        const apk = sample === "apk-send" || sample === "apk-receive";
        const frameMs = 1000 / (apk ? APK_FPS : TARGET_FPS);

        const pump = (bytes: Uint8Array) => {
          const qr = encodeFrameQr(bytes, version);
          const canvas = canvasRef.current;
          if (canvas) drawMatrix(canvas, qr.matrix);
          frames += 1;
          const now = performance.now();
          if (now - fpsWindow >= 400) {
            const fps = (frames / (now - fpsWindow)) * 1000;
            statsRef.current = {
              ...statsRef.current,
              txFps: fps,
              captureFps: fps,
              bytesPerFrame: bytes.byteLength,
              blockLen: tx.header.blockSize,
              k: tx.header.k,
              session: (tx.header.session >>> 0).toString(16).padStart(8, "0").slice(-4),
              filename: tx.header.filename,
              locked: true,
              payloadBytes: payload.bytes.byteLength,
            };
            frames = 0;
            fpsWindow = now;
          }
        };

        pump(first.bytes);
        const loop = (t: number) => {
          if (cancelled) return;
          if (t - last >= frameMs) {
            last = t;
            pump(tx.next().bytes);
          }
          raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to start transfer");
        setRunning(false);
      }
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.clearInterval(flush);
    };
  }, [armed, runId, loadPayload]);

  async function onPick(list: FileList | null) {
    const file = list?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setError(`Keep files under ${MAX_FILE_BYTES / 1024} KB.`);
      return;
    }
    const payload = await fileFromBlob(file);
    setPicked(payload);
    setSample("file");
    setArmed(true);
    setRunId((n) => n + 1);
  }

  function startSample(id: SampleId) {
    setPicked(null);
    setSample(id);
    setArmed(true);
    setRunId((n) => n + 1);
  }

  return (
    <div className="flex min-h-dvh flex-col bg-bg text-fg">
      <header className="flex items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2">
        <p className="font-mono text-xs tracking-[0.18em] text-subtle uppercase">LUX Send</p>
        <FeedbackToggle />
      </header>

      <div className="px-4">
        <QrPlate canvasRef={canvasRef} />
        <div className="mt-3">
          <ScanHud stats={stats} role="send" />
        </div>
        <p className="mt-2 text-xs text-muted">{status}</p>
        {error ? <p className="mt-1 text-xs text-fg">{error}</p> : null}
      </div>

      <div className="mt-4 px-4">
        <div className="rounded-xl border border-border bg-surface p-4">
          <StatGrid stats={stats} role="send" />
        </div>
      </div>

      <div className="mt-auto flex flex-col gap-3 px-4 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <p className="text-xs tracking-[0.14em] text-subtle uppercase">Payload</p>
        <div className="grid grid-cols-2 gap-2">
          <Button
            size="sm"
            variant={sample === "photo" && !picked ? "default" : "outline"}
            onClick={() => startSample("photo")}
          >
            Window light
          </Button>
          <Button
            size="sm"
            variant={sample === "note" && !picked ? "default" : "outline"}
            onClick={() => startSample("note")}
          >
            Plain note
          </Button>
          <Button
            size="sm"
            variant={sample === "apk-send" && !picked ? "default" : "outline"}
            onClick={() => startSample("apk-send")}
          >
            Send APK
          </Button>
          <Button
            size="sm"
            variant={sample === "apk-receive" && !picked ? "default" : "outline"}
            onClick={() => startSample("apk-receive")}
          >
            Receive APK
          </Button>
          <Button
            className="col-span-2"
            size="sm"
            variant={picked ? "default" : "outline"}
            onClick={() => inputRef.current?.click()}
          >
            {picked ? picked.filename : "Your file"}
          </Button>
        </div>
        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          onChange={(e) => void onPick(e.target.files)}
        />
        {running ? (
          <p className="text-xs text-muted">
            Keep this screen bright. Point LUX Receive at the plate. The fountain loops until you
            pick another file.
          </p>
        ) : (
          <p className="text-xs text-muted">
            Files up to {MAX_FILE_BYTES / 1024} KB. No network is used.
          </p>
        )}
      </div>
    </div>
  );
}
