import { Download } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { CompleteResult } from "@/lib/lux/codec";
import { formatBytes, formatRate } from "@/lib/utils";

export function CompleteCard({
  result,
  onReplay,
}: {
  result: CompleteResult;
  onReplay?: () => void;
}) {
  const url = useMemo(() => URL.createObjectURL(result.blob), [result.blob]);
  const [text, setText] = useState<string | null>(null);
  const mime = result.header.mime;
  const isImage = mime.startsWith("image/");
  const isVideo = mime.startsWith("video/");
  const isAudio = mime.startsWith("audio/");
  const isText = mime.startsWith("text/") || mime === "application/json";

  useEffect(() => {
    return () => URL.revokeObjectURL(url);
  }, [url]);

  useEffect(() => {
    if (!isText) return;
    result.blob.text().then(setText).catch(() => setText(null));
  }, [isText, result.blob]);

  const seconds = result.elapsedMs / 1000;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="border-b border-border px-4 py-3">
        <p className="font-mono text-sm text-ok">
          Transfer complete — {formatBytes(result.bytes.byteLength)} in {seconds.toFixed(1)}s (
          {formatRate(result.goodputKBs * 1024)})
        </p>
        <p className="mt-1 text-xs text-muted">{result.header.filename}</p>
      </div>
      <div className="bg-bg p-3">
        {isImage ? (
          <img
            src={url}
            alt={result.header.filename}
            className="mx-auto max-h-48 w-full rounded-md object-contain"
          />
        ) : null}
        {isVideo ? (
          <video src={url} controls autoPlay className="mx-auto max-h-72 w-full rounded-md" />
        ) : null}
        {isAudio ? <audio src={url} controls autoPlay className="w-full" /> : null}
        {isText && text !== null ? (
          <pre className="max-h-72 overflow-auto rounded-md bg-surface-2 p-4 font-mono text-xs leading-relaxed text-fg">
            {text}
          </pre>
        ) : null}
        {!isImage && !isVideo && !isAudio && !isText ? (
          <p className="px-2 py-6 text-center text-sm text-muted">
            Binary file reconstructed. Download to save it.
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2 px-4 py-3">
        <Button asChild size="sm">
          <a href={url} download={result.header.filename}>
            <Download className="size-3.5" />
            Download
          </a>
        </Button>
        {onReplay ? (
          <Button variant="outline" size="sm" onClick={onReplay}>
            Run again
          </Button>
        ) : null}
      </div>
    </div>
  );
}
