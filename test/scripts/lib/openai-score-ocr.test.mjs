import assert from "node:assert/strict";
import test from "node:test";
import { parseScoreImage, scoreOcrOptions, scoreOcrRequest } from "../../../scripts/lib/openai-score-ocr.mjs";

test("score OCR uses high detail with bounded retries", () => {
  assert.deepEqual(scoreOcrOptions({}), {
    model: "gpt-5.5",
    detail: "high",
    reasoningEffort: "low",
    maxOutputTokens: 5000,
    timeoutMs: 45_000,
    maxRetries: 1,
  });
});

test("score OCR request sends a high-detail JPEG through a strict schema", () => {
  const request = scoreOcrRequest({
    image: { buffer: Buffer.from("image"), mimeType: "image/jpeg" },
    prompt: "extract",
  });
  const image = request.input[0].content[1];

  assert.equal(request.store, false);
  assert.equal(request.text.format.strict, true);
  assert.deepEqual(request.text.format.schema.properties.sync.enum, [
    null, "Sync", "FS", "FS+", "FDX", "FDX+",
  ]);
  assert.deepEqual(request.reasoning, { effort: "low", summary: "auto" });
  assert.equal(image.detail, "high");
  assert.equal(image.image_url, "data:image/jpeg;base64,aW1hZ2U=");
});

test("score OCR loads the maimai score prompt and exposes structured output and usage", async () => {
  const expected = { visibleTitle: "Test Song" };
  let request;
  let requestOptions;
  const client = {
    responses: {
      async create(value, options) {
        request = value;
        requestOptions = options;
        return {
          id: "resp_test",
          output_text: JSON.stringify(expected),
          usage: { input_tokens: 100, output_tokens: 20, total_tokens: 120 },
        };
      },
    },
  };
  const result = await parseScoreImage(
    { buffer: Buffer.from("image"), mimeType: "image/jpeg" },
    { client, options: scoreOcrOptions({}) },
  );

  assert.match(request.input[0].content[0].text, /expert OCR parser/);
  assert.match(request.input[0].content[0].text, /lower circular touchscreen shows the played song/);
  assert.match(request.input[0].content[0].text, /`ALLANTHE` in older photos and `AllanThe` in newer photos/);
  assert.deepEqual(result.score, expected);
  assert.equal(result.usage.total_tokens, 120);
  assert.equal(result.responseId, "resp_test");
  assert.deepEqual(requestOptions, { timeout: 45_000, maxRetries: 1 });
});

test("score OCR reports why a response has no structured output", async () => {
  const client = {
    responses: {
      async create() {
        return {
          id: "resp_incomplete",
          status: "incomplete",
          incomplete_details: { reason: "max_output_tokens" },
          output_text: "",
          output: [],
        };
      },
    },
  };

  let caughtError;
  await assert.rejects(
    parseScoreImage(
      { buffer: Buffer.from("image"), mimeType: "image/jpeg" },
      { client, prompt: "extract", options: scoreOcrOptions({}) },
    ).catch((error) => {
      caughtError = error;
      throw error;
    }),
    /status=incomplete; incomplete_reason=max_output_tokens; response_id=resp_incomplete/,
  );
  assert.deepEqual(caughtError.openAiDiagnostics, {
    responseId: "resp_incomplete",
    status: "incomplete",
    incompleteReason: "max_output_tokens",
    inputTokens: null,
    outputTokens: null,
    reasoningTokens: null,
    reasoningSummary: [],
  });
});

test("score OCR reports why structured output contains invalid JSON", async () => {
  const client = {
    responses: {
      async create() {
        return {
          id: "resp_truncated",
          status: "incomplete",
          incomplete_details: { reason: "max_output_tokens" },
          output_text: '{"visibleTitle":"Test',
        };
      },
    },
  };

  await assert.rejects(
    parseScoreImage(
      { buffer: Buffer.from("image"), mimeType: "image/jpeg" },
      { client, prompt: "extract", options: scoreOcrOptions({}) },
    ),
    /parse_error=.*status=incomplete; incomplete_reason=max_output_tokens; response_id=resp_truncated/,
  );
});
