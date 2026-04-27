"use client";

import { Episode } from "@/lib/types";
import { EpisodeCard } from "./EpisodeCard";

interface EpisodeListProps {
  episodes: Episode[];
  activeEpisodeId: string | null;
  onSelectEpisode: (id: string) => void;
}

export function EpisodeList({
  episodes,
  activeEpisodeId,
  onSelectEpisode,
}: EpisodeListProps) {
  if (episodes.length === 0) {
    return (
      <div className="text-center py-12 text-[var(--muted)]">
        <svg
          className="w-12 h-12 mx-auto mb-3 opacity-30"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z"
          />
        </svg>
        <p className="text-sm">No episodes yet</p>
        <p className="text-xs mt-1">Enter a topic above to generate your first episode</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-medium text-[var(--muted)] px-1">
        Episodes ({episodes.length})
      </h2>
      <div className="space-y-2">
        {episodes.map((episode) => (
          <EpisodeCard
            key={episode.id}
            episode={episode}
            isActive={activeEpisodeId === episode.id}
            onSelect={onSelectEpisode}
          />
        ))}
      </div>
    </div>
  );
}
