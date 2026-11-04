/**
 * lib/branchProvisioner.ts
 * Single source of truth untuk provisi otomatis cabang ke ekosistem Google Sheets & Drive:
 * 1. MyCheck: Membuat struktur folder, spreadsheet SOP dari template, dan subfolder Evidence via GAS.
 * 2. Stokis: Membuat spreadsheet SO dari template, folder laporan PDF, dan inisialisasi sheet kategori via GAS.
 * 3. Rollback: Mekanisme kompensasi all-or-nothing bila salah satu tahapan gagal.
 */

export interface ProvisionBranchInput {
  code: string;
  name: string;
  city: string;
  address?: string | null;
  phone?: string | null;
}

export interface ProvisionBranchResult {
  success: boolean;
  mycheck?: {
    branchFolderId: string;
    spreadsheetId: string;
    evidenceFolderId: string;
    reused: boolean;
  };
  stokis?: {
    cabangId: string;
    spreadsheetId: string;
    folderId: string;
  };
  error?: string;
  stage?: 'mycheck' | 'stokis';
}

/**
 * Panggil GAS MyCheck untuk provisi cabang
 */
export async function provisionMyCheck(input: ProvisionBranchInput) {
  const gasUrl = process.env.MYCHECK_GAS_URL;
  const adminKey = process.env.MYCHECK_GAS_ADMIN_KEY;

  if (!gasUrl || !adminKey) {
    throw new Error('MYCHECK_GAS_URL atau MYCHECK_GAS_ADMIN_KEY belum dikonfigurasi di env.');
  }

  const payload = {
    action: 'createBranchStructure',
    key: adminKey,
    branchCode: input.code.toUpperCase().trim(),
    branchName: input.name.trim(),
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

  try {
    const res = await fetch(gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`MyCheck GAS returned HTTP ${res.status}`);
    }

    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || 'Gagal membuat struktur cabang MyCheck');
    }

    return data.data as {
      branchFolderId: string;
      spreadsheetId: string;
      evidenceFolderId: string;
      reused: boolean;
    };
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Proses Google Drive MyCheck melebihi batas waktu (timeout 60 detik).');
    }
    throw err;
  }
}

/**
 * Panggil GAS Stokis untuk provisi cabang
 */
export async function provisionStokis(input: ProvisionBranchInput) {
  const scriptUrl = process.env.STOKIS_APPS_SCRIPT_URL;
  const apiKey = process.env.STOKIS_API_KEY;

  if (!scriptUrl || !apiKey) {
    throw new Error('STOKIS_APPS_SCRIPT_URL atau STOKIS_API_KEY belum dikonfigurasi di env.');
  }

  const payload = {
    action: 'createCabang',
    'x-api-key': apiKey,
    payload: {
      Nama_Cabang: input.name.trim(),
      Alamat: input.address?.trim() || '',
      PIC_Nama: '',
      Nomor_WA_Cabang: input.phone?.trim() || '',
    },
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

  try {
    const res = await fetch(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Stokis Apps Script returned HTTP ${res.status}`);
    }

    const data = await res.json();
    if (!data.success) {
      const errMsg =
        typeof data.error === 'object' && data.error?.message
          ? data.error.message
          : typeof data.error === 'string'
          ? data.error
          : 'Gagal membuat cabang di Stokis';
      throw new Error(errMsg);
    }

    return data.data as {
      cabangId: string;
      spreadsheetId: string;
      folderId: string;
    };
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Proses Google Drive Stokis melebihi batas waktu (timeout 60 detik).');
    }
    throw err;
  }
}

/**
 * Provisi lengkap All-or-Nothing ke MyCheck dan Stokis
 */
export async function provisionBranchFull(input: ProvisionBranchInput): Promise<ProvisionBranchResult> {
  let mycheckResult;
  try {
    mycheckResult = await provisionMyCheck(input);
  } catch (err: unknown) {
    return {
      success: false,
      stage: 'mycheck',
      error: err instanceof Error ? err.message : 'Gagal provisi Google Drive MyCheck',
    };
  }

  let stokisResult;
  try {
    stokisResult = await provisionStokis(input);
  } catch (err: unknown) {
    return {
      success: false,
      stage: 'stokis',
      error: err instanceof Error ? err.message : 'Gagal provisi Google Drive Stokis',
    };
  }

  return {
    success: true,
    mycheck: mycheckResult,
    stokis: stokisResult,
  };
}
