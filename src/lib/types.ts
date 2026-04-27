export type EpisodeStatus =
  | "pending"
  | "generating_script"
  | "script_ready"
  | "generating_audio"
  | "stitching"
  | "complete"
  | "failed";

export interface ScriptLine {
  host: "A" | "B";
  name: string;
  text: string;
}

export interface EpisodeScript {
  title: string;
  hosts: { A: string; B: string };
  exchanges: ScriptLine[];
}

export interface Episode {
  id: string;
  topic: string;
  status: EpisodeStatus;
  script: EpisodeScript | null;
  audio_url: string | null;
  segment_urls: string[];
  duration_seconds: number | null;
  error: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export const STATUS_LABELS: Record<EpisodeStatus, string> = {
  pending: "Queued",
  generating_script: "Writing Script...",
  script_ready: "Script Ready",
  generating_audio: "Generating Audio...",
  stitching: "Stitching Audio...",
  complete: "Complete",
  failed: "Failed",
};

export const STATUS_ORDER: EpisodeStatus[] = [
  "pending",
  "generating_script",
  "script_ready",
  "generating_audio",
  "stitching",
  "complete",
];
