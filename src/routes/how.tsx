import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/how")({ component: HowPage });

export function HowPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-bg text-fg">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-24 sm:px-6">
        <p className="pt-6 font-mono text-[0.7rem] tracking-[0.22em] text-subtle uppercase">
          Internal use
        </p>
        <h1 className="mt-4 text-3xl font-medium tracking-tight sm:text-5xl">How to use LUX</h1>
        <div className="mt-8 space-y-6 text-[0.95rem] leading-relaxed text-muted">
          <ol className="list-decimal space-y-3 pl-5">
            <li>
              <span className="text-fg">Computer:</span> open Send. Leave that tab in the
              foreground. The first QR is a setup code — scan it with the phone camera app if
              Receive is not open yet.
            </li>
            <li>
              <span className="text-fg">Phone:</span> open Receive (installed app, or the Receive
              page). Allow the camera. The main rear camera is chosen for you — not macro.
            </li>
            <li>
              Fill the phone finder with the glowing square. Hold still. Filename, pieces, and
              time left stay on screen.
            </li>
            <li>
              When it says the file is ready, tap download once. Install APKs from Downloads later.
            </li>
          </ol>
          <h2 className="pt-4 text-xl font-medium text-fg">If it will not lock</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>You should see the computer screen, not the floor. Use Lens if the view is wrong.</li>
            <li>Turn off Opera video pop-out / booster.</li>
            <li>Do not pinch-zoom the page. The plate is already full-window.</li>
            <li>Keep the sending screen bright. Cover the camera with the QR, not the other way around.</li>
          </ul>
          <p>
            Anyone who can see the sending screen can rebuild the file. Internal use only.
          </p>
        </div>
        <div className="mt-10 flex flex-wrap gap-3">
          <Button asChild>
            <Link to="/send">Send</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/receive">Receive</Link>
          </Button>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
