import assert from "node:assert/strict";
import test from "node:test";
import { ratingPlateFor } from "../../src/utils/rating.ts";

const boundaries = [
  [0, "base"],
  [999, "base"],
  [1_000, "blue"],
  [1_999, "blue"],
  [2_000, "green"],
  [4_000, "orange"],
  [7_000, "red"],
  [10_000, "purple"],
  [12_000, "bronze"],
  [13_000, "silver"],
  [14_000, "gold"],
  [14_500, "platinum"],
  [15_000, "rainbow"],
  [16_000, "kiwami"],
];

test("selects the rating plate at each color boundary", () => {
  for (const [rating, expectedPlate] of boundaries) {
    assert.equal(ratingPlateFor(rating), expectedPlate);
  }
});

test("rejects ratings outside the total rating domain", () => {
  assert.throws(() => ratingPlateFor(-1), RangeError);
  assert.throws(() => ratingPlateFor(1.5), RangeError);
  assert.throws(() => ratingPlateFor(Number.POSITIVE_INFINITY), RangeError);
});
