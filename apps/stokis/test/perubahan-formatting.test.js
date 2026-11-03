const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

// Testing the rounding and formatting logic for the "Perubahan" column
function roundToTwoDecimals(value) {
  const rounded = Number(Math.round(Number(`${value}e2`)) + 'e-2');
  return Object.is(rounded, -0) ? 0 : rounded;
}

function formatPerubahan(value, hasPrev = true) {
  if (!hasPrev || value == null || value === '') return '-';
  const num = Number(value);
  if (!Number.isFinite(num)) return '-';
  const rounded = roundToTwoDecimals(num);
  if (rounded === 0) return '0';
  return rounded > 0 ? `+${rounded}` : `${rounded}`;
}

function displayNum(value) {
  if (value == null || Number.isNaN(Number(value))) return '-';
  const num = Number(value);
  if (Number.isNaN(num)) return '-';
  const rounded = roundToTwoDecimals(num);
  return String(rounded);
}

describe('Format Kolom Perubahan Stok', () => {
  test('Menampilkan tanda minus (-) saat tidak ada SO sebelumnya', () => {
    assert.equal(formatPerubahan(null, false), '-');
    assert.equal(formatPerubahan(undefined, false), '-');
    assert.equal(formatPerubahan(0, false), '-');
    assert.equal(formatPerubahan(10, false), '-');
    assert.equal(formatPerubahan(null, true), '-');
    assert.equal(formatPerubahan('', true), '-');
  });

  test('Menampilkan 0 saat tidak ada perubahan selisih stok', () => {
    assert.equal(formatPerubahan(0, true), '0');
    assert.equal(formatPerubahan(-0, true), '0');
    assert.equal(formatPerubahan('0', true), '0');
  });

  test('Format perubahan bilangan bulat positif dan negatif', () => {
    assert.equal(formatPerubahan(5, true), '+5');
    assert.equal(formatPerubahan(-5, true), '-5');
    assert.equal(formatPerubahan(120, true), '+120');
    assert.equal(formatPerubahan(-42, true), '-42');
  });

  test('Format maksimal 2 digit desimal di belakang koma (tanpa trailing zero berlebih)', () => {
    assert.equal(formatPerubahan(2.5, true), '+2.5');
    assert.equal(formatPerubahan(-0.5, true), '-0.5');
    assert.equal(formatPerubahan(3.25, true), '+3.25');
    assert.equal(formatPerubahan(-3.75, true), '-3.75');
  });

  test('Membulatkan angka desimal lebih dari 2 digit ke 2 digit terdekat', () => {
    assert.equal(formatPerubahan(1.234, true), '+1.23');
    assert.equal(formatPerubahan(1.236, true), '+1.24');
    assert.equal(formatPerubahan(1.005, true), '+1.01');
    assert.equal(formatPerubahan(-4.567, true), '-4.57');
  });

  test('Menghilangkan artefak floating-point precision binary float', () => {
    // 5.3 - 5.1 = 0.1999999999999993
    const diff1 = 5.3 - 5.1;
    assert.equal(formatPerubahan(diff1, true), '+0.2');

    // 0.1 + 0.2 = 0.30000000000000004
    const diff2 = 0.1 + 0.2;
    assert.equal(formatPerubahan(diff2, true), '+0.3');

    // 0.3 - 0.4 = -0.09999999999999998
    const diff3 = 0.3 - 0.4;
    assert.equal(formatPerubahan(diff3, true), '-0.1');
  });

  test('displayNum membatasi floating point display ke maksimal 2 desimal', () => {
    assert.equal(displayNum(null), '-');
    assert.equal(displayNum(undefined), '-');
    assert.equal(displayNum(10), '10');
    assert.equal(displayNum(10.5), '10.5');
    assert.equal(displayNum(0.30000000000000004), '0.3');
    assert.equal(displayNum(2.555), '2.56');
  });
});
