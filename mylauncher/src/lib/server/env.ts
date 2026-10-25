import "server-only";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getSessionEnv() {
  return {
    sessionSecret: required("LAUNCHER_SESSION_SECRET"),
  };
}

export function getSheetsEnv() {
  return {
    spreadsheetId: required("REGISTRY_SPREADSHEET_ID"),
    driveFolderId: process.env.FOLDER_DRIVE_INDUK || "",
    googleServiceAccountEmail: required("GOOGLE_SERVICE_ACCOUNT_EMAIL"),
    googleServiceAccountPrivateKey: required("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY").replace(/\\n/g, "\n"),
  };
}
