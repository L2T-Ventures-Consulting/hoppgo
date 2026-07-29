"use client";

import { useEffect, useRef, useState } from "react";

import { Play } from "lucide-react";

import { cn } from "@louez/utils";

import { SharedImage } from "@/components/ui/shared-image";
import type { WhatsNewMedia } from "@/lib/whats-new.constants";

interface WhatsNewEntryThumbnailProps {
  className?: string;
  /** Describes the media for assistive tech — the announcement title. */
  label: string;
  media: WhatsNewMedia;
}

/**
 * An announcement's demo, playing beside the copy. It is deliberately inert —
 * no controls, no link of its own: the card's stretched title link covers it,
 * so a click opens the announcement where the video plays at full size with
 * controls. Cards without media render nothing rather than a placeholder.
 *
 * Playback is tied to visibility. `preload="none"` keeps the changelog from
 * pulling every demo at once; a video only downloads when it scrolls into view,
 * and pauses when it leaves. Readers who asked for reduced motion keep the
 * poster, with the play badge showing the still stands for a video.
 */
export const WhatsNewEntryThumbnail = ({
  className,
  label,
  media,
}: WhatsNewEntryThumbnailProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          // Autoplay is refused while the tab is backgrounded, and on some
          // power-saving modes. Nothing to recover from: the poster stays.
          void video.play().catch(() => undefined);
        } else {
          video.pause();
        }
      },
      { threshold: 0.4 },
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className={cn(
        // Same ratio as the demos themselves, so nothing is ever cropped.
        "bg-muted relative aspect-1734/1080 shrink-0 overflow-hidden rounded-lg border",
        className,
      )}
    >
      {media.type === "video" ? (
        <video
          aria-label={label}
          className="size-full object-cover"
          loop
          muted
          onPause={() => setIsPlaying(false)}
          onPlaying={() => setIsPlaying(true)}
          playsInline
          poster={media.posterSrc}
          preload="none"
          ref={videoRef}
          src={media.src}
          tabIndex={-1}
        />
      ) : (
        <SharedImage
          alt={label}
          containerClassName="absolute inset-0 rounded-none"
          fill
          sizes="(min-width: 1024px) 20rem, (min-width: 640px) 16rem, 100vw"
          src={media.src}
        />
      )}

      {media.type === "video" && !isPlaying && (
        <span
          aria-hidden="true"
          className="bg-background/85 text-foreground absolute inset-0 m-auto flex size-9 items-center justify-center rounded-full shadow-sm"
        >
          <Play className="ml-0.5 size-4 fill-current" />
        </span>
      )}
    </div>
  );
};
