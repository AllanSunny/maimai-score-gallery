import assert from "node:assert/strict";
import test from "node:test";
import {
  maimaiVersion,
  maimaiVersionName,
  standaloneMaimaiVersion,
} from "../../../scripts/lib/maimai-version.mjs";

test("maps SEGA song version codes to named game releases", () => {
  assert.equal(maimaiVersionName("10002"), "maimai");
  assert.equal(maimaiVersionName("18512"), "MURASAKi PLUS");
  assert.equal(maimaiVersionName("19999"), "FiNALE");
  assert.equal(maimaiVersionName("24015"), "BUDDiES");
  assert.equal(maimaiVersionName("24513"), "BUDDiES PLUS");
  assert.equal(maimaiVersionName("25518"), "PRiSM PLUS");
  assert.equal(maimaiVersionName("26016"), "CiRCLE");
  assert.equal(maimaiVersionName("26512"), "CiRCLE PLUS");
});

test("retains the raw SEGA code alongside its display name", () => {
  assert.deepEqual(maimaiVersion("25007"), { code: "25007", name: "PRiSM" });
});

test("standalone songs can retain a known release without inventing a SEGA code", () => {
  assert.deepEqual(standaloneMaimaiVersion({ code: null, name: "Splash" }), {
    code: null,
    name: "Splash",
  });
});

test("rejects malformed and unknown version codes", () => {
  assert.throws(() => maimaiVersionName("PRISM"), /Invalid SEGA song version code/);
  assert.throws(() => maimaiVersionName("27000"), /Unknown SEGA song version code/);
});
