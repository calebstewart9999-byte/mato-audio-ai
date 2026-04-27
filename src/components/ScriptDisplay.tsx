"use client";

import { useState } from "react";
import { EpisodeScript, ScriptLine } from "@/lib/types";

interface ScriptDisplayProps {
  script: EpisodeScript;
  episodeId: string;
  editable?: boolean;
  currentLineIndex?: number;
  onScriptUpdate?: (script: EpisodeScript) => void;
}

export function ScriptDisplay({
  script,
  episodeId,
  editable = false,
  currentLineIndex = -1,
  onScriptUpdate,
}: ScriptDisplayProps) {
  const [editing, setEditing] = useState(false);
  const [editedScript, setEditedScript] = useState<EpisodeScript>(script);
  const [saving, setSaving] = useState(false);

  const handleLineEdit = (index: number, newText: string) => {
    const updated = {
      ...editedScript,
      exchanges: editedScript.exchanges.map((line, i) =>
        i === index ? { ...line, text: newText } : line
      ),
    };
    setEditedScript(updated);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/episodes/${episodeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script: editedScript }),
      });
      if (res.ok) {
        onScriptUpdate?.(editedScript);
        setEditing(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const displayScript = editing ? editedScript : script;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-[var(--muted)]">
          {displayScript.title}
        </h3>
        {editable && (
          <div className="flex gap-2">
            {editing ? (
              <>
                <button
                  onClick={() => {
                    setEditedScript(script);
                    setEditing(false);
                  }}
                  className="text-xs px-3 py-1 rounded-md bg-[var(--card-border)] hover:bg-[var(--muted)]/30 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="text-xs px-3 py-1 rounded-md bg-[var(--accent)] hover:bg-[var(--accent-light)] transition-colors disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditing(true)}
                className="text-xs px-3 py-1 rounded-md bg-[var(--card-border)] hover:bg-[var(--muted)]/30 transition-colors"
              >
                Edit Script
              </button>
            )}
          </div>
        )}
      </div>

      <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
        {displayScript.exchanges.map((line: ScriptLine, index: number) => {
          const isHostA = line.host === "A";
          const isActive = currentLineIndex === index;

          return (
            <div
              key={index}
              className={`flex gap-3 p-3 rounded-lg transition-all ${
                isActive
                  ? "bg-[var(--accent)]/15 ring-1 ring-[var(--accent)]/40"
                  : "bg-[var(--background)]/50"
              }`}
            >
              <div
                className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  isHostA
                    ? "bg-blue-500/20 text-blue-400"
                    : "bg-emerald-500/20 text-emerald-400"
                }`}
              >
                {line.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <span
                  className={`text-xs font-medium ${
                    isHostA ? "text-blue-400" : "text-emerald-400"
                  }`}
                >
                  {line.name}
                </span>
                {editing ? (
                  <textarea
                    value={line.text}
                    onChange={(e) => handleLineEdit(index, e.target.value)}
                    className="mt-1 w-full bg-[var(--background)] border border-[var(--card-border)] rounded p-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                    rows={2}
                  />
                ) : (
                  <p className="text-sm mt-0.5 leading-relaxed">{line.text}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
