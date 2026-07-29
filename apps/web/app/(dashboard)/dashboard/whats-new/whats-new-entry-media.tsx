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
 * Illustration at the top of a changelog entry. Videos are self-hosted `<video>`
 * elements: the CSP allows `media-src 'self'` but not third-party frames.
 */
export const WhatsNewEntryMedia = ({ className, label, media }: WhatsNewEntryMediaProps) => (
  <div className={cn("bg-muted relative aspect-video w-full overflow-hidden", className)}>
    {media.type === "video" ? (
      <video
        aria-label={label}
        className="absolute inset-0 size-full object-cover"
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
