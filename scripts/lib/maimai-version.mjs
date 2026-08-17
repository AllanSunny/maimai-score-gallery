const versionRanges = [
  [10000, 10999, "maimai"],
  [11000, 11999, "maimai PLUS"],
  [12000, 12999, "GreeN"],
  [13000, 13999, "GreeN PLUS"],
  [14000, 14999, "ORANGE"],
  [15000, 15999, "ORANGE PLUS"],
  [16000, 16999, "PiNK"],
  [17000, 17999, "PiNK PLUS"],
  [18000, 18499, "MURASAKi"],
  [18500, 18999, "MURASAKi PLUS"],
  [19000, 19499, "MiLK"],
  [19500, 19899, "MiLK PLUS"],
  [19900, 19999, "FiNALE"],
  [20000, 20499, "maimai でらっくす"],
  [20500, 20999, "maimai でらっくす PLUS"],
  [21000, 21499, "Splash"],
  [21500, 21999, "Splash PLUS"],
  [22000, 22499, "UNiVERSE"],
  [22500, 22999, "UNiVERSE PLUS"],
  [23000, 23499, "FESTiVAL"],
  [23500, 23999, "FESTiVAL PLUS"],
  [24000, 24499, "BUDDiES"],
  [24500, 24999, "BUDDiES PLUS"],
  [25000, 25499, "PRiSM"],
  [25500, 25999, "PRiSM PLUS"],
  [26000, 26499, "CiRCLE"],
  [26500, 26999, "CiRCLE PLUS"],
];

export const maimaiVersionNames = new Set(versionRanges.map(([, , name]) => name));

export function maimaiVersionName(code) {
  const text = String(code ?? "").trim();
  if (!/^\d{5}$/.test(text)) throw new Error(`Invalid SEGA song version code: ${JSON.stringify(code)}.`);
  const number = Number(text);
  const match = versionRanges.find(([minimum, maximum]) => number >= minimum && number <= maximum);
  if (!match) throw new Error(`Unknown SEGA song version code: ${text}.`);
  return match[2];
}

export function maimaiVersion(code) {
  const normalizedCode = String(code).trim();
  return { code: normalizedCode, name: maimaiVersionName(normalizedCode) };
}

export function standaloneMaimaiVersion(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("A standalone song version must contain a named release.");
  }
  const name = String(value.name ?? "").trim();
  if (!maimaiVersionNames.has(name)) throw new Error(`Unknown standalone song version: ${JSON.stringify(name)}.`);
  if (value.code === null || value.code === undefined || String(value.code).trim() === "") {
    return { code: null, name };
  }
  const version = maimaiVersion(value.code);
  if (version.name !== name) {
    throw new Error(`Standalone song version ${version.code} maps to ${version.name}, not ${name}.`);
  }
  return version;
}
