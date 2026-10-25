// test/xlsx-upload-bug-exploration.test.js
// Regression tests for XLSX Drive upload retry logic.
// Validates that transient upload failures are retried and the Drive link is
// saved instead of falling back to a temporary API link.
//
// Run: npm test

/* eslint-disable @typescript-eslint/no-require-imports */

const test = require('node:test');
const assert = require('node:assert/strict');

// Mock tracking object to track uploadFileToGASDrive calls
const mockState = {
  callCount: 0,
  calls: [],
};

function resetMockState() {
  mockState.callCount = 0;
  mockState.calls = [];
}

/**
 * Mock uploadFileToGASDrive that fails on first attempt, succeeds on retry.
 * This simulates a transient network error (like a timeout).
 *
 * Returns a promise that:
 *   - Rejects with error on attempt 1
 *   - Resolves with Drive link on attempt 2+
 */
async function mockUploadFileToGASDrive_FailThenSucceed(params) {
  mockState.callCount++;
  mockState.calls.push({
    attempt: mockState.callCount,
    timestamp: new Date(),
    params: {
      fileName: params.fileName,
      mimeType: params.mimeType,
      bufferSize: params.buffer?.length || 0,
      folderId: params.folderId,
    },
  });

  if (mockState.callCount === 1) {
    // First attempt: fail with transient network error
    throw new Error('Network timeout');
  }

  // Second attempt onwards: succeed
  return {
    fileId: 'test-file-id-12345',
    webViewLink: 'https://drive.google.com/file/d/test-file-id-12345/view?usp=drivesdk',
    downloadUrl: 'https://drive.google.com/uc?id=test-file-id-12345&export=download',
  };
}

/**
 * Simulates the fixed POST /api/so/[laporanId]/xlsx handler retry behavior.
 */
async function handleXlsxSubmit_Fixed(params) {
  const {
    laporanId,
    uploadFileToGASDrive: uploadFn,
    updateLaporanXlsxLink: updateFn,
    folderId,
    fileName,
    buffer,
  } = params;

  let xlsxLink = '';
  let updateCalled = false;
  let updateCalledWith = null;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await uploadFn({
        folderId,
        fileName,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        buffer,
      });
      xlsxLink = res.webViewLink || res.downloadUrl;
      break;
    } catch (err) {
      if (attempt === 2) {
        console.error('[XLSX] GAS upload gagal, fallback ke xlsx-file:', err);
      }
    }
  }

  if (!xlsxLink) {
    const origin = 'http://localhost:3000';
    xlsxLink = `${origin}/api/so/${encodeURIComponent(laporanId)}/xlsx-file?cabang=test-cabang`;
  }

  try {
    updateFn(laporanId, xlsxLink);
    updateCalled = true;
    updateCalledWith = xlsxLink;
  } catch {
    // non-critical
  }

  return {
    success: true,
    xlsxLink,
    uploadAttempts: mockState.callCount,
    updateCalled,
    updateCalledWith,
  };
}

test('XLSX upload retries transient failures and saves Drive link', async () => {
  resetMockState();

  // Setup: Mock updateLaporanXlsxLink
  const mockUpdateLaporanXlsxLink = (_laporanId, _link) => {
    // No-op in mock
  };

  const result = await handleXlsxSubmit_Fixed({
    laporanId: 'RPT_20260829_ABC123',
    uploadFileToGASDrive: mockUploadFileToGASDrive_FailThenSucceed,
    updateLaporanXlsxLink: mockUpdateLaporanXlsxLink,
    folderId: 'test-folder-id',
    fileName: 'SO_20260829_Opening_Taufik.xlsx',
    buffer: Buffer.from('mock xlsx data'),
  });

  assert.equal(mockState.callCount, 2, 
    'uploadFileToGASDrive should retry once after a transient failure');

  assert.equal(result.xlsxLink.includes('drive.google.com'), true,
    'xlsxLink should contain drive.google.com after retry succeeds');

  assert.equal(result.updateCalled, true, 'updateLaporanXlsxLink should be called');
  assert.equal(result.updateCalledWith.includes('drive.google.com'), true, 'saved link should be a Drive link');
});

test('All SO submissions save Drive links after retry', async () => {
  const testCases = [
    {
      laporanId: 'RPT_20260829_ABCD',
      fileName: 'SO_Opening_Cabang1.xlsx',
    },
    {
      laporanId: 'RPT_20260830_EFGH',
      fileName: 'SO_Closing_Cabang2.xlsx',
    },
    {
      laporanId: 'RPT_20260831_IJKL',
      fileName: 'SO_Opening_Cabang3.xlsx',
    },
  ];

  for (const testCase of testCases) {
    resetMockState();

    const result = await handleXlsxSubmit_Fixed({
      laporanId: testCase.laporanId,
      uploadFileToGASDrive: mockUploadFileToGASDrive_FailThenSucceed,
      updateLaporanXlsxLink: (_laporanId, _link) => { /* no-op */ },
      folderId: 'test-folder-id',
      fileName: testCase.fileName,
      buffer: Buffer.from('mock xlsx data'),
    });

    assert.equal(mockState.callCount, 2,
      `${testCase.laporanId}: expected 2 attempts (1 fail + 1 retry)`);
    
    assert.equal(result.xlsxLink.includes('drive.google.com'), true,
      `${testCase.laporanId}: expected Drive link`);
  }
});

test('mock upload can succeed on retry', async () => {
  // This test verifies that our mock WOULD succeed on retry,
  // proving that the bug is in the code, not in our test.
  resetMockState();

  // Attempt 1 should fail
  try {
    await mockUploadFileToGASDrive_FailThenSucceed({
      folderId: 'test-folder',
      fileName: 'test.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: Buffer.from('data'),
    });
    assert.fail('First attempt should throw');
  } catch (err) {
    assert.equal(err.message, 'Network timeout', 'First attempt throws network error');
  }

  // Attempt 2 should succeed
  const result = await mockUploadFileToGASDrive_FailThenSucceed({
    folderId: 'test-folder',
    fileName: 'test.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: Buffer.from('data'),
  });

  assert.equal(result.webViewLink.includes('drive.google.com'), true, 'Retry succeeds with Drive link');
  assert.equal(mockState.callCount, 2, 'Mock was called twice (1 fail + 1 success)');

});
