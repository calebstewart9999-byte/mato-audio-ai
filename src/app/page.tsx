"use client";

import { useState } from "react";
import { EpisodeForm } from "@/components/EpisodeForm";
import { EpisodeList } from "@/components/EpisodeList";
import { useEpisodes } from "@/hooks/useEpisodes";

export default function Home() {
  const { episodes, loading } = useEpisodes();
  const [activeEpisodeId, setActiveEpisodeId] = useState<string | null>(null);

  const handleEpisodeCreated = (episodeId: string) => {
    setActiveEpisodeId(episodeId);
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--card-border)] bg-[var(--card)]/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" x2="12" y1="19" y2="22" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-semibold">Mato Podcast Generator</h1>
            <p className="text-xs text-[var(--muted)]">
              AI-powered podcast episodes in minutes
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        <section>
          <EpisodeForm onEpisodeCreated={handleEpisodeCreated} />
        </section>

        <section>
          {loading ? (
            <div className="flex justify-center py-12">
              <svg
                className="animate-spin w-6 h-6 text-[var(--muted)]"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="3"
                  className="opacity-25"
                />
                <path
                  d="M4 12a8 8 0 018-8"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          ) : (
            <EpisodeList
              episodes={episodes}
              activeEpisodeId={activeEpisodeId}
              onSelectEpisode={(id) =>
                setActiveEpisodeId(id === activeEpisodeId ? null : id)
              }
            />
          )}
        </section>
      </main>
    </div>
  );
}
