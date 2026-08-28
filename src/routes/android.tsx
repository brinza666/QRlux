import { createFileRoute, Link } from "@tanstack/react-router";
import { Download, Smartphone } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/android")({ component: AndroidPage });

const SEND_APK = "https://github.com/brinza666/QRlux/raw/main/releases/lux-send.apk";
const RECEIVE_APK = "https://github.com/brinza666/QRlux/raw/main/releases/lux-receive.apk";
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
          Sideload LUX Send on the broadcasting phone and LUX Receive on the camera phone. The
          packages live in the GitHub repo so you can download them later from the phone itself —
          no Play Store, no pairing.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <article className="rounded-xl border border-border bg-surface p-5">
            <p className="font-mono text-[0.65rem] tracking-[0.16em] text-subtle">SEND</p>
            <h2 className="mt-2 text-lg font-medium">LUX Send</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Pick a file. The screen becomes a fountain of QR frames. Keep it in the foreground
              and bright.
            </p>
            <Button asChild className="mt-5 w-full">
              <a href={SEND_APK} download="lux-send.apk">
                <Download className="size-4" />
                lux-send.apk
              </a>
            </Button>
          </article>
          <article className="rounded-xl border border-border bg-surface p-5">
            <p className="font-mono text-[0.65rem] tracking-[0.16em] text-subtle">RECEIVE</p>
            <h2 className="mt-2 text-lg font-medium">LUX Receive</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Point the camera at the sender. When the hash matches, save the file to Downloads.
            </p>
            <Button asChild className="mt-5 w-full">
              <a href={RECEIVE_APK} download="lux-receive.apk">
                <Download className="size-4" />
                lux-receive.apk
              </a>
            </Button>
          </article>
        </div>

        <ol className="mt-10 list-decimal space-y-3 pl-5 text-sm leading-relaxed text-muted">
          <li>On the phone, open this page (or the GitHub repo) and tap the APK you need.</li>
          <li>
            Android will warn that the file is from outside Play. Allow the browser to install
            unknown apps, then Install.
          </li>
          <li>Grant the camera permission on Receive. Send only needs a file picker.</li>
          <li>
            Preview the same UIs in the browser first:{" "}
            <Link to="/app/send" className="text-fg underline-offset-2 hover:underline">
              Send shell
            </Link>{" "}
            and{" "}
            <Link to="/app/receive" className="text-fg underline-offset-2 hover:underline">
              Receive shell
            </Link>
            .
          </li>
        </ol>

        <p className="mt-8 text-sm text-muted">
          Signed with a debug keystore for sideloading. Rebuild with{" "}
          <span className="font-mono text-fg">npm run build:apks</span>. Also published under{" "}
          <a href={RELEASE} className="text-fg underline-offset-2 hover:underline">
            GitHub Releases
          </a>
          .
        </p>

        <div className="mt-8 flex items-center gap-2 text-sm text-muted">
          <Smartphone className="size-4" />
          Android 8+ (API 26). WebView, no Play services.
        </div>
      </main>
    </div>
  );
}
