// lib/google/client.ts
// Client stub untuk kompatibilitas pengujian (di-intercept oleh mock-sheets.ts).
// Dalam produksi, seluruh alur telah dimigrasikan ke Supabase RDBMS.

export interface SheetMetadata {
  properties?: {
    title?: string;
    sheetId?: number;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface SheetsClientStub {
  spreadsheets: {
    get: (params?: Record<string, unknown>) => Promise<{ data: { sheets?: SheetMetadata[]; [key: string]: unknown } }>;
    create: (params?: Record<string, unknown>) => Promise<{ data: { spreadsheetId?: string; sheets?: SheetMetadata[]; [key: string]: unknown } }>;
    batchUpdate: (params?: Record<string, unknown>) => Promise<{ data: unknown }>;
    values: {
      get: (params?: Record<string, unknown>) => Promise<{ data: { values?: unknown[][]; [key: string]: unknown } }>;
      append: (params?: Record<string, unknown>) => Promise<{ data: unknown }>;
      update: (params?: Record<string, unknown>) => Promise<{ data: unknown }>;
      clear: (params?: Record<string, unknown>) => Promise<{ data: unknown }>;
      batchGet: (params?: Record<string, unknown>) => Promise<{ data: { valueRanges?: Array<{ values?: unknown[][] }>; [key: string]: unknown } }>;
      batchUpdate: (params?: Record<string, unknown>) => Promise<{ data: unknown }>;
    };
    sheets: {
      copyTo: (params?: Record<string, unknown>) => Promise<{ data: unknown }>;
      [key: string]: unknown;
    };
  };
}

export interface DriveFileMetadata {
  id?: string;
  name?: string;
  mimeType?: string;
  trashed?: boolean;
  role?: string;
  [key: string]: unknown;
}

export interface DriveClientStub {
  files: {
    get: (params?: Record<string, unknown>, options?: Record<string, unknown>) => Promise<{ data: DriveFileMetadata }>;
    create: (params?: Record<string, unknown>) => Promise<{ data: DriveFileMetadata }>;
    copy: (params?: Record<string, unknown>) => Promise<{ data: DriveFileMetadata }>;
    update: (params?: Record<string, unknown>) => Promise<{ data: DriveFileMetadata }>;
    delete: (params?: Record<string, unknown>) => Promise<{ data: unknown }>;
    list: (params?: Record<string, unknown>) => Promise<{ data: { files?: DriveFileMetadata[]; [key: string]: unknown } }>;
  };
  permissions: {
    create: (params?: Record<string, unknown>) => Promise<{ data: unknown }>;
    update: (params?: Record<string, unknown>) => Promise<{ data: unknown }>;
    list: (params?: Record<string, unknown>) => Promise<{ data: { permissions?: DriveFileMetadata[]; [key: string]: unknown } }>;
  };
}

let cachedSheets: SheetsClientStub | null = null;
let cachedDrive: DriveClientStub | null = null;

export function getSheetsClient(): SheetsClientStub {
  if (cachedSheets) return cachedSheets;
  cachedSheets = {
    spreadsheets: {
      get: async () => ({ data: { sheets: [] } }),
      create: async () => ({ data: { spreadsheetId: 'dummy-id', sheets: [] } }),
      batchUpdate: async () => ({ data: {} }),
      values: {
        get: async () => ({ data: { values: [] } }),
        append: async () => ({ data: {} }),
        update: async () => ({ data: {} }),
        clear: async () => ({ data: {} }),
        batchGet: async () => ({ data: { valueRanges: [] } }),
        batchUpdate: async () => ({ data: {} }),
      },
      sheets: {
        copyTo: async () => ({ data: {} }),
      },
    },
  };
  return cachedSheets;
}

export function getDriveClient(): DriveClientStub {
  if (cachedDrive) return cachedDrive;
  cachedDrive = {
    files: {
      get: async () => ({ data: { id: 'dummy-file', name: 'dummy' } }),
      create: async () => ({ data: { id: 'dummy-file', name: 'dummy' } }),
      copy: async () => ({ data: { id: 'dummy-file', name: 'dummy' } }),
      update: async () => ({ data: { id: 'dummy-file', name: 'dummy' } }),
      delete: async () => ({ data: {} }),
      list: async () => ({ data: { files: [] } }),
    },
    permissions: {
      create: async () => ({ data: {} }),
      update: async () => ({ data: {} }),
      list: async () => ({ data: { permissions: [] } }),
    },
  };
  return cachedDrive;
}
