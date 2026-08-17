import { readFile } from "node:fs/promises";
import path from "node:path";

const chartFields = {
  DX: {
    BASIC: "dx_lev_bas",
    ADVANCED: "dx_lev_adv",
    EXPERT: "dx_lev_exp",
    MASTER: "dx_lev_mas",
    "Re:MASTER": "dx_lev_remas",
  },
  STD: {
    BASIC: "lev_bas",
    ADVANCED: "lev_adv",
    EXPERT: "lev_exp",
    MASTER: "lev_mas",
    "Re:MASTER": "lev_remas",
  },
};

function nonempty(value, label) {
  const text = String(value ?? "").trim();
  if (!text) throw new Error(`${label} is required for a standalone catalog override.`);
  return text;
}

function titleValues(canonical, override) {
  const titles = override.titles ?? {};
  const values = [
    canonical,
    ...(titles.kana ?? []),
    ...(titles.romaji ?? []),
    ...(titles.english ?? []),
    ...(titles.aliases ?? []),
  ];
  return [...new Set(values.map((value) => String(value).trim()).filter(Boolean))];
}

export function standaloneCatalogSongs(overrides) {
  return Object.entries(overrides).flatMap(([canonicalTitle, override]) => {
    if (!override?.standalone) return [];
    const title = nonempty(canonicalTitle, "Standalone override title");
    nonempty(override.id, `${title}.id`);
    if (override.jacketKey !== null && override.jacketKey !== undefined) {
      const jacketKey = nonempty(override.jacketKey, `${title}.jacketKey`);
      if (/^[a-z][a-z\d+.-]*:\/\//i.test(jacketKey)) {
        throw new Error(`${title}.jacketKey must be an R2 object key, not a public URL.`);
      }
    }
    const charts = override.charts;
    if (!charts || typeof charts !== "object" || Array.isArray(charts)) {
      throw new Error(`${title} must define a charts object.`);
    }
    const song = {
      title,
      artist: nonempty(override.artist, `${title}.artist`),
      catcode: nonempty(override.genre, `${title}.genre`),
      version: override.version ?? null,
      image_url: null,
      matchTitles: titleValues(title, override),
      standaloneOverride: override,
    };
    let chartCount = 0;
    Object.entries(charts).forEach(([key, chart]) => {
      const [chartType, difficulty] = key.split(":");
      const field = chartFields[chartType]?.[difficulty];
      if (!field) throw new Error(`${title}.charts has an unsupported chart key: ${key}.`);
      song[field] = nonempty(chart?.level, `${title}.charts.${key}.level`);
      chartCount += 1;
    });
    if (chartCount === 0) throw new Error(`${title} must define at least one chart.`);
    return [song];
  });
}

export function createCatalogOverridesLoader({
  filePath = path.join(process.cwd(), "src", "data", "overrides.json"),
  read = readFile,
} = {}) {
  let overridesPromise;
  return async function loadCatalogOverrides() {
    overridesPromise ??= read(filePath, "utf8").then((contents) => JSON.parse(contents));
    return overridesPromise;
  };
}
