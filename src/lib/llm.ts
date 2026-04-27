import { GoogleGenerativeAI } from "@google/generative-ai";
import { EpisodeScript, ScriptLine } from "./types";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const SYSTEM_PROMPT = `You are a podcast script writer. Generate a natural-sounding dialogue between two podcast hosts.

RULES:
- Host A is named "Alex" and Host B is named "Sam"
- Write exactly 4-6 exchanges (each exchange is one line from each host, so 8-12 total lines)
- Keep each line under 3 sentences for natural TTS output
- Make the conversation flow naturally with reactions, follow-ups, and humor
- Include a brief intro and wrap-up

RESPOND WITH ONLY valid JSON in this exact format (no markdown, no code fences):
{
  "title": "Episode title here",
  "hosts": { "A": "Alex", "B": "Sam" },
  "exchanges": [
    { "host": "A", "name": "Alex", "text": "Line text here" },
    { "host": "B", "name": "Sam", "text": "Response text here" }
  ]
}`;

export async function generateScript(topic: string): Promise<EpisodeScript> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const result = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `${SYSTEM_PROMPT}\n\nTopic: ${topic}`,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.9,
      maxOutputTokens: 2048,
      responseMimeType: "application/json",
    },
  });

  const responseText = result.response.text().trim();

  const parsed = await parseEpisodeScriptJson(model, responseText);

  const script = parsed as EpisodeScript;
  validateScript(script);

  return script;
}

function tryParseJson(text: string): unknown | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function extractFirstJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  if (start < 0) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === "\"") {
        inString = false;
      }
      continue;
    }

    if (ch === "\"") {
      inString = true;
      continue;
    }

    if (ch === "{") depth++;
    if (ch === "}") {
      depth--;
      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }

  return null;
}

async function repairJsonWithModel(
  model: ReturnType<typeof genAI.getGenerativeModel>,
  brokenOutput: string
): Promise<string> {
  const repairPrompt = `Fix the following malformed JSON and return ONLY valid JSON with this shape:
{
  "title": string,
  "hosts": { "A": string, "B": string },
  "exchanges": [{ "host": "A" | "B", "name": string, "text": string }]
}

Do not include markdown or code fences.
Keep the original meaning as much as possible.

Malformed JSON:
${brokenOutput}`;

  const repaired = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: repairPrompt }] }],
    generationConfig: {
      temperature: 0,
      maxOutputTokens: 2048,
      responseMimeType: "application/json",
    },
  });

  return repaired.response.text().trim();
}

async function parseEpisodeScriptJson(
  model: ReturnType<typeof genAI.getGenerativeModel>,
  responseText: string
): Promise<unknown> {
  const direct = tryParseJson(responseText);
  if (direct) return direct;

  const withoutFence = responseText
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
  const fromFence = tryParseJson(withoutFence);
  if (fromFence) return fromFence;

  const extracted = extractFirstJsonObject(responseText);
  if (extracted) {
    const fromExtract = tryParseJson(extracted);
    if (fromExtract) return fromExtract;
  }

  const repaired = await repairJsonWithModel(model, responseText);
  const fromRepair = tryParseJson(repaired);
  if (fromRepair) return fromRepair;

  throw new Error(
    `LLM returned malformed JSON and repair failed. Raw output: ${responseText.slice(0, 300)}`
  );
}

function validateScript(script: EpisodeScript): void {
  if (!script.title || typeof script.title !== "string") {
    throw new Error("Script missing valid title");
  }

  if (!script.hosts?.A || !script.hosts?.B) {
    throw new Error("Script missing host names");
  }

  if (!Array.isArray(script.exchanges) || script.exchanges.length < 4) {
    throw new Error(
      `Script has ${script.exchanges?.length ?? 0} exchanges, need at least 4`
    );
  }

  for (const line of script.exchanges) {
    if (!["A", "B"].includes(line.host)) {
      throw new Error(`Invalid host identifier: ${line.host}`);
    }
    if (!line.text || typeof line.text !== "string" || line.text.length < 5) {
      throw new Error(`Script line has invalid text: "${line.text}"`);
    }
  }
}
