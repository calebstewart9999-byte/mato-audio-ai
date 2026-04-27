"use client";

import { useState } from "react";

interface EpisodeFormProps {
  onEpisodeCreated: (episodeId: string) => void;
  disabled?: boolean;
}

const TOPIC_SUGGESTIONS = [
  "The future of remote work",
  "Why we dream at night",
  "The rise of AI in everyday life",
  "Hidden history of coffee",
  "Space tourism: hype or reality?",
];

export function EpisodeForm({ onEpisodeCreated, disabled }: EpisodeFormProps) {
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim() || loading) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/episodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create episode");
      }

      const episode = await res.json();
      onEpisodeCreated(episode.id);
      setTopic("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Enter a podcast topic..."
          disabled={loading || disabled}
          className="flex-1 bg-[var(--card)] border border-[var(--card-border)] rounded-lg px-4 py-3 text-sm placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!topic.trim() || loading || disabled}
          className="px-6 py-3 bg-[var(--accent)] hover:bg-[var(--accent-light)] text-white text-sm font-medium rounded-lg transition-all disabled:opacity-50 disabled:hover:bg-[var(--accent)] shrink-0"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
              Creating...
            </span>
          ) : (
            "Generate Episode"
          )}
        </button>
      </form>

      {error && (
        <p className="text-sm text-[var(--error)]">{error}</p>
      )}

      <div className="flex flex-wrap gap-2">
        {TOPIC_SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            onClick={() => setTopic(suggestion)}
            disabled={loading || disabled}
            className="text-xs px-3 py-1.5 rounded-full bg-[var(--card-border)]/50 hover:bg-[var(--card-border)] text-[var(--muted)] hover:text-[var(--foreground)] transition-all disabled:opacity-50"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}
