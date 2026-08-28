import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/how")({ component: HowPage });

function HowPage() {
  return (
    <div className="min-h-dvh bg-bg text-fg">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl px-4 pb-24 sm:px-6">
        <p className="pt-6 font-mono text-[0.7rem] tracking-[0.22em] text-subtle uppercase">
          Field notes
        </p>
        <h1 className="mt-4 text-3xl font-medium tracking-tight sm:text-5xl">
          Yes — a screen can be a radio.
        </h1>
        <div className="mt-8 space-y-6 text-[0.95rem] leading-relaxed text-muted">
          <p>
            The clip you saw is real. A sending phone paints a QR code at 60 frames per second,
            about 3 KB in each frame. A second phone points its camera at that blizzard, decodes
            what it can, and rebuilds the file. In the recording, 365 KB crossed in 2.6 seconds
            — roughly 140 KB/s — and the reconstructed payload played back immediately.
          </p>
          <p>
            That throughput is not a trick of Wi-Fi hiding behind a QR. There is no pairing, no
            local network, no cloud. Photons, a CMOS sensor, and a lot of linear algebra.
          </p>

          <h2 className="pt-4 text-xl font-medium text-fg">Why ordinary QR streams fail</h2>
          <p>
            If you sliced a file into frame 1, 2, 3… and the camera missed frame 7, you would be
            stuck. Cameras miss constantly: autofocus, motion, a thumb, a 60 Hz panel beating
            against a 30 Hz shutter. A one-way optical link has no ACK, so you cannot ask for a
            retransmission.
          </p>

          <h2 className="pt-4 text-xl font-medium text-fg">Fountain codes</h2>
          <p>
            LUX uses a Luby Transform code. The file is split into K source blocks. Every outgoing
            frame XORs a random subset of those blocks together and tags the frame with an ID the
            receiver can turn back into the same subset. The sender can mint an endless stream of
            these symbols — a fountain.
          </p>
          <p>
            The receiver does not need particular frames. It needs slightly more than K{" "}
            <em>distinct</em> ones. A peeling decoder XORs known blocks out of each symbol; when a
            symbol collapses to a single unknown block, that block is recovered and the ripple
            continues. Dropped, duplicated, and out-of-order frames are expected, not fatal.
          </p>

          <h2 className="pt-4 text-xl font-medium text-fg">What the HUD is telling you</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <span className="text-fg">Capture / decode fps</span> — how fast the camera and the
              QR decoder are actually running.
            </li>
            <li>
              <span className="text-fg">Lock</span> — a header frame arrived, so K, block size,
              filename, and hash are known.
            </li>
            <li>
              <span className="text-fg">New / dup / red</span> — useful symbols, repeats of an ID
              already seen, and symbols that added no new information.
            </li>
            <li>
              <span className="text-fg">Goodput</span> — recovered payload per second, not raw
              camera bitrate.
            </li>
          </ul>

          <h2 className="pt-4 text-xl font-medium text-fg">What to expect</h2>
          <p>
            Native phone-to-phone tests of this technique have published around 140–200 KB/s, with
            desktop-to-phone peaks several times higher when the panel is a large, bright 60–120 Hz
            display and the QR is version 40 (~2953 bytes/frame). This web build uses a smaller QR
            so generation and decode stay smooth in a browser. Same-screen loopback is instant and
            honest about the codec. Two-device camera receive depends on focus, lighting, and how
            hard the phone will work on jsQR.
          </p>
          <p>
            There is no encryption. Anyone who can see the screen can capture the file. Treat it
            like holding up a document.
          </p>
        </div>
        <div className="mt-10 flex flex-wrap gap-3">
          <Button asChild>
            <Link to="/">Run the demo</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/send">Send</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
