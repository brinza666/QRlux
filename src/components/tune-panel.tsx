import { TUNE_META, type Density, type Tune } from "@/lib/lux/settings";
import { cn } from "@/lib/utils";

function SliderRow({
  label,
  hint,
  value,
  min,
  max,
  unit,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  unit?: string;
  onChange: (n: number) => void;
}) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between gap-2">
        <span className="text-xs tracking-[0.12em] text-subtle uppercase">{label}</span>
        <span className="font-mono text-xs text-fg">
          {value}
          {unit ? ` ${unit}` : ""}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 h-2 w-full accent-accent"
      />
      <span className="mt-1 block text-xs leading-snug text-muted">{hint}</span>
    </label>
  );
}

export function TunePanel({
  tune,
  onChange,
  className,
}: {
  tune: Tune;
  onChange: (next: Tune) => void;
  className?: string;
}) {
  const set = (patch: Partial<Tune>) => onChange({ ...tune, ...patch });
  const dens: { id: Density; label: string }[] = [
    { id: "easy", label: "Easy scan" },
    { id: "balanced", label: "Balanced" },
    { id: "fast", label: "Fewer pieces" },
  ];

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <SliderRow
        {...TUNE_META.fps}
        value={tune.fps}
        unit="fps"
        onChange={(fps) => set({ fps })}
      />
      <SliderRow
        {...TUNE_META.hold}
        value={tune.hold}
        unit="×"
        onChange={(hold) => set({ hold })}
      />
      <SliderRow
        {...TUNE_META.headerEvery}
        value={tune.headerEvery}
        onChange={(headerEvery) => set({ headerEvery })}
      />
      <SliderRow
        {...TUNE_META.echoPct}
        value={tune.echoPct}
        unit="%"
        onChange={(echoPct) => set({ echoPct })}
      />
      <SliderRow
        label="Setup QR seconds"
        hint="0 = stay until you tap Start fountain. Give the phone time to scan."
        value={tune.handshakeSec}
        min={0}
        max={90}
        unit={tune.handshakeSec === 0 ? " wait" : "s"}
        onChange={(handshakeSec) => set({ handshakeSec })}
      />
      <div>
        <p className="text-xs tracking-[0.12em] text-subtle uppercase">QR density</p>
        <div className="mt-2 grid grid-cols-3 gap-1">
          {dens.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => set({ density: d.id })}
              className={cn(
                "h-9 rounded-sm px-2 text-xs",
                tune.density === d.id
                  ? "bg-accent text-accent-fg"
                  : "border border-border text-muted",
              )}
            >
              {d.label}
            </button>
          ))}
        </div>
        <p className="mt-1 text-xs text-muted">
          Easy = bigger modules, more pieces. Fast = denser QR, fewer pieces. Restart the
          fountain after changing this.
        </p>
      </div>
      <label className="flex items-center justify-between gap-3 text-sm">
        <span>
          <span className="block">Setup QR during send</span>
          <span className="block text-xs text-muted">
            Off by default — keeps the plate the same size so the camera does not re-zoom.
          </span>
        </span>
        <input
          type="checkbox"
          checked={tune.handshakeLoop}
          onChange={(e) => set({ handshakeLoop: e.target.checked })}
          className="size-4 accent-accent"
        />
      </label>
    </div>
  );
}
