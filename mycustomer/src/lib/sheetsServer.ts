import { google } from 'googleapis'
import type { GoogleAuth } from 'google-auth-library'

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets']

let auth: GoogleAuth | null = null
let sheets: ReturnType<typeof google.sheets> | null = null

function getAuth(): GoogleAuth {
  if (!auth) {
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
    const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY

    if (!email || !key) {
      throw new Error('Missing Google Sheets env vars')
    }

    auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: email,
        private_key: key.replace(/\\n/g, '\n'),
      },
      scopes: SCOPES,
    })
  }
  return auth
}

export function getSheets() {
  if (!sheets) {
    sheets = google.sheets({ version: 'v4', auth: getAuth() })
  }
  return sheets
}

export function getSpreadsheetId(): string {
  const id = process.env.GOOGLE_SPREADSHEET_ID
  if (!id) {
    throw new Error('Missing GOOGLE_SPREADSHEET_ID env var')
  }
  return id
}
