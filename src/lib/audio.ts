/**
 * Audio utilities for concatenating WAV/PCM segments into a single WAV file.
 *
 * Gemini TTS returns audio as PCM (linear16) data. We need to:
 * 1. Collect all audio segments
 * 2. Add small silence gaps between segments for natural pacing
 * 3. Wrap in a WAV container
 */

const SAMPLE_RATE = 24000;
const BITS_PER_SAMPLE = 16;
const NUM_CHANNELS = 1;
const SILENCE_DURATION_MS = 500;

function createSilenceBuffer(durationMs: number): Buffer {
  const numSamples = Math.floor(
    (SAMPLE_RATE * durationMs) / 1000
  );
  const bytesPerSample = BITS_PER_SAMPLE / 8;
  return Buffer.alloc(numSamples * bytesPerSample * NUM_CHANNELS);
}

function createWavHeader(dataSize: number): Buffer {
  const header = Buffer.alloc(44);
  const byteRate = SAMPLE_RATE * NUM_CHANNELS * (BITS_PER_SAMPLE / 8);
  const blockAlign = NUM_CHANNELS * (BITS_PER_SAMPLE / 8);

  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16); // fmt chunk size
  header.writeUInt16LE(1, 20); // PCM format
  header.writeUInt16LE(NUM_CHANNELS, 22);
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(BITS_PER_SAMPLE, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);

  return header;
}

/**
 * Strip WAV header from audio data if present, returning raw PCM.
 */
function stripWavHeader(audioData: Buffer): Buffer {
  if (
    audioData.length > 44 &&
    audioData.toString("ascii", 0, 4) === "RIFF" &&
    audioData.toString("ascii", 8, 12) === "WAVE"
  ) {
    let offset = 12;
    while (offset < audioData.length - 8) {
      const chunkId = audioData.toString("ascii", offset, offset + 4);
      const chunkSize = audioData.readUInt32LE(offset + 4);
      if (chunkId === "data") {
        return audioData.subarray(offset + 8, offset + 8 + chunkSize);
      }
      offset += 8 + chunkSize;
    }
  }
  return audioData;
}

/**
 * Concatenate multiple audio segments (PCM or WAV) into a single WAV file.
 * Inserts small silence gaps between segments for natural pacing.
 */
export function concatenateAudioSegments(segments: Buffer[]): Buffer {
  if (segments.length === 0) {
    throw new Error("No audio segments to concatenate");
  }

  const silenceBuffer = createSilenceBuffer(SILENCE_DURATION_MS);
  const pcmSegments: Buffer[] = [];

  for (let i = 0; i < segments.length; i++) {
    pcmSegments.push(stripWavHeader(segments[i]));
    if (i < segments.length - 1) {
      pcmSegments.push(silenceBuffer);
    }
  }

  const totalPcmSize = pcmSegments.reduce((sum, s) => sum + s.length, 0);
  const header = createWavHeader(totalPcmSize);

  return Buffer.concat([header, ...pcmSegments]);
}

export function calculateDurationSeconds(wavBuffer: Buffer): number {
  const dataSize = wavBuffer.length - 44;
  const bytesPerSecond =
    SAMPLE_RATE * NUM_CHANNELS * (BITS_PER_SAMPLE / 8);
  return Math.round(dataSize / bytesPerSecond);
}
