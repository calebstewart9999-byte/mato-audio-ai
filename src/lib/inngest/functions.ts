import { inngest } from "./client";
import { createServiceClient } from "../supabase/server";
import { generateScript } from "../llm";
import { textToSpeech } from "../tts";
import { concatenateAudioSegments, calculateDurationSeconds } from "../audio";
import { EpisodeScript, ScriptLine } from "../types";

const EPISODE_AUDIO_BUCKET = "episode-audio";

async function updateEpisodeStatus(
  episodeId: string,
  status: string,
  extra: Record<string, unknown> = {}
) {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("episodes")
    .update({ status, updated_at: new Date().toISOString(), ...extra })
    .eq("id", episodeId);

  if (error) {
    console.error(`Failed to update episode ${episodeId} status:`, error);
    throw error;
  }
}

async function ensureEpisodeAudioBucket() {
  const supabase = createServiceClient();
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();

  if (listError) {
    throw new Error(`Failed to list storage buckets: ${listError.message}`);
  }

  const exists = buckets?.some((bucket) => bucket.name === EPISODE_AUDIO_BUCKET);
  if (exists) return;

  const { error: createError } = await supabase.storage.createBucket(
    EPISODE_AUDIO_BUCKET,
    {
      public: true,
    }
  );

  if (createError) {
    throw new Error(
      `Failed to create storage bucket "${EPISODE_AUDIO_BUCKET}": ${createError.message}`
    );
  }
}

export const generateEpisode = inngest.createFunction(
  {
    id: "generate-episode",
    retries: 2,
    onFailure: async ({ event }) => {
      const episodeId = event.data.event.data.episodeId as string;
      const errorMsg =
        event.data.error?.message ?? "Unknown pipeline failure";
      await updateEpisodeStatus(episodeId, "failed", { error: errorMsg });
    },
  },
  { event: "episode/generate.requested" },
  async ({ event, step }) => {
    const episodeId = event.data.episodeId as string;
    const topic = event.data.topic as string;

    // --- Step 1: Generate the dialogue script ---
    const script = await step.run("generate-script", async () => {
      await updateEpisodeStatus(episodeId, "generating_script");

      const generatedScript = await generateScript(topic);

      await updateEpisodeStatus(episodeId, "script_ready", {
        script: generatedScript,
      });

      return generatedScript;
    });

    // --- Step 2: Generate TTS audio for each line ---
    const segmentUrls = await step.run("generate-tts-segments", async () => {
      await updateEpisodeStatus(episodeId, "generating_audio");

      const supabase = createServiceClient();
      await ensureEpisodeAudioBucket();
      const urls: string[] = [];

      for (let i = 0; i < (script as EpisodeScript).exchanges.length; i++) {
        const line = (script as EpisodeScript).exchanges[i] as ScriptLine;

        const maxRetries = 3;
        let lastError: Error | null = null;

        for (let attempt = 0; attempt < maxRetries; attempt++) {
          try {
            const { audioData, mimeType } = await textToSpeech(
              line.text,
              line.host
            );

            const ext = mimeType.includes("wav") ? "wav" : "pcm";
            const filePath = `episodes/${episodeId}/segment_${i}.${ext}`;

            const { error: uploadError } = await supabase.storage
              .from(EPISODE_AUDIO_BUCKET)
              .upload(filePath, audioData, {
                contentType: mimeType,
                upsert: true,
              });

            if (uploadError) throw uploadError;

            const {
              data: { publicUrl },
            } = supabase.storage.from(EPISODE_AUDIO_BUCKET).getPublicUrl(filePath);

            urls.push(publicUrl);
            lastError = null;
            break;
          } catch (err) {
            lastError = err as Error;
            console.warn(
              `TTS attempt ${attempt + 1}/${maxRetries} failed for segment ${i}:`,
              lastError.message
            );
            if (attempt < maxRetries - 1) {
              await new Promise((r) =>
                setTimeout(r, 1000 * Math.pow(2, attempt))
              );
            }
          }
        }

        if (lastError) {
          throw new Error(
            `TTS failed for segment ${i} after ${maxRetries} attempts: ${lastError.message}`
          );
        }

        await updateEpisodeStatus(episodeId, "generating_audio", {
          metadata: {
            progress: `${i + 1}/${(script as EpisodeScript).exchanges.length} segments`,
          },
        });
      }

      return urls;
    });

    // --- Step 3: Concatenate audio segments into final episode ---
    const audioUrl = await step.run("stitch-audio", async () => {
      await updateEpisodeStatus(episodeId, "stitching");

      const supabase = createServiceClient();

      // Download all segments
      const segments: Buffer[] = [];
      for (let i = 0; i < (segmentUrls as string[]).length; i++) {
        const ext = "pcm";
        const filePath = `episodes/${episodeId}/segment_${i}.${ext}`;
        const { data, error } = await supabase.storage
          .from(EPISODE_AUDIO_BUCKET)
          .download(filePath);

        if (error || !data) {
          // Try .wav extension as fallback
          const wavPath = `episodes/${episodeId}/segment_${i}.wav`;
          const wavResult = await supabase.storage
            .from(EPISODE_AUDIO_BUCKET)
            .download(wavPath);
          if (wavResult.error || !wavResult.data) {
            throw new Error(`Failed to download segment ${i}: ${error?.message}`);
          }
          segments.push(Buffer.from(await wavResult.data.arrayBuffer()));
          continue;
        }
        segments.push(Buffer.from(await data.arrayBuffer()));
      }

      const finalAudio = concatenateAudioSegments(segments);
      const duration = calculateDurationSeconds(finalAudio);

      const finalPath = `episodes/${episodeId}/episode.wav`;
      const { error: uploadError } = await supabase.storage
        .from(EPISODE_AUDIO_BUCKET)
        .upload(finalPath, finalAudio, {
          contentType: "audio/wav",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from(EPISODE_AUDIO_BUCKET).getPublicUrl(finalPath);

      await updateEpisodeStatus(episodeId, "complete", {
        audio_url: publicUrl,
        segment_urls: segmentUrls,
        duration_seconds: duration,
      });

      return publicUrl;
    });

    return { episodeId, audioUrl };
  }
);
