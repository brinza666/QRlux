import { useEffect, useState } from "react";
import { AppReceive } from "@/components/app-receive";
import { AppSend } from "@/components/app-send";
import { getLuxAndroid, resolveAppMode } from "@/lib/lux/android-bridge";

type Mode = "send" | "receive" | "home";

export function App() {
  const [mode, setMode] = useState<Mode>(() => resolveAppMode());
  const [bootError, setBootError] = useState<string | null>(null);

  useEffect(() => {
    const native = getLuxAndroid()?.getMode?.();
    if (native === "receive" || native === "send") {
      setMode(native);
      return;
    }
    const fromUrl = resolveAppMode();
    if (fromUrl !== "home") {
      setMode(fromUrl);
      return;
    }
    let done = false;
    const t = window.setTimeout(() => {
      if (!done) setMode("home");
    }, 250);
    fetch("./mode.json")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j: { mode?: string }) => {
        done = true;
        window.clearTimeout(t);
        setMode(j.mode === "receive" ? "receive" : j.mode === "send" ? "send" : "home");
      })
      .catch(() => {
        done = true;
        window.clearTimeout(t);
        setMode(resolveAppMode());
      });
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    const onErr = (ev: ErrorEvent) => setBootError(ev.message || "Script error");
    window.addEventListener("error", onErr);
    return () => window.removeEventListener("error", onErr);
  }, []);

  if (bootError) {
    return (
      <div className="min-h-dvh bg-bg px-5 py-8 text-fg">
        <p className="font-mono text-xs tracking-[0.18em] text-subtle uppercase">LUX</p>
        <p className="mt-4 text-sm">{bootError}</p>
      </div>
    );
  }

  if (!mode) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg text-muted">
        Starting LUX…
      </div>
    );
  }

  if (mode === "home") {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 bg-bg px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))] text-fg">
        <p className="font-mono text-xs tracking-[0.18em] text-subtle uppercase">LUX</p>
        <h1 className="text-3xl font-medium tracking-tight">Files, as light.</h1>
        <p className="text-sm leading-relaxed text-muted">
          On a computer open Send — it starts beaming the Receive installer. On this phone open
          Receive, or install the APK.
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
      </div>
    );
  }

  return mode === "receive" ? <AppReceive /> : <AppSend />;
}
