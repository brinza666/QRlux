import { createFileRoute } from "@tanstack/react-router";
import { ReceiveStage } from "@/components/receive-stage";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const Route = createFileRoute("/receive")({ component: ReceivePage });

export function ReceivePage() {
  return (
    <div className="flex min-h-dvh flex-col bg-bg text-fg">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-4 pb-20 sm:px-6 sm:pt-8">
        <ReceiveStage variant="page" />
      </main>
      <SiteFooter />
    </div>
  );
}
