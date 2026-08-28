import { useCallback, useEffect, useRef, useState } from "react";
import { CompleteCard } from "@/components/complete-card";
import { QrPlate } from "@/components/qr-plate";
import { StatGrid } from "@/components/stat-grid";
import { Button } from "@/components/ui/button";
import {
  emptyStats,
  MAX_FILE_BYTES,
  Receiver,
  Transmitter,
  type CompleteResult,
  type FilePayload,
  type RxStats,
} from "@/lib/lux/codec";
import { bytesToB64, drawMatrix, encodeFrameQr, qrVersionForBytes } from "@/lib/lux/qr";
import { fileFromBlob, makeNote, makeWindowLight } from "@/lib/lux/samples";
import { formatBytes } from "@/lib/utils";

const TARGET_FPS = 30;

type SampleId = "photo" | "note" | "file";

export function TransferStage({ mode }: { mode: "demo" | "send" }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stats, setStats] = useState<RxStats>(emptyStats());
  const [result, setResult] = useState<CompleteResult | null>(null);
  const [status, setStatus] = useState(
    mode === "demo" ? "Preparing sample…" : "Choose a file or a built-in sample to start broadcasting.",
  );
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [sample, setSample] = useState<SampleId>("photo");
  const [runId, setRunId] = useState(0);
  const [picked, setPicked] = useState<FilePayload | null>(null);
  const [armed, setArmed] = useState(mode === "demo");
  const inputRef = useRef<HTMLInputElement>(null);
  const statsTimer = useRef<number>(0);

  const loadPayload = useCallback(async (): Promise<FilePayload> => {
    if (picked) return picked;
    if (sample === "note") return makeNote();
    return makeWindowLight();
  }, [picked, sample]);

  useEffect(() => {
    if (!armed) {
      setStatus("Choose a file or a built-in sample to start broadcasting.");
      setRunning(false);
      return;
    }

    let cancelled = false;
    let raf = 0;
    const rx = mode === "demo" ? new Receiver() : null;
    const statsRef = { current: emptyStats() };

    if (rx) {
      rx.onComplete = (res) => {
        if (cancelled) return;
        setResult(res);
        statsRef.current.complete = true;
        setStats({ ...statsRef.current });
      };
    }

    statsTimer.current = window.setInterval(() => {
      if (!cancelled) setStats({ ...statsRef.current });
    }, 120);

    (async () => {
      try {
        setError(null);
        setResult(null);
        setStatus(mode === "demo" ? "Encoding fountain stream…" : "Broadcasting…");
        const payload = await loadPayload();
        if (cancelled) return;
        const tx = await Transmitter.fromFile(payload);
        if (cancelled) return;
        const first = tx.next();
        const version = qrVersionForBytes(bytesToB64(first.bytes).length);
        setRunning(true);
        setStatus(
          `${payload.filename} · ${formatBytes(payload.bytes.byteLength)} · ${tx.header.k} blocks`,
        );

        let last = 0;
        let frames = 0;
        let fpsWindow = performance.now();
        const frameMs = 1000 / TARGET_FPS;

        const pump = (bytes: Uint8Array) => {
          const qr = encodeFrameQr(bytes, version);
          const canvas = canvasRef.current;
          if (canvas) drawMatrix(canvas, qr.matrix);
          if (rx) rx.push(bytes);
          frames += 1;
          const now = performance.now();
          if (now - fpsWindow >= 400) {
            const fps = (frames / (now - fpsWindow)) * 1000;
            statsRef.current.txFps = fps;
            statsRef.current.captureFps = fps;
            if (rx) {
              rx.stats.txFps = fps;
              rx.stats.captureFps = fps;
              rx.stats.bytesPerFrame = bytes.byteLength;
              statsRef.current = { ...rx.stats, txFps: fps, captureFps: fps };
            } else {
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
            }
            frames = 0;
            fpsWindow = now;
          } else if (rx) {
            statsRef.current = {
              ...rx.stats,
              txFps: statsRef.current.txFps,
              captureFps: statsRef.current.captureFps,
            };
          }
        };

        pump(first.bytes);

        const loop = (t: number) => {
          if (cancelled || rx?.complete || rx?.decoder?.done) return;
          if (t - last >= frameMs) {
            last = t;
            pump(tx.next().bytes);
          }
          if (!cancelled && !rx?.complete && !rx?.decoder?.done) raf = requestAnimationFrame(loop);
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
      window.clearInterval(statsTimer.current);
    };
  }, [mode, runId, loadPayload, armed]);

  async function onPick(list: FileList | null) {
    const file = list?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setError(`Keep files under ${MAX_FILE_BYTES / 1024} KB for this demo.`);
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

  const progress = stats.k ? Math.min(1, stats.recovered / stats.k) : 0;

  return (
    <div className="flex flex-col gap-6">
      {result ? (
        <CompleteCard
          result={result}
          onReplay={() => {
            setResult(null);
            setRunId((n) => n + 1);
          }}
        />
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono text-[0.65rem] tracking-[0.16em] text-subtle uppercase">
              LUX — Optical file transfer
            </p>
            <p className="font-mono text-[0.65rem] text-muted">
              {stats.txFps ? `${stats.txFps.toFixed(0)} FPS` : "—"} ·{" "}
              {stats.bytesPerFrame ? `${stats.bytesPerFrame} B/frame` : "—"}
            </p>
          </div>
          <QrPlate canvasRef={canvasRef} caption={stats.filename || undefined} />
          {mode === "demo" ? (
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full bg-accent transition-[width] duration-150"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          ) : null}
          <p className="mt-3 text-xs text-muted">{status}</p>
          {error ? <p className="mt-2 text-xs text-fg">{error}</p> : null}
        </div>

        <div className="flex flex-col gap-5">
          <div className="rounded-xl border border-border bg-surface p-5">
            <StatGrid stats={stats} />
          </div>

          <div className="flex flex-col gap-3">
            <p className="text-xs tracking-[0.14em] text-subtle uppercase">Payload</p>
            <div className="flex flex-wrap gap-2">
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
                variant={picked ? "default" : "outline"}
                onClick={() => inputRef.current?.click()}
              >
                {picked ? picked.filename : "Your file"}
              </Button>
              <input
                ref={inputRef}
                type="file"
                className="sr-only"
                onChange={(e) => void onPick(e.target.files)}
              />
            </div>
            {running && mode === "send" ? (
              <p className="text-xs text-muted">
                Point another device at this screen and open Receive. The stream loops until you
                leave the page.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
