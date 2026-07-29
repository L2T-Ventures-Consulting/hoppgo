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
 * Small still of an announcement's demo, sitting under the card's text. It is
 * deliberately inert: no controls, no link of its own. The card's stretched
 * title link covers it, so a click opens the announcement, where the video
 * plays at full size. Cards without media render nothing at all rather than a
 * placeholder — an empty box would push the actual changelog below the fold.
 */
export const WhatsNewEntryThumbnail = ({
  className,
  label,
  media,
}: WhatsNewEntryThumbnailProps) => (
  <div
    className={cn(
      "bg-muted relative aspect-video w-40 shrink-0 overflow-hidden rounded-md border sm:w-52",
      className,
    )}
  >
    {media.type === "video" ? (
      <video
        aria-label={label}
        className="size-full object-cover"
        muted
        playsInline
        poster={media.posterSrc}
        preload="metadata"
        src={media.src}
        tabIndex={-1}
      />
    ) : (
      <SharedImage
        alt={label}
        containerClassName="absolute inset-0 rounded-none"
        fill
        sizes="13rem"
        src={media.src}
      />
    )}

    {media.type === "video" && (
      <span
        aria-hidden="true"
        className="bg-background/85 text-foreground absolute inset-0 m-auto flex size-8 items-center justify-center rounded-full shadow-sm"
      >
        <Play className="ml-0.5 size-3.5 fill-current" />
      </span>
    )}
  </div>
);
