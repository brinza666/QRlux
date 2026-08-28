import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { TransferStage } from "@/components/transfer-stage";

export const Route = createFileRoute("/send")({ component: SendPage });

function SendPage() {
  return (
    <div className="min-h-dvh bg-bg text-fg">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6">
        <div className="pt-4 pb-8 sm:pt-8">
          <p className="font-mono text-[0.7rem] tracking-[0.22em] text-subtle uppercase">
            Transmitter
          </p>
          <h1 className="mt-3 text-3xl font-medium tracking-tight sm:text-4xl">Broadcast a file</h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
            The screen becomes the radio. Pick a file, keep this page in the foreground, and point
            a second device running Receive at the QR plate.
          </p>
        </div>
        <TransferStage mode="send" />
      </main>
    </div>
  );
}
