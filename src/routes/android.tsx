import { createFileRoute, Link } from "@tanstack/react-router";
import { Camera, Download, Smartphone, Upload } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { GITHUB_RELEASES, GITHUB_REPO, PUBLIC_ORIGIN, releaseUrl } from "@/lib/lux/site";

export const Route = createFileRoute("/android")({ component: AndroidPage });

export function AndroidPage() {
  const sendApk = releaseUrl("lux-send.apk");
  const recvApk = releaseUrl("lux-receive.apk");

  return (
    <div className="flex min-h-dvh flex-col bg-bg text-fg">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-24 sm:px-6">
        <p className="pt-6 font-mono text-[0.7rem] tracking-[0.22em] text-subtle uppercase">
          Internal · Android
        </p>
        <h1 className="mt-4 text-3xl font-medium tracking-tight sm:text-5xl">
          Two small installers
        </h1>
        <p className="mt-5 text-[0.95rem] leading-relaxed text-muted">
          Receive on the phone that catches files. Send on the phone that broadcasts. Download
          one APK at a time (~152 KB). Uninstall the old copy first.
        </p>

        <section className="mt-8 rounded-xl border border-border bg-surface p-5">
          <p className="font-mono text-[0.65rem] tracking-[0.16em] text-subtle">AS LIGHT</p>
          <h2 className="mt-2 text-lg font-medium">PC screen → phone browser</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-muted">
            <li>On the computer, open Send. It starts with a setup QR, then the Receive APK.</li>
            <li>
              On the phone, open Receive. Allow camera — the main rear lens is used, not macro.
              Point at the computer and hold still.
            </li>
            <li>When it finishes, tap Download once. Install later from Downloads.</li>
          </ol>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button asChild>
              <Link to="/send">
                <Upload className="size-4" />
                Open Send
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
              <a href={sendApk} download="lux-send.apk">
                <Download className="size-4" />
                lux-send.apk
              </a>
            </Button>
          </article>
          <article className="rounded-xl border border-border bg-surface p-5">
            <p className="font-mono text-[0.65rem] tracking-[0.16em] text-subtle">RECEIVE</p>
            <h2 className="mt-2 text-lg font-medium">LUX Receive</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Camera decoder. Save reconstructed files to Downloads.
            </p>
            <Button asChild className="mt-5 w-full">
              <a href={recvApk} download="lux-receive.apk">
                <Download className="size-4" />
                lux-receive.apk
              </a>
            </Button>
          </article>
        </div>

        <p className="mt-8 text-sm text-muted">
          Site:{" "}
          <a href={PUBLIC_ORIGIN} className="text-fg underline-offset-2 hover:underline">
            brinza666.github.io/QRlux
          </a>
          . Source:{" "}
          <a href={GITHUB_REPO} className="text-fg underline-offset-2 hover:underline">
            GitHub
          </a>
          . Installers also on{" "}
          <a href={GITHUB_RELEASES} className="text-fg underline-offset-2 hover:underline">
            Releases
          </a>
          .
        </p>

        <div className="mt-6 flex items-center gap-2 text-sm text-muted">
          <Smartphone className="size-4" />
          Android 8+ (API 26). WebView, no Play services.
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
