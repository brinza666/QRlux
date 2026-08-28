import { createFileRoute, Link } from "@tanstack/react-router";
import { Camera, Download, Smartphone, Upload } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/android")({ component: AndroidPage });

const SITE = "https://brinza666.github.io/QRlux";
const GH_SEND = `${SITE}/releases/lux-send.apk`;
const GH_RECV = `${SITE}/releases/lux-receive.apk`;
const RELEASE = "https://github.com/brinza666/QRlux/releases";

function AndroidPage() {
  return (
    <div className="min-h-dvh bg-bg text-fg">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl px-4 pb-24 sm:px-6">
        <p className="pt-6 font-mono text-[0.7rem] tracking-[0.22em] text-subtle uppercase">
          Android
        </p>
        <h1 className="mt-4 text-3xl font-medium tracking-tight sm:text-5xl">
          Two phones, two APKs.
        </h1>
        <p className="mt-5 text-[0.95rem] leading-relaxed text-muted">
          The installers are already on this site (~142 KB each). Download them in the phone
          browser, or beam them as light from a PC — then install later.
        </p>

        <section className="mt-8 rounded-xl border border-border bg-surface p-5">
          <p className="font-mono text-[0.65rem] tracking-[0.16em] text-subtle">AS LIGHT</p>
          <h2 className="mt-2 text-lg font-medium">PC screen → phone browser</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-muted">
            <li>
              On the computer, open Send and tap <span className="text-fg">Receive APK</span> (or
              Send APK). The QR fountain starts immediately.
            </li>
            <li>
              On the phone, open this same site in the browser and go to Receive. Point the camera
              at the computer. No app install needed yet.
            </li>
            <li>
              When transfer completes the browser downloads <span className="font-mono text-fg">lux-receive.apk</span>.
              Open that file later to install.
            </li>
          </ol>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button asChild>
              <Link to="/send" search={{ payload: "receive-apk" }}>
                <Upload className="size-4" />
                Beam Receive APK
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/send" search={{ payload: "send-apk" }}>
                Beam Send APK
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/receive">
                <Camera className="size-4" />
                Receive
              </Link>
            </Button>
          </div>
        </section>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <article className="rounded-xl border border-border bg-surface p-5">
            <p className="font-mono text-[0.65rem] tracking-[0.16em] text-subtle">SEND</p>
            <h2 className="mt-2 text-lg font-medium">LUX Send</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Broadcast a file from the phone screen. Direct download, no Play Store.
            </p>
            <Button asChild className="mt-5 w-full">
              <a href="/releases/lux-send.apk" download="lux-send.apk">
                <Download className="size-4" />
                lux-send.apk
              </a>
            </Button>
            <a href={GH_SEND} className="mt-2 block text-center text-xs text-muted underline-offset-2 hover:underline">
              Public site copy
            </a>
          </article>
          <article className="rounded-xl border border-border bg-surface p-5">
            <p className="font-mono text-[0.65rem] tracking-[0.16em] text-subtle">RECEIVE</p>
            <h2 className="mt-2 text-lg font-medium">LUX Receive</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Camera decoder. Save reconstructed files to Downloads.
            </p>
            <Button asChild className="mt-5 w-full">
              <a href="/releases/lux-receive.apk" download="lux-receive.apk">
                <Download className="size-4" />
                lux-receive.apk
              </a>
            </Button>
            <a href={GH_RECV} className="mt-2 block text-center text-xs text-muted underline-offset-2 hover:underline">
              Public site copy
            </a>
          </article>
        </div>

        <p className="mt-8 text-sm text-muted">
          Public site for any phone browser:{" "}
          <a href={SITE} className="text-fg underline-offset-2 hover:underline">
            brinza666.github.io/QRlux
          </a>
          . Also on{" "}
          <a href={RELEASE} className="text-fg underline-offset-2 hover:underline">
            GitHub Releases
          </a>
          .
        </p>

        <div className="mt-6 flex items-center gap-2 text-sm text-muted">
          <Smartphone className="size-4" />
          Android 8+ (API 26). WebView, no Play services.
        </div>
      </main>
    </div>
  );
}
