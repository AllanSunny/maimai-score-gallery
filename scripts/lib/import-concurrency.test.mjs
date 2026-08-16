import assert from "node:assert/strict";
import test from "node:test";
import { createSerialQueue, mapConcurrent } from "./import-concurrency.mjs";

test("serial queue never overlaps work and continues after a rejection", async () => {
  const serial = createSerialQueue();
  let active = 0;
  let maximum = 0;
  const calls = [1, 2, 3].map((value) => serial(async () => {
    active += 1;
    maximum = Math.max(maximum, active);
    await new Promise((resolve) => setTimeout(resolve, 2));
    active -= 1;
    if (value === 2) throw new Error("expected");
    return value;
  }));

  assert.deepEqual(await Promise.allSettled(calls), [
    { status: "fulfilled", value: 1 },
    { status: "rejected", reason: new Error("expected") },
    { status: "fulfilled", value: 3 },
  ]);
  assert.equal(maximum, 1);
});

test("concurrent map limits active work and preserves result order", async () => {
  let active = 0;
  let maximum = 0;
  const results = await mapConcurrent([3, 2, 1, 0], 2, async (value) => {
    active += 1;
    maximum = Math.max(maximum, active);
    await new Promise((resolve) => setTimeout(resolve, value));
    active -= 1;
    return value * 2;
  });

  assert.deepEqual(results, [6, 4, 2, 0]);
  assert.equal(maximum, 2);
});
