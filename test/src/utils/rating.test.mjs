import assert from "node:assert/strict";
import test from "node:test";
import { calculatePlayRating } from "../../../src/utils/rating.ts";

test("calculates an SSS+ play using the CiRCLE PLUS coefficient", () => {
  assert.equal(calculatePlayRating({ achievement: 100.5, chartConstant: 13, combo: "FC+" }), 292);
});

test("caps achievement at 100.5 percent", () => {
  assert.equal(calculatePlayRating({ achievement: 101, chartConstant: 13, combo: "FC+" }), 292);
});

test("uses the SSS coefficient at exactly 100 percent", () => {
  assert.equal(calculatePlayRating({ achievement: 100, chartConstant: 13, combo: "FC+" }), 280);
});

test("uses the SS plus coefficient at exactly 99.5 percent", () => {
  assert.equal(calculatePlayRating({ achievement: 99.5, chartConstant: 13, combo: "FC+" }), 272);
});

test("adds one rating for an all perfect", () => {
  assert.equal(calculatePlayRating({ achievement: 100.5, chartConstant: 13, combo: "AP" }), 293);
});

test("adds one rating for an all perfect plus", () => {
  assert.equal(calculatePlayRating({ achievement: 100.5, chartConstant: 13, combo: "AP+" }), 293);
});

test("does not add a rating bonus for full combo plus", () => {
  assert.equal(calculatePlayRating({ achievement: 100.5, chartConstant: 13, combo: "FC+" }), 292);
});

test("calculates rating without a known combo status", () => {
  assert.equal(calculatePlayRating({ achievement: 100.5, chartConstant: 13, combo: null }), 292);
});

test("calculates rating when combo status is omitted", () => {
  assert.equal(calculatePlayRating({ achievement: 100.5, chartConstant: 13 }), 292);
});

test("returns null when the chart constant is unavailable", () => {
  assert.equal(calculatePlayRating({ achievement: 100.5, chartConstant: null, combo: "AP+" }), null);
});

test("rejects a negative achievement", () => {
  assert.throws(() => calculatePlayRating({ achievement: -1, chartConstant: 13, combo: "Clear" }), RangeError);
});
