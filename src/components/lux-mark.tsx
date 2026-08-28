import { cn } from "@/lib/utils";

export function LuxMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("size-5", className)}
      fill="none"
      aria-hidden="true"
    >
      <rect x="2.2" y="2.2" width="7.6" height="7.6" stroke="currentColor" strokeWidth="1.8" />
      <rect x="14.2" y="2.2" width="7.6" height="7.6" stroke="currentColor" strokeWidth="1.8" />
      <rect x="2.2" y="14.2" width="7.6" height="7.6" stroke="currentColor" strokeWidth="1.8" />
      <rect x="15" y="15" width="6" height="6" fill="currentColor" />
    </svg>
  );
}
