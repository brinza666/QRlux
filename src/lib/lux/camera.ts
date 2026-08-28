let active: MediaStream | null = null;
let owners = 0;

export async function acquireCamera(): Promise<MediaStream> {
  if (active && active.getTracks().some((t) => t.readyState === "live")) {
    owners += 1;
    return active;
  }
  stopCamera();
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      facingMode: { ideal: "environment" },
      width: { ideal: 1920 },
      height: { ideal: 1080 },
    },
  });
  active = stream;
  owners = 1;
  return stream;
}

export function releaseCamera(): void {
  owners = Math.max(0, owners - 1);
  if (owners === 0) stopCamera();
}

function stopCamera(): void {
  active?.getTracks().forEach((t) => t.stop());
  active = null;
  owners = 0;
}
