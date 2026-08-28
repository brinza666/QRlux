import { useEffect, useState } from "react";
import { AppReceive } from "@/components/app-receive";
import { AppSend } from "@/components/app-send";
import { luxModeFromLocation } from "@/lib/lux/android-bridge";

type Mode = "send" | "receive" | "home";

export function App() {
  const [mode, setMode] = useState<Mode | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = (params.get("mode") || "").toLowerCase();
    if (q === "receive" || q === "send") {
      setMode(q);
      return;
    }
    fetch("./mode.json")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j: { mode?: string }) => setMode(j.mode === "receive" ? "receive" : "send"))
      .catch(() => {
        const fallback = luxModeFromLocation();
        setMode(q === "home" ? "home" : fallback === "send" && !params.get("mode") ? "home" : fallback);
      });
  }, []);

  if (!mode) return <div className="min-h-dvh bg-bg" />;
  if (mode === "home") {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 bg-bg px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))] text-fg">
        <p className="font-mono text-[0.65rem] tracking-[0.18em] text-subtle uppercase">LUX</p>
        <h1 className="text-3xl font-medium tracking-tight">Files, as light.</h1>
        <p className="text-sm leading-relaxed text-muted">
          Open Send on the computer. Open Receive on this phone. Or download the Android
          installers and install them later.
        </p>
        <a
          className="rounded-xl bg-accent px-4 py-3 text-center text-sm font-medium text-accent-fg"
          href="./?mode=receive"
        >
          Open Receive
        </a>
        <a
          className="rounded-xl border border-border bg-surface px-4 py-3 text-center text-sm"
          href="./?mode=send"
        >
          Open Send
        </a>
        <a
          className="rounded-xl border border-border bg-surface px-4 py-3 text-center text-sm"
          href="./releases/lux-receive.apk"
          download
        >
          Download Receive APK
        </a>
        <a
          className="rounded-xl border border-border bg-surface px-4 py-3 text-center text-sm"
          href="./releases/lux-send.apk"
          download
        >
          Download Send APK
        </a>
      </div>
    );
  }
  return mode === "receive" ? <AppReceive /> : <AppSend />;
}
