import { Volume2, VolumeX } from "lucide-react";
import { useState } from "react";
import { isFeedbackOn, playCue, setFeedbackOn } from "@/lib/lux/feedback";
import { cn } from "@/lib/utils";

export function FeedbackToggle({ className }: { className?: string }) {
  const [on, setOn] = useState(isFeedbackOn);

  function toggle() {
    const next = !on;
    setFeedbackOn(next);
    setOn(next);
    if (next) playCue("start");
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        "inline-flex size-11 items-center justify-center rounded-md text-muted transition-colors duration-150 hover:bg-surface-2 hover:text-fg",
        className,
      )}
      aria-pressed={on}
      aria-label={on ? "Mute sounds and haptics" : "Enable sounds and haptics"}
      title={on ? "Sound on" : "Sound off"}
    >
      {on ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
    </button>
  );
}
