"use client";

import { type RefObject, useCallback, useEffect, useRef, useState } from "react";

export interface WhatsNewVideoPlayerApi {
  currentTime: number;
  duration: number;
  isLoading: boolean;
  isPlaying: boolean;
  seek: (value: number) => void;
  toggle: () => void;
  videoRef: RefObject<HTMLVideoElement | null>;
  /** Wired by the surface — the controls only read the state above. */
  setCurrentTime: (value: number) => void;
  setDuration: (value: number) => void;
  setIsLoading: (value: boolean) => void;
  setIsPlaying: (value: boolean) => void;
}

/**
 * Playback state for one demo, kept apart from its markup because the two
 * halves of the player live in different slots of the media viewer: the picture
 * is the viewer's hero, the controls its toolbar.
 *
 * Space toggles playback, as it would in any player. The viewer already owns
 * Escape and the arrow keys, so nothing overlaps — but the shortcut is
 * window-wide, so this hook must only be mounted while the viewer is on screen.
 */
export const useWhatsNewVideoPlayer = (): WhatsNewVideoPlayerApi => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const toggle = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    // Autoplay may have been refused, leaving a paused video under a poster:
    // pressing play is the user gesture that lifts the refusal.
    if (video.paused) void video.play().catch(() => undefined);
    else video.pause();
  }, []);

  const seek = useCallback((value: number) => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(value)) return;
    video.currentTime = value;
    setCurrentTime(value);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== " " && event.key !== "Spacebar") return;
      // The play button and the scrubber answer to Space themselves.
      const target = event.target;
      if (target instanceof HTMLElement && target.closest("button, input, [role='slider']")) {
        return;
      }
      event.preventDefault();
      toggle();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggle]);

  return {
    currentTime,
    duration,
    isLoading,
    isPlaying,
    seek,
    setCurrentTime,
    setDuration,
    setIsLoading,
    setIsPlaying,
    toggle,
    videoRef,
  };
};
