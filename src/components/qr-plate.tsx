import type { RefObject } from "react";
import { cn } from "@/lib/utils";

export function QrPlate({
  canvasRef,
  caption,
  className,
}: {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  caption?: string;
  className?: string;
}) {
  return (
    <div className={cn("overflow-hidden rounded-xl bg-paper p-3 sm:p-4", className)}>
      <canvas
        ref={canvasRef}
        className="aspect-square w-full [image-rendering:pixelated]"
        aria-label="Fountain QR stream"
      />
      {caption ? (
        <p className="mt-2 text-center font-mono text-[0.65rem] tracking-wide text-ink/60 uppercase">
          {caption}
        </p>
      ) : null}
    </div>
  );
}
