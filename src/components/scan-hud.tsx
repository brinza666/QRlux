import type { RxStats } from "@/lib/lux/codec";
import { etaLabel, percentLabel, transferProgress } from "@/lib/lux/progress";
import { cn, formatBytes } from "@/lib/utils";

export function ScanHud({
  stats,
  role,
  className,
}: {
  stats: RxStats;
  role: "receive" | "send" | "demo";
  className?: string;
}) {
  const p = transferProgress(stats, role);
  const showBar = role !== "send";

  return (
    <div
      className={cn(
        "pointer-events-none rounded-lg bg-bg/80 px-3 py-3 text-fg backdrop-blur-sm",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 text-sm leading-snug font-medium">{p.phrase}</p>
        {showBar ? (
          <p className="shrink-0 font-mono text-sm tabular-nums text-ok">
            {percentLabel(p.pct)}
          </p>
        ) : stats.txFps ? (
          <p className="shrink-0 font-mono text-xs tabular-nums text-muted">
            {stats.txFps.toFixed(0)} fps
          </p>
        ) : null}
      </div>
      <p className="mt-1 text-xs leading-relaxed text-muted">{p.detail}</p>
      {showBar ? (
        <>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-ok transition-[width] duration-150 ease-[var(--ease-smooth-out)]"
              style={{ width: `${Math.max(p.pct * 100, stats.locked ? 2 : 0)}%` }}
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 font-mono text-xs tabular-nums text-subtle">
            {stats.k ? (
              <span>
                {stats.recovered}/{stats.k} pieces
              </span>
            ) : (
              <span>no header yet</span>
            )}
            {p.etaSec != null && p.pct < 1 ? <span>{etaLabel(p.etaSec)}</span> : null}
            {stats.payloadBytes ? <span>{formatBytes(stats.payloadBytes)}</span> : null}
            {stats.goodputKBs > 0.1 ? <span>{stats.goodputKBs.toFixed(0)} KB/s</span> : null}
          </div>
        </>
      ) : null}
    </div>
  );
}

export function Viewfinder({ locked }: { locked: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-3 sm:inset-4" aria-hidden>
      {(
        [
          "top-0 left-0 border-t-2 border-l-2",
          "top-0 right-0 border-t-2 border-r-2",
          "bottom-0 left-0 border-b-2 border-l-2",
          "bottom-0 right-0 border-b-2 border-r-2",
        ] as const
      ).map((pos) => (
        <span
          key={pos}
          className={cn(
            "absolute size-8 rounded-xs border-solid transition-colors duration-150",
            pos,
            locked ? "border-ok" : "border-accent/70",
          )}
        />
      ))}
    </div>
  );
}

export function LockPill({ locked }: { locked: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-xs tracking-wide uppercase",
        locked ? "bg-ok/15 text-ok" : "bg-surface-2 text-muted",
      )}
    >
      <span
        className={cn("size-1.5 rounded-full", locked ? "bg-ok scan-pulse" : "bg-subtle")}
      />
      {locked ? "Locked" : "Searching"}
    </span>
  );
}
