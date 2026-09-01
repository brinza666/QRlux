export const PUBLIC_ORIGIN = "https://brinza666.github.io/QRlux";
export const GITHUB_REPO = "https://github.com/brinza666/QRlux";
export const GITHUB_RELEASES = `${GITHUB_REPO}/releases`;
export const HANDSHAKE_URL = `${PUBLIC_ORIGIN}/r`;
export const RECEIVE_WEB_URL = `${PUBLIC_ORIGIN}/r`;
export const SEND_WEB_URL = `${PUBLIC_ORIGIN}/s`;
export const FPS_MIN = 8;
export const FPS_MAX = 36;
export const FPS_DEFAULT = 16;

export function releaseUrl(file: string): string {
  const name = file.replace(/^\/+/, "");
  if (typeof window !== "undefined" && /github\.io$/i.test(window.location.hostname)) {
    return `${PUBLIC_ORIGIN}/releases/${name}`;
  }
  return `/releases/${name}`;
}
