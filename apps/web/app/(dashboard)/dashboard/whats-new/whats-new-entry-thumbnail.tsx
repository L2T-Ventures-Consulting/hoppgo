"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Play } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@louez/utils";

import { SharedImage } from "@/components/ui/shared-image";
import type { WhatsNewMedia } from "@/lib/whats-new.constants";

import { WhatsNewVideoViewer } from "./whats-new-video-player";

interface WhatsNewEntryThumbnailProps {
  className?: string;
  /** Describes the media for assistive tech — the announcement title. */
  label: string;
  media: WhatsNewMedia;
}

/**
 * An announcement's demo, playing beside the copy. Images stay inert — the
 * card's stretched title link covers them, so a click opens the announcement.
 * Videos take the click instead: the recordings are small next to the copy, so
 * the thumbnail is a button that lifts the demo into the media viewer, where it
 * plays full size with controls. It has to sit above the title link's stretch
 * overlay (`z-10`) to be reachable at all.
 *
 * Playback is tied to visibility. `preload="none"` keeps the changelog from
 * pulling every demo at once; a video only downloads when it scrolls into view,
 * and pauses when it leaves — or while the viewer is up, so the same recording
 * never runs twice. Readers who asked for reduced motion keep the poster, with
 * the play badge showing the still stands for a video.
 */
export const WhatsNewEntryThumbnail = ({
  className,
  label,
  media,
}: WhatsNewEntryThumbnailProps) => {
  const t = useTranslations("dashboard.whatsNew");
  const videoRef = useRef<HTMLVideoElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  // `isViewerMounted` stays true until the closing animation flew the video
  // back onto its thumbnail; `isViewerOpen` drives that animation.
  const [isViewerMounted, setIsViewerMounted] = useState(false);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && !isViewerMounted) {
          // Autoplay is refused while the tab is backgrounded, and on some
          // power-saving modes. Nothing to recover from: the poster stays.
          void video.play().catch(() => undefined);
        } else {
          video.pause();
        }
      },
      { threshold: 0.4 },
    );

    // Re-observing on `isViewerMounted` reports the current intersection right
    // away, which is what resumes the preview once the viewer is gone.
    observer.observe(video);
    return () => observer.disconnect();
  }, [isViewerMounted]);

  const resolveViewerSource = useCallback(() => frameRef.current, []);
  const isVideo = media.type === "video";

  const frame = (
    <div
      className={cn(
        // Same ratio as the demos themselves, so nothing is ever cropped.
        "bg-muted relative aspect-1734/1080 w-full shrink-0 overflow-hidden rounded-lg border",
        // Videos get their sizing from the button wrapping this frame.
        !isVideo && className,
      )}
      ref={frameRef}
    >
      {media.type === "video" ? (
        <video
          aria-hidden="true"
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

  if (!isVideo) return frame;

  return (
    <>
      <button
        aria-label={t("watchDemo", { title: label })}
        className={cn(
          "focus-visible:ring-ring relative z-10 block shrink-0 cursor-zoom-in rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
          className,
        )}
        onClick={() => {
          setIsViewerMounted(true);
          setIsViewerOpen(true);
        }}
        type="button"
      >
        {frame}
      </button>

      {isViewerMounted && (
        <WhatsNewVideoViewer
          label={label}
          media={media}
          onClosed={() => setIsViewerMounted(false)}
          onOpenChange={(next) => {
            if (!next) setIsViewerOpen(false);
          }}
          open={isViewerOpen}
          resolveSource={resolveViewerSource}
        />
      )}
    </>
  );
};
