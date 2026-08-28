import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Camera, Smartphone, Upload } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { TransferStage } from "@/components/transfer-stage";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <div className="min-h-dvh bg-bg text-fg">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-4 pb-20 sm:px-6">
        <section className="pt-6 sm:pt-10">
          <p className="font-mono text-[0.7rem] tracking-[0.22em] text-subtle uppercase">
            Fountain QR · air-gapped
          </p>
          <h1 className="mt-4 max-w-xl text-4xl leading-[1.05] font-medium tracking-tight sm:text-6xl">
            Files, as light.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-muted">
            One screen broadcasts an endless fountain of QR frames. Another camera drinks them
            until the file reconstitutes. No Wi-Fi, no Bluetooth, no pairing.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild>
              <a href="#stage">
                Watch it run
                <ArrowRight className="size-4" />
              </a>
            </Button>
            <Button asChild variant="outline">
              <Link to="/send">
                <Upload className="size-4" />
                Send a file
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
                Android APKs
              </Link>
            </Button>
          </div>
        </section>

        <section id="stage" className="scroll-mt-6">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-medium tracking-tight">Live loopback</h2>
              <p className="mt-1 max-w-md text-sm text-muted">
                Same-screen decoder, real fountain frames. Open Receive on a second device to
                take the optical path.
              </p>
            </div>
          </div>
          <TransferStage mode="demo" />
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          {[
            {
              k: "01",
              t: "Fountain codes",
              d: "Each frame is a random XOR of source blocks. Missed, blurred, or out-of-order frames only slow you down.",
            },
            {
              k: "02",
              t: "No backchannel",
              d: "The sender never hears from the camera. It just keeps pouring symbols until the receiver has enough.",
            },
            {
              k: "03",
              t: "Verified payload",
              d: "Filename, type, and SHA-256 travel in the header. The file is offered only after the hash matches.",
            },
          ].map((item) => (
            <article
              key={item.k}
              className="rounded-xl border border-border bg-surface p-5"
            >
              <p className="font-mono text-[0.65rem] tracking-[0.16em] text-subtle">{item.k}</p>
              <h3 className="mt-3 text-base font-medium">{item.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{item.d}</p>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
