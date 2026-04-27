"use client";

import { EpisodeStatus, STATUS_LABELS, STATUS_ORDER } from "@/lib/types";

interface PipelineStatusProps {
  status: EpisodeStatus;
  error?: string | null;
  metadata?: Record<string, unknown>;
}

export function PipelineStatus({ status, error, metadata }: PipelineStatusProps) {
  const currentIndex = STATUS_ORDER.indexOf(status);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-[var(--muted)]">
        <span>Pipeline Status</span>
        {typeof metadata?.progress === "string" && (
          <span className="text-xs bg-[var(--card-border)] px-2 py-0.5 rounded-full">
            {metadata.progress}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1">
        {STATUS_ORDER.map((step, index) => {
          const isComplete = currentIndex > index;
          const isCurrent = status === step;
          const isFailed = status === "failed";

          let dotColor = "bg-[var(--card-border)]";
          if (isComplete) dotColor = "bg-[var(--success)]";
          else if (isCurrent && !isFailed) dotColor = "bg-[var(--accent)] animate-pulse-glow";
          else if (isFailed && isCurrent) dotColor = "bg-[var(--error)]";

          let lineColor = "bg-[var(--card-border)]";
          if (isComplete) lineColor = "bg-[var(--success)]";

          return (
            <div key={step} className="flex items-center gap-1 flex-1">
              <div className="flex flex-col items-center gap-1 min-w-0">
                <div className={`w-3 h-3 rounded-full shrink-0 ${dotColor}`} />
                <span
                  className={`text-[10px] leading-tight text-center truncate w-full ${
                    isCurrent
                      ? "text-[var(--foreground)] font-medium"
                      : "text-[var(--muted)]"
                  }`}
                >
                  {STATUS_LABELS[step]}
                </span>
              </div>
              {index < STATUS_ORDER.length - 1 && (
                <div className={`h-0.5 flex-1 rounded ${lineColor} mb-4`} />
              )}
            </div>
          );
        })}
      </div>

      {status === "failed" && error && (
        <div className="mt-2 p-3 bg-[var(--error)]/10 border border-[var(--error)]/30 rounded-lg text-sm text-[var(--error)]">
          {error}
        </div>
      )}
    </div>
  );
}
