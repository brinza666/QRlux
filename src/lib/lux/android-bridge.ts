export type LuxAndroidBridge = {
  saveFile: (filename: string, mime: string, base64: string) => string;
  toast: (message: string) => void;
  getMode?: () => string;
};

export function getLuxAndroid(): LuxAndroidBridge | null {
  if (typeof window === "undefined") return null;
  const bridge = (window as unknown as { LuxAndroid?: LuxAndroidBridge }).LuxAndroid;
  return bridge ?? null;
}

export function resolveAppMode(): "send" | "receive" | "home" {
  if (typeof window === "undefined") return "home";
  const params = new URLSearchParams(window.location.search);
  const q = (params.get("mode") || "").toLowerCase();
  if (q === "receive" || q === "send" || q === "home") return q;
  const injected = getLuxAndroid()?.getMode?.()?.toLowerCase();
  if (injected === "receive" || injected === "send") return injected;
  const hash = window.location.hash.replace("#", "").toLowerCase();
  if (hash === "receive" || hash === "send") return hash;
  return "home";
}

export function luxModeFromLocation(): "send" | "receive" {
  const m = resolveAppMode();
  return m === "receive" ? "receive" : "send";
}
