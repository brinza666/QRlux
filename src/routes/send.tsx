import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { TransferStage } from "@/components/transfer-stage";

const PAYLOADS = {
  photo: "photo",
  note: "note",
  "send-apk": "apk-send",
  "receive-apk": "apk-receive",
} as const;

type PayloadKey = keyof typeof PAYLOADS;

type SendSearch = {
  payload?: PayloadKey;
};

export const Route = createFileRoute("/send")({
  validateSearch: (search: Record<string, unknown>): SendSearch => {
    const raw = typeof search.payload === "string" ? search.payload : "";
    if (raw in PAYLOADS) return { payload: raw as PayloadKey };
    return {};
  },
  component: SendPage,
});

function SendPage() {
  const { payload } = Route.useSearch();
  const initialSample = payload ? PAYLOADS[payload] : undefined;
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
            The screen becomes the radio. Pick a built-in APK sample to beam the installer to a
            phone browser, or send any file under 512 KB. Keep this page in the foreground.
          </p>
        </div>
        <TransferStage mode="send" initialSample={initialSample} />
      </main>
    </div>
  );
}
