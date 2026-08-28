import type { RxStats } from "@/lib/lux/codec";
import { etaLabel, transferProgress } from "@/lib/lux/progress";
import { cn, formatBytes, formatRate } from "@/lib/utils";

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
      <div className="text-xs font-medium tracking-[0.14em] text-subtle uppercase">{label}</div>
      <div
        className={cn(
          "mt-1 truncate font-mono text-base leading-none font-medium tabular-nums sm:text-lg",
          accent ? "text-ok" : "text-fg",
        )}
      >
        {value}
      </div>
    </div>
  );
}

export function StatGrid({ stats, role = "receive" }: { stats: RxStats; role?: "receive" | "send" | "demo" }) {
  const fps = stats.txFps || stats.captureFps;
  const p = transferProgress(stats, role);
  const time = p.etaSec != null && p.pct < 1 ? etaLabel(p.etaSec) : stats.complete ? "done" : "—";

  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-4">
      <Cell
        label="File"
        value={stats.filename ? stats.filename : "waiting"}
      />
      <Cell
        label="Size"
        value={stats.payloadBytes ? formatBytes(stats.payloadBytes) : "—"}
      />
      <Cell
        label="Pieces"
        value={stats.k ? `${stats.recovered} / ${stats.k}` : "—"}
        accent={stats.locked}
      />
      <Cell label="Time left" value={time} accent={Boolean(p.etaSec && p.pct < 1)} />
      <Cell label="Camera" value={fps ? `${fps.toFixed(0)} fps` : "—"} />
      <Cell
        label="Speed"
        value={stats.goodputKBs ? formatRate(stats.goodputKBs * 1024) : stats.decodeFps ? `${stats.decodeFps.toFixed(0)} fps` : "—"}
      />
    </div>
  );
}
