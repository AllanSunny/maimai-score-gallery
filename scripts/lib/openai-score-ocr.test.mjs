import assert from "node:assert/strict";
import test from "node:test";
import { parseScoreImage, scoreOcrOptions, scoreOcrRequest } from "./openai-score-ocr.mjs";

test("score OCR keeps the proven model and high-detail defaults", () => {
  assert.deepEqual(scoreOcrOptions({}), {
    model: "gpt-5.5",
    detail: "high",
    maxOutputTokens: 3000,
  });
});

test("score OCR request sends a full JPEG through a strict schema", () => {
  const request = scoreOcrRequest({
    image: { buffer: Buffer.from("image"), mimeType: "image/jpeg" },
    prompt: "extract",
  });
  const image = request.input[0].content[1];

  assert.equal(request.store, false);
  assert.equal(request.text.format.strict, true);
  assert.equal(image.detail, "high");
  assert.equal(image.image_url, "data:image/jpeg;base64,aW1hZ2U=");
});

test("score OCR loads the maimai score prompt and exposes structured output and usage", async () => {
  const expected = { visibleTitle: "Test Song" };
  let request;
  const client = {
    responses: {
      async create(value) {
        request = value;
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
  assert.deepEqual(result.score, expected);
  assert.equal(result.usage.total_tokens, 120);
  assert.equal(result.responseId, "resp_test");
});
