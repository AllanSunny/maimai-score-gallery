import assert from "node:assert/strict";
import test from "node:test";
import { syncAuditDecision } from "../../../../scripts/one-off/legacy-sync-status/audit.mjs";
import {
  SYNC_STATUS_PROMPT,
  syncStatusOcrRequest,
} from "../../../../scripts/one-off/legacy-sync-status/sync-status-ocr.mjs";

test("sync-only OCR inspects the full image with a narrowly scoped schema", () => {
  const request = syncStatusOcrRequest({
    image: { buffer: Buffer.from("full image"), mimeType: "image/jpeg" },
  });
  assert.equal(request.input[0].content[1].detail, "high");
  assert.match(SYNC_STATUS_PROMPT, /lower circular touchscreen/);
  assert.match(SYNC_STATUS_PROMPT, /read only the sync position/);
  assert.deepEqual(request.text.format.schema.properties.positionState.enum, [
    "badge", "empty", "unreadable",
  ]);
  assert.deepEqual(request.text.format.schema.properties.sync.enum, [
    null, "Sync", "FS", "FS+", "FDX", "FDX+",
  ]);
});

test("legacy sync reconciliation applies only conservative changes", () => {
  assert.deepEqual(syncAuditDecision(null, { positionState: "badge", sync: "Sync" }, "Clear"), {
    apply: true, value: "Sync",
  });
  assert.deepEqual(syncAuditDecision("FS", { positionState: "badge", sync: "FDX" }, "FC"), {
    apply: true, value: "FDX",
  });
  assert.deepEqual(syncAuditDecision("FS", { positionState: "empty", sync: null }, "Clear"), {
    apply: true, value: null,
  });
  assert.deepEqual(syncAuditDecision("FS", { positionState: "unreadable", sync: null }, "Clear"), {
    apply: false, value: "FS",
  });
  assert.deepEqual(syncAuditDecision(null, { positionState: "badge", sync: "FS" }, "Clear"), {
    apply: false, value: null,
  });
});
