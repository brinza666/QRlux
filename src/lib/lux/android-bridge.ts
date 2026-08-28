export type LuxAndroidBridge = {
  saveFile: (filename: string, mime: string, base64: string) => string;
  toast: (message: string) => void;
};

export function getLuxAndroid(): LuxAndroidBridge | null {
  if (typeof window === "undefined") return null;
  const bridge = (window as unknown as { LuxAndroid?: LuxAndroidBridge }).LuxAndroid;
  return bridge ?? null;
}

export function luxModeFromLocation(): "send" | "receive" {
  if (typeof window === "undefined") return "send";
  const params = new URLSearchParams(window.location.search);
  const q = (params.get("mode") || "").toLowerCase();
  if (q === "receive") return "receive";
  if (q === "send") return "send";
  const hash = window.location.hash.replace("#", "").toLowerCase();
  if (hash === "receive") return "receive";
  return "send";
}
