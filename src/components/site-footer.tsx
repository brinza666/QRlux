import { GITHUB_REPO } from "@/lib/lux/site";
import { GitHubLink } from "@/components/github-link";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border px-4 py-6 sm:px-6">
      <div className="mx-auto flex w-full max-w-2xl flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-[0.65rem] tracking-[0.16em] text-subtle uppercase">
          LUX · internal
        </p>
        <GitHubLink label="Source on GitHub" />
      </div>
      <p className="mx-auto mt-2 max-w-2xl text-xs text-subtle">
        <a href={GITHUB_REPO} className="underline-offset-2 hover:text-muted hover:underline">
          github.com/brinza666/QRlux
        </a>
      </p>
    </footer>
  );
}
