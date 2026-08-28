import { useEffect, useRef } from "react";
import type { RxStats } from "@/lib/lux/codec";
import { playCue } from "@/lib/lux/feedback";

export function useTransferCues(stats: RxStats, opts?: { complete?: boolean; error?: string | null }) {
  const prev = useRef({ locked: false, recovered: 0, complete: false, error: null as string | null });

  useEffect(() => {
    const p = prev.current;
    if (opts?.error && opts.error !== p.error) playCue("error");
    if (!p.locked && stats.locked) playCue("lock");
    if (stats.recovered > p.recovered) playCue("tick");
    if ((opts?.complete || stats.complete) && !p.complete) playCue("complete");
    prev.current = {
      locked: stats.locked,
      recovered: stats.recovered,
      complete: Boolean(opts?.complete || stats.complete),
      error: opts?.error ?? null,
    };
  }, [opts?.complete, opts?.error, stats.complete, stats.locked, stats.recovered]);
}
