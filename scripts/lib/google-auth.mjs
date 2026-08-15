import { readFile } from "node:fs/promises";
import { google } from "googleapis";

export const GOOGLE_SCOPES = {
  readonly: [
    "https://www.googleapis.com/auth/drive.metadata.readonly",
    "https://www.googleapis.com/auth/spreadsheets.readonly",
  ],
  importer: [
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/spreadsheets",
  ],
};

export function requiredEnvironment(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

async function serviceAccountCredentials() {
  const inlineCredentials = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  if (inlineCredentials) {
    try {
      return JSON.parse(inlineCredentials);
    } catch (error) {
      throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON.", { cause: error });
    }
  }

  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  if (!credentialsPath) {
    throw new Error(
      "Set GOOGLE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS.",
    );
  }

  try {
    return JSON.parse(await readFile(credentialsPath, "utf8"));
  } catch (error) {
    throw new Error(`Could not read Google credentials from ${credentialsPath}.`, { cause: error });
  }
}

export async function createGoogleClients(scopes = GOOGLE_SCOPES.importer) {
  const auth = new google.auth.GoogleAuth({
    credentials: await serviceAccountCredentials(),
    scopes,
  });

  return {
    drive: google.drive({ version: "v3", auth }),
    sheets: google.sheets({ version: "v4", auth }),
  };
}
