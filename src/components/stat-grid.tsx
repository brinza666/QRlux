import type { RxStats } from "@/lib/lux/codec";
import { cn } from "@/lib/utils";

function Cell({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="min-w-0">
      <div className="text-[0.65rem] font-medium tracking-[0.14em] text-subtle uppercase">
        {label}
      </div>
      <div
        className={cn(
          "mt-1 font-mono text-lg leading-none font-medium tabular-nums sm:text-xl",
          accent ? "text-accent" : "text-fg",
        )}
      >
        {value}
      </div>
    </div>
  );
}

export function StatGrid({ stats }: { stats: RxStats }) {
  const fps = stats.txFps || stats.captureFps;
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-5">
      <Cell label="Capture fps" value={fps ? fps.toFixed(0) : "—"} />
      <Cell label="Decode fps" value={stats.decodeFps ? stats.decodeFps.toFixed(1) : "—"} accent />
      <Cell label="Lock" value={stats.locked ? "LOCK" : "—"} accent={stats.locked} />
      <Cell label="Dropped" value={String(stats.dropped)} />
      <Cell
        label="Goodput"
        value={stats.goodputKBs ? `${stats.goodputKBs.toFixed(1)} KB/s` : "0.0 KB/s"}
        accent
      />
      <Cell label="Elapsed" value={`${stats.elapsedSec.toFixed(1)} s`} />
      <Cell
        label="Frames"
        value={`${stats.framesNew}/${stats.framesDup}/${stats.framesRed}`}
      />
      <Cell label="Session" value={stats.session} />
      <Cell label="Block len" value={stats.blockLen ? `${stats.blockLen} B` : "—"} />
      <Cell
        label="Payload"
        value={
          stats.payloadBytes
            ? stats.payloadBytes >= 1024
              ? `${(stats.payloadBytes / 1024).toFixed(0)} KB`
              : `${stats.payloadBytes} B`
            : "—"
        }
      />
    </div>
  );
}
