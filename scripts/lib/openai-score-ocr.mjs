import { readFile } from "node:fs/promises";
import OpenAI from "openai";
import { requiredEnvironment } from "./google-auth.mjs";

const maimaiScorePromptUrl = new URL("./maimai-score-prompt.md", import.meta.url);
export const SCORE_OCR_PROMPT_VERSION = "2026-08-15-v6";
const SCORE_OCR_OPTIONS = Object.freeze({
  detail: "high",
  reasoningEffort: "low",
  maxOutputTokens: 5000,
});

const nullableNumber = { type: ["number", "null"] };
const judgmentProperties = {
  criticalPerfect: nullableNumber,
  perfect: nullableNumber,
  great: nullableNumber,
  good: nullableNumber,
  miss: nullableNumber,
};
const judgmentSetSchema = {
  type: "object",
  additionalProperties: false,
  properties: judgmentProperties,
  required: Object.keys(judgmentProperties),
};

const SCORE_OCR_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    visibleTitle: { type: "string", minLength: 1 },
    visibleArtist: { type: ["string", "null"] },
    titleTruncated: { type: "boolean" },
    chartType: { type: "string", enum: ["DX", "STD", "UTAGE"] },
    difficulty: {
      type: "string",
      enum: ["BASIC", "ADVANCED", "EXPERT", "MASTER", "Re:MASTER"],
    },
    level: { type: "string", pattern: "^[0-9]{1,2}\\+?$" },
    achievement: { type: "number" },
    combo: { type: "string", enum: ["AP+", "AP", "FC+", "FC", "Clear"] },
    sync: { type: "string", enum: ["None", "FS", "FS+", "FDX", "FDX+"] },
    judgments: judgmentSetSchema,
    judgmentsByType: {
      type: ["object", "null"],
      additionalProperties: false,
      properties: {
        tap: judgmentSetSchema,
        hold: judgmentSetSchema,
        slide: judgmentSetSchema,
        touch: judgmentSetSchema,
        break: judgmentSetSchema,
      },
      required: ["tap", "hold", "slide", "touch", "break"],
    },
    fast: nullableNumber,
    slow: nullableNumber,
    rating: nullableNumber,
    ratingChange: nullableNumber,
  },
  required: [
    "visibleTitle", "visibleArtist", "titleTruncated", "chartType", "difficulty", "level", "achievement",
    "combo", "sync", "judgments", "judgmentsByType", "fast", "slow", "rating",
    "ratingChange",
  ],
};

export function scoreOcrOptions(environment = process.env) {
  return {
    ...SCORE_OCR_OPTIONS,
    model: environment.OPENAI_OCR_MODEL?.trim() || "gpt-5.5",
  };
}

export function scoreOcrRequest({ image, prompt, options = scoreOcrOptions() }) {
  return {
    model: options.model,
    store: false,
    max_output_tokens: options.maxOutputTokens,
    reasoning: {
      effort: options.reasoningEffort,
      summary: "auto",
    },
    text: {
      format: {
        type: "json_schema",
        name: "maimai_score_result",
        strict: true,
        schema: SCORE_OCR_SCHEMA,
      },
    },
    input: [{
      role: "user",
      content: [
        { type: "input_text", text: prompt },
        {
          type: "input_image",
          detail: options.detail,
          image_url: `data:${image.mimeType};base64,${image.buffer.toString("base64")}`,
        },
      ],
    }],
  };
}

function responseDiagnostics(response) {
  const reasoningSummary = (response.output ?? []).flatMap((item) =>
    item.type === "reasoning"
      ? (item.summary ?? []).map((summary) => summary.text).filter(Boolean)
      : []);
  return {
    responseId: response.id ?? null,
    status: response.status ?? null,
    incompleteReason: response.incomplete_details?.reason ?? null,
    inputTokens: response.usage?.input_tokens ?? null,
    outputTokens: response.usage?.output_tokens ?? null,
    reasoningTokens: response.usage?.output_tokens_details?.reasoning_tokens ?? null,
    reasoningSummary,
  };
}

function ocrError(message, response, options = {}) {
  const error = new Error(message, options);
  error.openAiDiagnostics = responseDiagnostics(response);
  return error;
}

export async function parseScoreImage(image, dependencies = {}) {
  const options = dependencies.options ?? scoreOcrOptions();
  const prompt = dependencies.prompt ?? await readFile(maimaiScorePromptUrl, "utf8");
  const client = dependencies.client ?? new OpenAI({ apiKey: requiredEnvironment("OPENAI_API_KEY") });
  const response = await client.responses.create(scoreOcrRequest({ image, prompt, options }));
  if (!response.output_text) {
    const details = [
      response.status && `status=${response.status}`,
      response.incomplete_details?.reason
        && `incomplete_reason=${response.incomplete_details.reason}`,
      response.error?.message && `api_error=${response.error.message}`,
      ...(response.output ?? []).flatMap((item) => (item.content ?? [])
        .filter((content) => content.type === "refusal" && content.refusal)
        .map((content) => `refusal=${content.refusal}`)),
      response.id && `response_id=${response.id}`,
    ].filter(Boolean);
    const suffix = details.length > 0 ? ` (${details.join("; ")})` : "";
    throw ocrError(`OpenAI returned no structured OCR output${suffix}.`, response);
  }

  try {
    return {
      score: JSON.parse(response.output_text),
      usage: response.usage ?? null,
      responseId: response.id,
    };
  } catch (error) {
    const details = [
      error?.message && `parse_error=${error.message}`,
      response.status && `status=${response.status}`,
      response.incomplete_details?.reason
        && `incomplete_reason=${response.incomplete_details.reason}`,
      response.id && `response_id=${response.id}`,
    ].filter(Boolean);
    const suffix = details.length > 0 ? ` (${details.join("; ")})` : "";
    throw ocrError(`OpenAI returned invalid structured OCR JSON${suffix}.`, response, { cause: error });
  }
}
