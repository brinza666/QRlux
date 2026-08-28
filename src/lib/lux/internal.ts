const KEY = "lux.internal";

export function isInternal(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.localStorage.getItem(KEY) === "1") return true;
  } catch {
    /* ignore */
  }
  return new URLSearchParams(window.location.search).get("internal") === "1";
}

export function setInternal(on: boolean): void {
  try {
    if (on) window.localStorage.setItem(KEY, "1");
    else window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
