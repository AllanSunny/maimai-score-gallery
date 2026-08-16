import { readFile } from "node:fs/promises";
import OpenAI from "openai";
import { requiredEnvironment } from "../../lib/google-auth.mjs";

export const SYNC_STATUS_AUDIT_PROMPT_VERSION = "2026-08-16-v1";

const SYNC_STATUS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    positionState: {
      type: "string",
      enum: ["badge", "empty", "unreadable"],
    },
    sync: {
      type: ["string", "null"],
      enum: [null, "Sync", "FS", "FS+", "FDX", "FDX+"],
    },
  },
  required: ["positionState", "sync"],
};

export const SYNC_STATUS_PROMPT = await readFile(new URL("./prompt.md", import.meta.url), "utf8");

export function syncStatusOcrOptions(environment = process.env) {
  return {
    model: environment.OPENAI_OCR_MODEL?.trim() || "gpt-5.5",
    detail: "high",
    maxOutputTokens: 500,
    timeoutMs: 45_000,
    maxRetries: 1,
  };
}

export function syncStatusOcrRequest({ image, options = syncStatusOcrOptions() }) {
  return {
    model: options.model,
    store: false,
    max_output_tokens: options.maxOutputTokens,
    reasoning: { effort: "low" },
    text: {
      format: {
        type: "json_schema",
        name: "maimai_sync_status",
        strict: true,
        schema: SYNC_STATUS_SCHEMA,
      },
    },
    input: [{
      role: "user",
      content: [
        { type: "input_text", text: SYNC_STATUS_PROMPT },
        {
          type: "input_image",
          detail: options.detail,
          image_url: `data:${image.mimeType};base64,${image.buffer.toString("base64")}`,
        },
      ],
    }],
  };
}

export async function parseSyncStatus(image, dependencies = {}) {
  const options = dependencies.options ?? syncStatusOcrOptions();
  const client = dependencies.client ?? new OpenAI({ apiKey: requiredEnvironment("OPENAI_API_KEY") });
  const response = await client.responses.create(
    syncStatusOcrRequest({ image, options }),
    { timeout: options.timeoutMs, maxRetries: options.maxRetries },
  );
  if (!response.output_text) {
    throw new Error(
      `OpenAI returned no sync-status output (status=${response.status ?? "unknown"}; response_id=${response.id ?? "unknown"}).`,
    );
  }
  let result;
  try {
    result = JSON.parse(response.output_text);
  } catch (error) {
    throw new Error(`OpenAI returned invalid sync-status JSON (response_id=${response.id ?? "unknown"}).`, {
      cause: error,
    });
  }
  if ((result.positionState === "badge") !== (result.sync !== null)) {
    throw new Error(`OpenAI returned an inconsistent sync-status result (response_id=${response.id ?? "unknown"}).`);
  }
  return {
    positionState: result.positionState,
    sync: result.sync,
    responseId: response.id ?? null,
    usage: response.usage ?? null,
    model: options.model,
  };
}
