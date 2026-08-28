import { createFileRoute } from "@tanstack/react-router";
import { ReceiveStage } from "@/components/receive-stage";
import { SiteHeader } from "@/components/site-header";

export const Route = createFileRoute("/receive")({ component: ReceivePage });

function ReceivePage() {
  return (
    <div className="min-h-dvh bg-bg text-fg">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl px-4 pt-4 pb-20 sm:px-6 sm:pt-8">
        <ReceiveStage variant="page" />
      </main>
    </div>
  );
}
