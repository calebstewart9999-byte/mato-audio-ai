"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { EpisodeScript } from "@/lib/types";

interface AudioPlayerProps {
  audioUrl: string;
  script?: EpisodeScript | null;
  durationSeconds?: number | null;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function AudioPlayer({ audioUrl, script, durationSeconds }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(durationSeconds ?? 0);
  const [currentLineIndex, setCurrentLineIndex] = useState(-1);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentLineIndex(-1);
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  const estimateCurrentLine = useCallback(() => {
    if (!script || !duration || duration === 0) return -1;
    const lineCount = script.exchanges.length;
    const timePerLine = duration / lineCount;
    const index = Math.floor(currentTime / timePerLine);
    return Math.min(index, lineCount - 1);
  }, [script, duration, currentTime]);

  useEffect(() => {
    if (isPlaying && script) {
      setCurrentLineIndex(estimateCurrentLine());
    }
  }, [currentTime, isPlaying, script, estimateCurrentLine]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      await audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const time = parseFloat(e.target.value);
    audio.currentTime = time;
    setCurrentTime(time);
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const currentHost = script?.exchanges[currentLineIndex];

  return (
    <div className="space-y-3">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      {currentHost && isPlaying && (
        <div className="flex items-center gap-2 text-xs animate-slide-up">
          <div
            className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
              currentHost.host === "A"
                ? "bg-blue-500/20 text-blue-400"
                : "bg-emerald-500/20 text-emerald-400"
            }`}
          >
            {currentHost.name[0]}
          </div>
          <span className="text-[var(--muted)]">
            <span
              className={
                currentHost.host === "A" ? "text-blue-400" : "text-emerald-400"
              }
            >
              {currentHost.name}
            </span>{" "}
            is speaking
          </span>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={togglePlay}
          className="w-10 h-10 rounded-full bg-[var(--accent)] hover:bg-[var(--accent-light)] flex items-center justify-center transition-colors shrink-0"
        >
          {isPlaying ? (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <rect x="2" y="1" width="3.5" height="12" rx="1" />
              <rect x="8.5" y="1" width="3.5" height="12" rx="1" />
            </svg>
          ) : (
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="currentColor"
              className="ml-0.5"
            >
              <path d="M3 1.5v11l9-5.5z" />
            </svg>
          )}
        </button>

        <div className="flex-1 flex items-center gap-2">
          <span className="text-xs text-[var(--muted)] w-10 text-right tabular-nums">
            {formatTime(currentTime)}
          </span>
          <div className="relative flex-1 h-4 flex items-center">
            <div className="absolute inset-x-0 h-1 bg-[var(--card-border)] rounded-full">
              <div
                className="h-full bg-[var(--accent)] rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={currentTime}
              onChange={handleSeek}
              className="absolute inset-0 w-full opacity-0 cursor-pointer"
            />
          </div>
          <span className="text-xs text-[var(--muted)] w-10 tabular-nums">
            {formatTime(duration)}
          </span>
        </div>
      </div>
    </div>
  );
}

export { type AudioPlayerProps };
