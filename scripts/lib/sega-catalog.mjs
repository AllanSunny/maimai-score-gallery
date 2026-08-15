import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
export const DEFAULT_SEGA_CATALOG_URL = "https://maimai.sega.jp/data/maimai_songs.json";

export async function downloadJson(url, label = "JSON") {
  let stdout;
  try {
    ({ stdout } = await execFileAsync("curl", [
      "--fail",
      "--location",
      "--silent",
      "--show-error",
      "--user-agent",
      "maimai-score-gallery score importer",
      url,
    ], { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 }));
  } catch (error) {
    const details = error?.stderr?.toString().trim();
    throw new Error(`${label} download failed${details ? `: ${details}` : ""}.`, { cause: error });
  }

  try {
    return JSON.parse(stdout);
  } catch (error) {
    throw new Error(`${label} did not contain valid JSON.`, { cause: error });
  }
}

export function createSegaCatalogLoader({
  url = process.env.SEGA_CATALOG_URL ?? DEFAULT_SEGA_CATALOG_URL,
  download = downloadJson,
} = {}) {
  let catalogPromise;
  return async function loadSegaCatalog() {
    catalogPromise ??= download(url, "SEGA song catalog").then((catalog) => {
      if (!Array.isArray(catalog)) throw new Error("SEGA song catalog must be an array.");
      return catalog;
    });
    return catalogPromise;
  };
}
