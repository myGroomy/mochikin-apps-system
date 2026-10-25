import { google } from 'googleapis';

export interface SheetsClientConfig {
  serviceAccountEmail: string;
  /** Private key PKCS#8. Baris baru boleh berupa `\n` literal — akan dinormalisasi. */
  privateKey: string;
  spreadsheetId: string;
}

/**
 * Google Sheets API client wrapper
 * Handles authentication and common sheet operations
 */
export class SheetsClient {
  private sheets: any;
  private spreadsheetId: string;

  constructor(config: SheetsClientConfig) {
    const auth = new google.auth.JWT({
      email: config.serviceAccountEmail,
      key: config.privateKey.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    this.sheets = google.sheets({ version: 'v4', auth });
    this.spreadsheetId = config.spreadsheetId;
  }

  /**
   * Read range from sheet
   * @param range - A1 notation (e.g., "Sheet1!A1:C10")
   * @returns Array of rows
   */
  async readRange(range: string): Promise<any[][]> {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range,
      });
      return response.data.values || [];
    } catch (error) {
      console.error('❌ Failed to read sheet:', error instanceof Error ? error.message : error);
      throw error;
    }
  }

  /**
   * Read rows from a range (convenience alias over readRange).
   */
  async readRows(spreadsheetId: string, range: string): Promise<any[][]> {
    return this.readRange(range);
  }

  /**
   * Append rows to sheet
   * @param range - A1 notation (e.g., "Sheet1!A:Z")
   * @param values - 2D array of values to append
   */
  async appendRows(range: string, values: any[][]): Promise<void> {
    try {
      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values,
        },
      });
    } catch (error) {
      console.error('❌ Failed to append to sheet:', error instanceof Error ? error.message : error);
      throw error;
    }
  }

  /**
   * Update range in sheet
   * @param range - A1 notation (e.g., "Sheet1!A1:C10")
   * @param values - 2D array of values
   */
  async updateRange(range: string, values: any[][]): Promise<void> {
    try {
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values,
        },
      });
    } catch (error) {
      console.error('❌ Failed to update sheet:', error instanceof Error ? error.message : error);
      throw error;
    }
  }

  /**
   * Clear range in sheet
   * @param range - A1 notation (e.g., "Sheet1!A1:C10")
   */
  async clearRange(range: string): Promise<void> {
    try {
      await this.sheets.spreadsheets.values.clear({
        spreadsheetId: this.spreadsheetId,
        range,
      });
    } catch (error) {
      console.error('❌ Failed to clear sheet:', error instanceof Error ? error.message : error);
      throw error;
    }
  }

  /**
   * Get sheet metadata (column count, etc.)
   * @param sheetName - Sheet name
   */
  async getSheetMetadata(sheetName: string): Promise<any> {
    try {
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });

      const sheet = response.data.sheets.find((s: any) => s.properties.title === sheetName);
      return sheet?.properties;
    } catch (error) {
      console.error('❌ Failed to get sheet metadata:', error instanceof Error ? error.message : error);
      throw error;
    }
  }
}

/**
 * Create SheetsClient from environment
 */
export function createSheetsClient(): SheetsClient {
  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  const spreadsheetId = process.env.MOCHIKIN_REGISTRY_SHEET_ID || '';

  if (!serviceAccountEmail || !privateKey) {
    throw new Error('Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY');
  }
  if (!spreadsheetId) {
    throw new Error('Missing MOCHIKIN_REGISTRY_SHEET_ID');
  }

  return new SheetsClient({ serviceAccountEmail, privateKey, spreadsheetId });
}
