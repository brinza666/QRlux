import { Link } from "@tanstack/react-router";
import { FeedbackToggle } from "@/components/feedback-toggle";
import { LuxMark } from "@/components/lux-mark";

const links = [
  { to: "/how", label: "Use" },
  { to: "/send", label: "Send" },
  { to: "/receive", label: "Receive" },
  { to: "/android", label: "Android" },
] as const;

export function SiteHeader() {
  return (
    <header className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6">
      <Link
        to="/"
        className="flex items-center gap-2 text-fg"
        aria-label="LUX home"
      >
        <LuxMark />
        <span className="font-semibold tracking-tight">LUX</span>
      </Link>
      <nav className="flex items-center gap-1 sm:gap-2">
        {links.map((l) => (
          <Link
            key={l.to}
            to={l.to}
            className="rounded-sm px-2.5 py-2 text-xs text-muted transition-colors duration-150 hover:text-fg sm:px-3 sm:text-sm"
            activeProps={{ className: "text-fg" }}
          >
            {l.label}
          </Link>
        ))}
        <FeedbackToggle className="size-9" />
      </nav>
    </header>
  );
}
