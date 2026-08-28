import { useEffect, useState } from "react";
import { AppReceive } from "@/components/app-receive";
import { AppSend } from "@/components/app-send";
import { luxModeFromLocation } from "@/lib/lux/android-bridge";

export function App() {
  const [mode, setMode] = useState<"send" | "receive" | null>(null);

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
      .catch(() => setMode(luxModeFromLocation()));
  }, []);

  if (!mode) {
    return <div className="min-h-dvh bg-bg" />;
  }
  return mode === "receive" ? <AppReceive /> : <AppSend />;
}
