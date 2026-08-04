"use client";

import { cn } from "@louez/utils";

import { SharedImage } from "@/components/ui/shared-image";
import type { WhatsNewMedia } from "@/lib/whats-new.constants";

interface WhatsNewEntryMediaProps {
  /** Frame of the box: `border-b` inside a card, `rounded-xl border` standalone. */
  className?: string;
  /** Describes the media for assistive tech — the announcement title. */
  label: string;
  media: WhatsNewMedia;
}

/**
 * Illustration of an announcement. Videos are self-hosted `<video>` elements:
 * the CSP allows `media-src 'self'` but not third-party frames.
 *
 * The box carries the demos' own 1734:1080 ratio rather than a 16:9 one. Forcing
 * 16:9 would either crop the recordings — their zooms run edge to edge, so the
 * top and bottom of the UI would go — or frame them in filler bars. The ratio is
 * declared here rather than measured so the space is reserved before the video's
 * metadata loads; recording at another ratio means updating this class.
 */
export const WhatsNewEntryMedia = ({ className, label, media }: WhatsNewEntryMediaProps) => (
  <div className={cn("bg-muted relative aspect-1734/1080 w-full overflow-hidden", className)}>
    {media.type === "video" ? (
      <video
        aria-label={label}
        className="absolute inset-0 size-full object-contain"
        controls
        playsInline
        poster={media.posterSrc}
        preload="metadata"
        src={media.src}
      />
    ) : (
      <SharedImage
        alt={label}
        containerClassName="absolute inset-0 rounded-none"
        fill
        sizes="(min-width: 640px) 56rem, 100vw"
        src={media.src}
      />
    )}
  </div>
);
