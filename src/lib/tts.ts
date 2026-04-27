import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const VOICE_MAP = {
  A: "Kore",
  B: "Puck",
} as const;

export interface TTSResult {
  audioData: Buffer;
  mimeType: string;
}

/**
 * Convert text to speech using Gemini's TTS capabilities.
 * Uses different voices for host A and host B.
 */
export async function textToSpeech(
  text: string,
  host: "A" | "B"
): Promise<TTSResult> {
  const voiceName = VOICE_MAP[host];

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash-preview-tts",
    generationConfig: {
      responseModalities: ["audio"],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName,
          },
        },
      },
    } as never,
  });

  const result = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: [{ text: `TTS the following text: ${text}` }],
      },
    ],
  });

  const response = result.response;
  const parts = response.candidates?.[0]?.content?.parts;
  const audioPart = parts?.find(
    (p) => "inlineData" in p
  ) as { inlineData?: { data: string; mimeType: string } } | undefined;

  if (!audioPart?.inlineData) {
    throw new Error(`TTS returned no audio data for host ${host}`);
  }

  const audioData = Buffer.from(audioPart.inlineData.data, "base64");
  const mimeType = audioPart.inlineData.mimeType;

  return { audioData, mimeType };
}
