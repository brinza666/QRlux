import { Github } from "lucide-react";
import { GITHUB_REPO } from "@/lib/lux/site";
import { cn } from "@/lib/utils";

export function GitHubLink({
  className,
  label = "GitHub",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <a
      href={GITHUB_REPO}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm px-2.5 py-2 text-xs text-muted transition-colors duration-150 hover:text-fg sm:text-sm",
        className,
      )}
    >
      <Github className="size-4 shrink-0" aria-hidden="true" />
      <span>{label}</span>
    </a>
  );
}
