"use client";

import { useMemo, useRef } from "react";

import { Loader2, Pause, Play } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button, MediaLightbox } from "@louez/ui";

import type { WhatsNewMedia } from "@/lib/whats-new.constants";

import { useWhatsNewVideoPlayer, type WhatsNewVideoPlayerApi } from "./use-whats-new-video-player";

/** The demos' own ratio, so the viewer frames them without bars or cropping. */
const MEDIA_ASPECT_RATIO = 1734 / 1080;

/** mm:ss for a (possibly fractional) number of seconds. */
const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
};

/** Below this, a pointer press on the video is a tap and not a drag. */
const TAP_DISTANCE = 8;

interface WhatsNewVideoSurfaceProps {
  /** Describes the demo for assistive tech — the announcement title. */
  label: string;
  media: WhatsNewMedia;
  player: WhatsNewVideoPlayerApi;
}

/**
 * The demo itself, filling the viewer's hero. It carries no native `controls`
 * on purpose: the browser's own bar swallows the pointer, and the viewer's
 * drag-to-dismiss along with it. Everything the reader can press lives in
 * `WhatsNewVideoControls`, so the whole picture stays draggable — a tap on it
 * pauses, a drag down dismisses.
 */
const WhatsNewVideoSurface = ({ label, media, player }: WhatsNewVideoSurfaceProps) => {
  const pointerRef = useRef<{ x: number; y: number } | null>(null);

  return (
    <video
      aria-label={label}
      autoPlay
      className="size-full cursor-grab object-contain active:cursor-grabbing"
      loop
      // The demos are silent screen recordings, and muting is what keeps the
      // autoplay from being refused by the browser's policy.
      muted
      onLoadedMetadata={(event) => {
        const value = event.currentTarget.duration;
        if (Number.isFinite(value) && value > 0) player.setDuration(value);
      }}
      onPause={() => player.setIsPlaying(false)}
      onPlay={() => player.setIsPlaying(true)}
      onPlaying={() => player.setIsLoading(false)}
      onClick={(event) => {
        const pointer = pointerRef.current;
        pointerRef.current = null;
        // A drag that snapped back also ends in a click on the video: only a
        // press that stayed put toggles playback.
        if (!pointer) return;
        if (Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) > TAP_DISTANCE) {
          return;
        }
        player.toggle();
      }}
      onPointerDown={(event) => {
        pointerRef.current = { x: event.clientX, y: event.clientY };
      }}
      onTimeUpdate={(event) => player.setCurrentTime(event.currentTarget.currentTime)}
      onWaiting={() => player.setIsLoading(true)}
      playsInline
      poster={media.posterSrc}
      preload="auto"
      ref={player.videoRef}
      src={media.src}
    />
  );
};

/**
 * Play / pause, scrubber and elapsed time, shaped like the viewer's other
 * toolbars. The viewer marks its toolbar as no-drag, so pressing these never
 * arms a swipe.
 */
const WhatsNewVideoControls = ({ player }: { player: WhatsNewVideoPlayerApi }) => {
  const t = useTranslations("common");
  const { currentTime, duration, isLoading, isPlaying, seek, toggle } = player;
  const max = duration || 1;

  return (
    <div className="bg-background/72 supports-backdrop-filter:bg-background/60 flex w-[min(30rem,calc(100vw-2rem))] items-center gap-3 rounded-full border p-1.5 pr-3 shadow-sm backdrop-blur-md">
      <Button
        aria-label={isPlaying ? t("pause") : t("play")}
        className="rounded-full"
        onClick={toggle}
        size="icon"
        type="button"
      >
        {isLoading ? (
          <Loader2 className="size-4 animate-spin" data-slot="icon" />
        ) : isPlaying ? (
          <Pause className="size-4 fill-current" data-slot="icon" />
        ) : (
          <Play className="size-4 translate-x-px fill-current" data-slot="icon" />
        )}
      </Button>

      <input
        aria-label={t("seek")}
        // Native on purpose: a range input is the accessible, keyboard-driven
        // scrubber, and it is what the call recording player already uses.
        className="bg-muted accent-primary h-1.5 flex-1 cursor-pointer appearance-none rounded-full disabled:cursor-not-allowed disabled:opacity-50"
        disabled={duration === 0}
        max={max}
        min={0}
        onChange={(event) => seek(Number(event.target.value))}
        step={0.05}
        type="range"
        value={Math.min(currentTime, max)}
      />

      <span className="text-muted-foreground shrink-0 font-mono text-xs tabular-nums">
        {formatTime(currentTime)} / {formatTime(duration)}
      </span>
    </div>
  );
};

interface WhatsNewVideoViewerProps {
  /** Describes the demo for assistive tech — the announcement title. */
  label: string;
  media: WhatsNewMedia;
  /** Called once the closing animation landed, to unmount the viewer. */
  onClosed: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  /** The thumbnail the demo flies from and back to. */
  resolveSource: () => HTMLElement | null;
}

/**
 * A demo played full size, in the same viewer as product photos. Mounted only
 * while it is on screen — the player owns a window-level Space shortcut, which
 * must not follow the reader back down the changelog.
 */
export const WhatsNewVideoViewer = ({
  label,
  media,
  onClosed,
  onOpenChange,
  open,
  resolveSource,
}: WhatsNewVideoViewerProps) => {
  const t = useTranslations("common");
  const player = useWhatsNewVideoPlayer();
  const items = useMemo(() => [media], [media]);

  return (
    <MediaLightbox
      getAspectRatio={() => MEDIA_ASPECT_RATIO}
      initialIndex={0}
      items={items}
      labels={{ close: t("close"), dialog: label }}
      onClosed={onClosed}
      onOpenChange={onOpenChange}
      open={open}
      renderItem={({ item }) => <WhatsNewVideoSurface label={label} media={item} player={player} />}
      renderToolbar={() => <WhatsNewVideoControls player={player} />}
      resolveSource={resolveSource}
    />
  );
};
