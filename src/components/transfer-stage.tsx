import { useCallback, useEffect, useRef, useState } from "react";
import { CompleteCard } from "@/components/complete-card";
import { QrPlate } from "@/components/qr-plate";
import { ScanHud } from "@/components/scan-hud";
import { StatGrid } from "@/components/stat-grid";
import { Button } from "@/components/ui/button";
import { useTransferCues } from "@/components/use-transfer-cues";
import { startBroadcast } from "@/lib/lux/broadcast";
import {
  emptyStats,
  MAX_FILE_BYTES,
  Receiver,
  Transmitter,
  type CompleteResult,
  type FilePayload,
  type RxStats,
} from "@/lib/lux/codec";
import { probeDevice } from "@/lib/lux/device";
import { playCue, installAudioUnlock } from "@/lib/lux/feedback";
import { fileFromBlob, loadApkSample, makeNote, makeWindowLight } from "@/lib/lux/samples";
import { formatBytes } from "@/lib/utils";

type SampleId = "photo" | "note" | "file" | "apk-send" | "apk-receive";

export function TransferStage({
  mode,
  initialSample,
}: {
  mode: "demo" | "send";
  initialSample?: SampleId;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stats, setStats] = useState<RxStats>(emptyStats());
  const [result, setResult] = useState<CompleteResult | null>(null);
  const [status, setStatus] = useState(
    mode === "demo"
      ? "Preparing sample…"
      : "Pick a file. The QR will fill the screen so a phone can lock on.",
  );
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [sample, setSample] = useState<SampleId>(initialSample ?? "photo");
  const [runId, setRunId] = useState(0);
  const [picked, setPicked] = useState<FilePayload | null>(null);
  const [armed, setArmed] = useState(
    mode === "demo" || Boolean(initialSample && initialSample !== "file"),
  );
  const [deviceLabel, setDeviceLabel] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const statsTimer = useRef<number>(0);

  useTransferCues(stats, { complete: Boolean(result), error });
  useEffect(() => installAudioUnlock(), []);
  useEffect(() => {
    setDeviceLabel(probeDevice().label);
  }, []);

  const loadPayload = useCallback(async (): Promise<FilePayload> => {
    if (picked) return picked;
    if (sample === "note") return makeNote();
    if (sample === "apk-send") return loadApkSample("send");
    if (sample === "apk-receive") return loadApkSample("receive");
    return makeWindowLight();
  }, [picked, sample]);

  useEffect(() => {
    if (!armed) {
      setStatus("Pick a file. The QR will fill the screen so a phone can lock on.");
      setRunning(false);
      return;
    }

    let cancelled = false;
    let stopBroadcast: (() => void) | null = null;
    const rx = mode === "demo" ? new Receiver() : null;
    const statsRef = { current: emptyStats() };

    if (rx) {
      rx.onComplete = (res) => {
        if (cancelled) return;
        setResult(res);
        statsRef.current.complete = true;
        setStats({ ...statsRef.current });
        stopBroadcast?.();
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
        setRunning(true);
        playCue("start");
        setStatus(
          `${payload.filename} · ${formatBytes(payload.bytes.byteLength)} · ${tx.header.k} pieces`,
        );

        const handle = startBroadcast({
          tx,
          canvas: () => canvasRef.current,
          payloadBytes: payload.bytes.byteLength,
          filename: payload.filename,
          onStats(patch) {
            if (rx) {
              Object.assign(rx.stats, patch);
              statsRef.current = { ...rx.stats };
            } else {
              statsRef.current = { ...statsRef.current, ...patch };
            }
          },
          onFrameBytes: rx
            ? (bytes) => {
                rx.push(bytes);
                statsRef.current = {
                  ...rx.stats,
                  txFps: statsRef.current.txFps,
                  captureFps: statsRef.current.captureFps,
                };
              }
            : undefined,
        });
        stopBroadcast = handle.stop;
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to start transfer");
        setRunning(false);
      }
    })();

    return () => {
      cancelled = true;
      stopBroadcast?.();
      window.clearInterval(statsTimer.current);
    };
  }, [mode, runId, loadPayload, armed]);

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
    setArmed(true);
    setRunId((n) => n + 1);
  }

  function startSample(id: SampleId) {
    setPicked(null);
    setSample(id);
    setArmed(true);
    setRunId((n) => n + 1);
  }

  const sendLayout = mode === "send";

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

      <div
        className={
          sendLayout
            ? "flex flex-col gap-5"
            : "grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start"
        }
      >
        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono text-xs tracking-[0.16em] text-subtle uppercase">
              LUX — Optical file transfer
            </p>
            <p className="font-mono text-xs text-muted">
              {deviceLabel || "…"}
              {stats.txFps ? ` · ${stats.txFps.toFixed(0)} fps` : ""}
            </p>
          </div>
          <div className={sendLayout ? "mx-auto w-full max-w-[min(92vmin,920px)]" : undefined}>
            <QrPlate canvasRef={canvasRef} size={sendLayout ? "hero" : "default"} />
          </div>
          <div className="mt-3">
            <ScanHud stats={stats} role={mode === "demo" ? "demo" : "send"} />
          </div>
          <p className="mt-3 text-xs text-muted">{status}</p>
          {error ? <p className="mt-2 text-xs text-fg">{error}</p> : null}
        </div>

        <div className="flex flex-col gap-5">
          <div className="rounded-xl border border-border bg-surface p-5">
            <StatGrid stats={stats} role={mode === "demo" ? "demo" : "send"} />
          </div>

          <div className="flex flex-col gap-3">
            <p className="text-xs tracking-[0.14em] text-subtle uppercase">Payload</p>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={picked ? "default" : "outline"}
                onClick={() => inputRef.current?.click()}
              >
                {picked ? picked.filename : "Your file"}
              </Button>
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
              <input
                ref={inputRef}
                type="file"
                className="sr-only"
                onChange={(e) => void onPick(e.target.files)}
              />
            </div>
            {mode === "send" ? (
              <p className="text-xs text-muted">
                Up to {formatBytes(MAX_FILE_BYTES)}. Speed is measured on this machine and
                the QR stays large so the phone does not need to zoom.
              </p>
            ) : null}
            {running && mode === "send" ? (
              <p className="text-xs text-muted">
                Keep this tab in the foreground. Open Receive on the phone and fill the
                viewfinder with the plate.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
