import { useCallback, useEffect, useRef, useState } from "react";
import { FeedbackToggle } from "@/components/feedback-toggle";
import { QrPlate } from "@/components/qr-plate";
import { ScanHud } from "@/components/scan-hud";
import { StatGrid } from "@/components/stat-grid";
import { Button } from "@/components/ui/button";
import { useTransferCues } from "@/components/use-transfer-cues";
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
import { fileFromBlob, loadApkSample, makeNote, makeWindowLight } from "@/lib/lux/samples";
import { formatBytes } from "@/lib/utils";

type SampleId = "photo" | "note" | "file" | "apk-send" | "apk-receive";

export function AppSend() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [stats, setStats] = useState<RxStats>(emptyStats());
  const [status, setStatus] = useState("Pick a file to fill the screen with QR frames.");
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [sample, setSample] = useState<SampleId>("photo");
  const [picked, setPicked] = useState<FilePayload | null>(null);
  const [armed, setArmed] = useState(false);
  const [runId, setRunId] = useState(0);
  const [deviceLabel, setDeviceLabel] = useState("");

  useTransferCues(stats, { error });
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
    if (!armed) return;
    let cancelled = false;
    let stop: (() => void) | null = null;
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
            statsRef.current = { ...statsRef.current, ...patch };
          },
        });
        stop = handle.stop;
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to start transfer");
        setRunning(false);
      }
    })();

    return () => {
      cancelled = true;
      stop?.();
      window.clearInterval(flush);
    };
  }, [armed, runId, loadPayload]);

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

  return (
    <div className="flex min-h-dvh flex-col bg-bg text-fg">
      <header className="flex items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2">
        <p className="font-mono text-xs tracking-[0.18em] text-subtle uppercase">LUX Send</p>
        <div className="flex items-center gap-2">
          <p className="hidden font-mono text-xs text-muted sm:block">{deviceLabel}</p>
          <FeedbackToggle />
        </div>
      </header>

      <div className="px-4">
        <div className="mx-auto w-full max-w-[min(92vmin,920px)]">
          <QrPlate canvasRef={canvasRef} size="hero" />
        </div>
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
        <Button
          variant={picked ? "default" : "outline"}
          onClick={() => inputRef.current?.click()}
        >
          {picked ? picked.filename : "Your file"}
        </Button>
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
        </div>
        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          onChange={(e) => void onPick(e.target.files)}
        />
        {running ? (
          <p className="text-xs text-muted">
            Fill the other camera with this plate. {deviceLabel}
          </p>
        ) : (
          <p className="text-xs text-muted">
            Files up to {formatBytes(MAX_FILE_BYTES)}. No network is used.
          </p>
        )}
      </div>
    </div>
  );
}
