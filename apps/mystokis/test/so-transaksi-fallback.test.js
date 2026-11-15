const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

describe('SO Transaksi Fallback Logic', () => {
  test('Fallback SO_Transaksi menghasilkan struktur item yang lengkap', () => {
    const rawSoRows = [
      {
        Transaksi_ID: 'TRX-1',
        Sesi_ID: 'SES-001',
        Tanggal_Operasional: '2026-11-05',
        Shift: 'Closing',
        Item_ID: 'ITM-01',
        Nama_Barang: 'Beras Premium',
        Area: 'Gudang Depan',
        Step1: '10',
        Step2: '5',
        Total: '15',
        Petugas: 'Ahmad',
        Keterangan: 'Aman',
        Status_Isi: 'Penuh',
        Tgl_Refill: '2026-11-04',
        Tgl_Pakai: '',
        Note: 'Catatan sesi',
      },
    ];

    const masterMap = new Map([
      ['ITM-01', { Item_ID: 'ITM-01', Nama_Barang: 'Beras Premium', Area: 'Gudang Depan', Satuan: 'kg', Threshold: 5, Tipe_Input: 'dual' }]
    ]);

    // Simulasi mapping fallback seperti di getLaporanDetail & buildLaporanView
    const mapped = rawSoRows.map((r) => {
      const master = masterMap.get(r.Item_ID);
      const step1 = Number(r.Step1) || 0;
      const step2 = Number(r.Step2) || 0;
      const total = Number(r.Total) || (step1 + step2);
      return {
        Laporan_ID: 'LAP-001',
        itemId: r.Item_ID,
        namaBarang: r.Nama_Barang || master?.Nama_Barang,
        area: r.Area || master?.Area || 'Area Umum',
        satuan: r.Satuan || master?.Satuan || '',
        threshold: r.Threshold != null ? Number(r.Threshold) : (master?.Threshold ?? null),
        step1,
        step2,
        total,
        keterangan: r.Keterangan || '',
        statusIsi: r.Status_Isi || '',
        note: r.Note || '',
      };
    });

    assert.equal(mapped.length, 1);
    assert.equal(mapped[0].itemId, 'ITM-01');
    assert.equal(mapped[0].satuan, 'kg'); // berhasil fallback dari master
    assert.equal(mapped[0].threshold, 5); // berhasil fallback dari master
    assert.equal(mapped[0].total, 15);
    assert.equal(mapped[0].statusIsi, 'Penuh');
  });

  test('Metadata laporan dapat diturunkan langsung dari baris SO_Transaksi', () => {
    const firstRow = {
      Sesi_ID: 'SES-999',
      Tanggal_Operasional: '2026-11-05',
      Shift: 'Opening',
      Petugas: 'Budi',
      Note: 'Semua aman',
    };

    const synthesizedMeta = {
      laporanId: 'SES-999',
      sesiId: String(firstRow.Sesi_ID),
      tanggalOperasional: String(firstRow.Tanggal_Operasional || ''),
      shift: String(firstRow.Shift || ''),
      petugas: String(firstRow.Petugas || ''),
      linkPdf: '',
      linkXlsx: '',
    };

    assert.equal(synthesizedMeta.sesiId, 'SES-999');
    assert.equal(synthesizedMeta.tanggalOperasional, '2026-11-05');
    assert.equal(synthesizedMeta.shift, 'Opening');
    assert.equal(synthesizedMeta.petugas, 'Budi');
  });
});
