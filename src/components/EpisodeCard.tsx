"use client";

import { Episode, STATUS_LABELS, EpisodeStatus } from "@/lib/types";
import { PipelineStatus } from "./PipelineStatus";
import { ScriptDisplay } from "./ScriptDisplay";
import { AudioPlayer } from "./AudioPlayer";

interface EpisodeCardProps {
  episode: Episode;
  isActive: boolean;
  onSelect: (id: string) => void;
}

function StatusBadge({ status }: { status: EpisodeStatus }) {
  const colors: Record<string, string> = {
    pending: "bg-yellow-500/15 text-yellow-400",
    generating_script: "bg-blue-500/15 text-blue-400",
    script_ready: "bg-cyan-500/15 text-cyan-400",
    generating_audio: "bg-purple-500/15 text-purple-400",
    stitching: "bg-orange-500/15 text-orange-400",
    complete: "bg-green-500/15 text-green-400",
    failed: "bg-red-500/15 text-red-400",
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${colors[status] ?? colors.pending}`}
    >
      {status !== "complete" && status !== "failed" && (
        <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 animate-pulse" />
      )}
      {STATUS_LABELS[status]}
    </span>
  );
}

export function EpisodeCard({ episode, isActive, onSelect }: EpisodeCardProps) {
  const isGenerating = !["complete", "failed", "script_ready"].includes(
    episode.status
  );

  return (
    <div
      className={`rounded-xl border transition-all ${
        isActive
          ? "bg-[var(--card)] border-[var(--accent)]/40 shadow-lg shadow-[var(--accent)]/5"
          : "bg-[var(--card)]/60 border-[var(--card-border)] hover:border-[var(--card-border)]/80"
      }`}
    >
      <button
        onClick={() => onSelect(episode.id)}
        className="w-full text-left p-4 space-y-2"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="font-medium text-sm truncate">{episode.topic}</h3>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              {new Date(episode.created_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
              {episode.duration_seconds &&
                ` · ${Math.floor(episode.duration_seconds / 60)}:${(episode.duration_seconds % 60).toString().padStart(2, "0")}`}
            </p>
          </div>
          <StatusBadge status={episode.status} />
        </div>
      </button>

      {isActive && (
        <div className="px-4 pb-4 space-y-4 border-t border-[var(--card-border)] pt-4 animate-slide-up">
          {isGenerating && (
            <PipelineStatus
              status={episode.status}
              error={episode.error}
              metadata={episode.metadata as Record<string, unknown>}
            />
          )}

          {episode.status === "failed" && episode.error && (
            <div className="p-3 bg-[var(--error)]/10 border border-[var(--error)]/30 rounded-lg text-sm text-[var(--error)]">
              {episode.error}
            </div>
          )}

          {episode.script && (
            <ScriptDisplay
              script={episode.script}
              episodeId={episode.id}
              editable={episode.status === "script_ready"}
            />
          )}

          {episode.status === "complete" && episode.audio_url && (
            <AudioPlayer
              audioUrl={episode.audio_url}
              script={episode.script}
              durationSeconds={episode.duration_seconds}
            />
          )}
        </div>
      )}
    </div>
  );
}
