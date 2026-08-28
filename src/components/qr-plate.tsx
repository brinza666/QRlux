import type { RefObject } from "react";
import { cn } from "@/lib/utils";

export function QrPlate({
  canvasRef,
  caption,
  className,
  size = "default",
}: {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  caption?: string;
  className?: string;
  size?: "default" | "hero";
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl bg-paper",
        size === "hero" ? "p-1.5 sm:p-2" : "p-3 sm:p-4",
        className,
      )}
    >
      <canvas
        ref={canvasRef}
        className={cn(
          "aspect-square w-full bg-paper [image-rendering:pixelated]",
          size === "hero" && "max-h-[min(88dvh,100vw)]",
        )}
        aria-label="Fountain QR stream"
      />
      {caption ? (
        <p className="mt-2 text-center font-mono text-xs tracking-wide text-ink/60 uppercase">
          {caption}
        </p>
      ) : null}
    </div>
  );
}
