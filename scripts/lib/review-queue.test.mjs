import assert from "node:assert/strict";
import test from "node:test";
import {
  isManualReviewEntry,
  isReusableReviewRow,
  reviewRowHasContent,
} from "./review-queue.mjs";

test("a checked Review row without a Drive file is a manual import", () => {
  assert.equal(isManualReviewEntry({
    driveFileId: "",
    status: "Review",
    retry: true,
    hasContent: true,
  }), true);
  assert.equal(isManualReviewEntry({
    driveFileId: "drive-file",
    status: "Review",
    retry: true,
    hasContent: true,
  }), false);
  assert.equal(isManualReviewEntry({
    driveFileId: "",
    status: "Review",
    retry: false,
    hasContent: true,
  }), false);
});

test("only a completely empty review row can be reused for an image rejection", () => {
  assert.equal(isReusableReviewRow({ driveFileId: "", hasContent: false }), true);
  assert.equal(isReusableReviewRow({ driveFileId: "", hasContent: true }), false);
});

test("an unchecked checkbox does not make a preallocated review row occupied", () => {
  assert.equal(reviewRowHasContent(["", "", false]), false);
  assert.equal(reviewRowHasContent(["", "", true]), true);
  assert.equal(reviewRowHasContent(["Manual score", "Review", false]), true);
});
