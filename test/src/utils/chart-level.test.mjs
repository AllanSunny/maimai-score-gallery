import assert from "node:assert/strict";
import test from "node:test";
import { displayedChartLevel } from "../../../src/utils/chart-level.ts";

test("prefers the exact chart constant", () => {
  assert.equal(displayedChartLevel("13+", 13.8), "13.8");
});

test("preserves a plus in the SEGA level when the constant is unavailable", () => {
  assert.equal(displayedChartLevel("13+", null), "13+");
});

test("uses the plain SEGA level when the constant is unavailable", () => {
  assert.equal(displayedChartLevel("13", null), "13");
});
