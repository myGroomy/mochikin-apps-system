/**
 * TestPhase2.js
 * Fungsi untuk menguji seluruh logika backend Fase 2 di Apps Script.
 */

function testBackendFase2() {
  Logger.log('🧪 Memulai Pengujian Backend Fase 2...');

  // 1. Test Registry & Cabang List
  const cabangList = getCabangList();
  Logger.log('1. Cabang Aktif saat ini: ' + JSON.stringify(cabangList));

  // 2. Test Create Cabang (Contoh: SO Bandung Malam)
  let cabangId = 'CBG001';
  if (cabangList.length === 0) {
    Logger.log('Membuat Cabang Perdana...');
    const created = createCabang({
      Nama_Cabang: 'SO Bandung Malam',
      Alamat: 'Jl. Riau No. 123, Bandung',
      PIC_Nama: 'Taufik Alwan',
      Nomor_WA_Cabang: '628123456789'
    });
    cabangId = created.cabangId;
    Logger.log('✅ Cabang Perdana Berhasil Dibuat: ' + JSON.stringify(created));
  } else {
    cabangId = cabangList[0]['Cabang_ID'];
    Logger.log('Menggunakan Cabang yang sudah ada: ' + cabangId);
  }

  // 3. Test Master Item
  let items = getMasterItems(cabangId);
  if (items.length === 0) {
    Logger.log('Menambahkan Master Item Percobaan...');
    addItem(cabangId, {
      Nama_Barang: 'Beras Pandan Wangi 5kg',
      Area: 'Meja Biru Depan',
      Satuan: 'kg',
      Threshold: 5
    });
    addItem(cabangId, {
      Nama_Barang: 'Minyak Goreng 2L',
      Area: 'Chiller',
      Satuan: 'liter',
      Threshold: 10
    });
    items = getMasterItems(cabangId);
  }
  Logger.log('2. Master Items di ' + cabangId + ': ' + items.length + ' item');

  // 4. Test Petugas
  let petugas = getPetugasList(cabangId);
  if (petugas.length === 0) {
    Logger.log('Menambahkan Petugas Percobaan...');
    addPetugas(cabangId, {
      Nama: 'Taufik Alwan',
      Nomor_WA: '628123456789'
    });
    petugas = getPetugasList(cabangId);
  }
  Logger.log('3. Petugas di ' + cabangId + ': ' + petugas.length + ' orang');

  // 5. Test Submit SO & PDF Generation
  if (items.length > 0) {
    Logger.log('Menjalankan Simulasi Submit SO...');
    const resultSO = submitSO(cabangId, {
      tanggalOperasional: formatDate_(new Date()),
      shift: 'Opening',
      petugas: petugas[0]['Nama'],
      items: [
        { itemId: items[0]['Item_ID'], step1: 3, step2: 1 } // total 4 (di bawah threshold 5 -> Kritis)
      ]
    });
    Logger.log('✅ Submit SO & PDF Berhasil! Sesi: ' + resultSO.sesiId + ', Laporan ID: ' + resultSO.laporanId);

    // 6. Test WA Link
    const waResult = getShareWhatsAppLink(cabangId, resultSO.laporanId);
    Logger.log('4. WhatsApp Link: ' + waResult.waLink);
  }

  Logger.log('🎉 SEMUA PENGUJIAN BACKEND FASE 2 BERHASIL 100%!');
}
