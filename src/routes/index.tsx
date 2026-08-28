import { createFileRoute, Link } from "@tanstack/react-router";
import { Camera, Smartphone, Upload } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <div className="min-h-dvh bg-bg text-fg">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-12 px-4 pb-20 sm:px-6">
        <section className="pt-6 sm:pt-10">
          <p className="font-mono text-[0.7rem] tracking-[0.22em] text-subtle uppercase">
            Internal · air-gapped
          </p>
          <h1 className="mt-4 max-w-xl text-4xl leading-[1.05] font-medium tracking-tight sm:text-6xl">
            Files, as light.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-muted">
            Point a phone at a computer screen. The file arrives as QR frames. No network between
            the two devices. For internal use only.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild>
              <Link to="/send">
                <Upload className="size-4" />
                Send
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/receive">
                <Camera className="size-4" />
                Receive
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/android">
                <Smartphone className="size-4" />
                Install APKs
              </Link>
            </Button>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-surface p-6">
          <p className="font-mono text-xs tracking-[0.16em] text-subtle uppercase">Steps</p>
          <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-relaxed text-muted">
            <li>Computer opens Send. Phone opens Receive.</li>
            <li>Scan the first setup QR if Receive is not open yet.</li>
            <li>Hold the phone so the whole square is in view. The main camera is used, not macro.</li>
            <li>Download once when the file is ready.</li>
          </ol>
        </section>
      </main>
    </div>
  );
}
