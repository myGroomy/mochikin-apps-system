// PDF.js

function generatePDF_(cabangId, spreadsheet, cabang, sesiId, tanggal, shift, petugas, transaksiList, masterRows, prevInfo) {
  const laporanSheet = getSheetByName_(spreadsheet, 'Laporan_PDF');
  const laporanId = buildLaporanId_(tanggal, newRandomToken_(8));

  let jumlahKritis = 0;
  let jumlahHampirHabis = 0;

  const rows = transaksiList.map(t => {
    const master = masterRows.find(m => m['Item_ID'] === t.itemId) || {};
    const status = calculateStatus_(t.total, master['Threshold'] || 0);
    if (status === 'Kritis') jumlahKritis++;
    if (status === 'Hampir Habis') jumlahHampirHabis++;
    return {
      ...t,
      nama: master['Nama_Barang'] || '',
      area: master['Area'] || '',
      threshold: master['Threshold'] || 0,
      status,
    };
  });

  // Sort: Kritis -> Hampir Habis -> Aman -> Tidak Dipantau
  const statusOrder = { 'Kritis': 0, 'Hampir Habis': 1, 'Aman': 2, 'Tidak Dipantau': 3 };
  rows.sort((a, b) => (statusOrder[a.status] || 3) - (statusOrder[b.status] || 3));

  const kodeCabang = (cabang['Kode_Cabang'] || cabangId).replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const tglFormatted = tanggal.replace(/-/g, '');
  const fileName = kodeCabang + '-' + tglFormatted + '-' + shift.toUpperCase() + '.pdf';

  const html = buildPdfHtml_(cabang['Nama_Cabang'], tanggal, shift, petugas, rows, sesiId, laporanId, kodeCabang, prevInfo);
  const pdfBlob = Utilities.newBlob(html, 'text/html').getAs('application/pdf');
  pdfBlob.setName(fileName);

  const folder = DriveApp.getFolderById(cabang['Folder_Drive_ID']);
  const file = folder.createFile(pdfBlob);
  const pdfUrl = file.getUrl();

  laporanSheet.appendRow([
    laporanId, sesiId, tanggal, shift, petugas,
    new Date(), pdfUrl, jumlahKritis, jumlahHampirHabis, 'Belum Dikirim'
  ]);

  return laporanId;
}

function buildPdfHtml_(namaCabang, tanggal, shift, petugas, rows, sesiId, laporanId, kodeCabang, prevInfo) {
  // Status colors (functional, kept per status)
  var statusColor = {
    'Kritis': '#CA3521',
    'Hampir Habis': '#B38600',
    'Aman': '#216E4E',
    'Tidak Dipantau': '#6B778C'
  };
  var statusBg = {
    'Kritis': '#FFEBE6',
    'Hampir Habis': '#FFFAE6',
    'Aman': '#E3FCEF',
    'Tidak Dipantau': '#F1F2F4'
  };

  // General palette: 2 colors only
  var primary = '#1868DB';    // header, accents
  var neutral = '#44546F';    // borders, secondary text
  var borderLight = '#DCDFE4';
  var bgLight = '#F7F8F9';
  var textDark = '#172B4D';

  // Count by status
  var counts = { 'Kritis': 0, 'Hampir Habis': 0, 'Aman': 0, 'Tidak Dipantau': 0 };
  rows.forEach(function(r) { if (counts[r.status] !== undefined) counts[r.status]++; });

  // Overview boxes
  var overviewHtml = Object.keys(counts).map(function(status) {
    return '<td style="width:25%;text-align:center;padding:6px 2px;border:1px solid ' + borderLight + '">' +
      '<div style="font-size:18px;font-weight:900;color:' + statusColor[status] + '">' + counts[status] + '</div>' +
      '<div style="font-size:8px;font-weight:700;color:' + statusColor[status] + ';text-transform:uppercase">' + status + '</div>' +
      '</td>';
  }).join('');

  var tdStyle = 'padding:3px 4px;border:1px solid ' + borderLight + ';font-size:9px;vertical-align:middle';
  var thStyle = 'padding:3px 4px;border:1px solid ' + borderLight + ';font-size:8px;font-weight:700;text-align:left';

  // Comparison table rows
  var tableRows = rows.map(function(r, idx) {
    var rowBg = r.status === 'Kritis' ? '#FFF5F3' :
                r.status === 'Hampir Habis' ? '#FFFCF0' :
                idx % 2 === 0 ? bgLight : '#FFFFFF';
    var prevS1 = r.prevStep1 !== undefined && r.prevStep1 !== null ? r.prevStep1 : '-';
    var prevS2 = r.prevStep2 !== undefined && r.prevStep2 !== null ? r.prevStep2 : '-';
    var prevT  = r.prevTotal !== undefined && r.prevTotal !== null ? r.prevTotal : '-';
    // Pemakaian = SO sekarang - SO sebelumnya → berkurang jadi minus, bertambah jadi plus
    var penggunaan = (r.prevTotal !== undefined && r.prevTotal !== null)
      ? r.total - r.prevTotal
      : '-';
    var penggunaanColor = penggunaan === '-' ? neutral :
                           penggunaan >= 0 ? statusColor['Aman'] : statusColor['Kritis'];
    var penggunaanText = penggunaan === '-' ? '-' :
                          penggunaan > 0 ? '+' + penggunaan : String(penggunaan);
    var borderLeft = (r.status === 'Kritis' || r.status === 'Hampir Habis')
      ? 'border-left:3px solid ' + statusColor[r.status] + ';' : '';

    return '<tr style="background:' + rowBg + ';' + borderLeft + '">' +
      '<td style="' + tdStyle + '">' + (idx + 1) + '</td>' +
      '<td style="' + tdStyle + ';font-weight:600">' + r.nama + '</td>' +
      '<td style="' + tdStyle + ';text-align:center;font-weight:600">' + (r.threshold || '–') + '</td>' +
      '<td style="' + tdStyle + ';color:' + neutral + ';font-size:8px">' + r.area + '</td>' +
      '<td style="' + tdStyle + ';text-align:right">' + prevS1 + '</td>' +
      '<td style="' + tdStyle + ';text-align:right">' + prevS2 + '</td>' +
      '<td style="' + tdStyle + ';text-align:right;font-weight:700">' + prevT + '</td>' +
      '<td style="' + tdStyle + ';text-align:right">' + (r.step1 !== undefined ? r.step1 : 0) + '</td>' +
      '<td style="' + tdStyle + ';text-align:right">' + (r.step2 !== undefined ? r.step2 : 0) + '</td>' +
      '<td style="' + tdStyle + ';text-align:right;font-weight:700">' + r.total + '</td>' +
      '<td style="' + tdStyle + ';text-align:right;font-weight:700;color:' + penggunaanColor + '">' + penggunaanText + '</td>' +
      '<td style="' + tdStyle + ';color:' + neutral + ';font-size:8px">' + (r.keterangan || '') + '</td>' +
      '<td style="' + tdStyle + ';font-weight:700;color:' + statusColor[r.status] + '">' + r.status + '</td>' +
      '</tr>';
  }).join('');

  return '<!DOCTYPE html>' +
    '<html><head><meta charset="utf-8">' +
    '<style>' +
    '@page { size: A4 portrait; margin: 8mm; }' +
    'body { font-family: Arial, sans-serif; padding: 12px; color: ' + textDark + '; margin: 0; font-size: 9px; }' +
    'h2 { margin: 0; font-size: 14px; }' +
    'table { border-collapse: collapse; width: 100%; }' +
    '</style>' +
    '</head><body>' +
    '<!-- Header -->' +
    '<div style="background:' + primary + ';color:#fff;padding:10px 14px;border-radius:4px;margin-bottom:8px">' +
    '<h2>LAPORAN STOCK OPNAME</h2>' +
    '<div style="font-size:10px;opacity:0.85;margin-top:2px">' + namaCabang + ' &middot; ' + tanggal + ' &middot; Shift ' + shift + '</div>' +
    '</div>' +

    '<!-- Info row -->' +
    '<table style="margin-bottom:8px"><tr>' +
    '<td style="width:33%;background:' + bgLight + ';border:1px solid ' + borderLight + ';padding:5px 8px">' +
    '<div style="font-size:7px;font-weight:700;color:' + neutral + ';text-transform:uppercase">No. Laporan</div>' +
    '<div style="font-weight:700;font-size:10px">' + laporanId + '</div>' +
    '</td>' +
    '<td style="width:33%;background:' + bgLight + ';border:1px solid ' + borderLight + ';padding:5px 8px">' +
    '<div style="font-size:7px;font-weight:700;color:' + neutral + ';text-transform:uppercase">Petugas</div>' +
    '<div style="font-weight:700;font-size:10px">' + petugas + '</div>' +
    '</td>' +
    '<td style="width:34%;background:' + bgLight + ';border:1px solid ' + borderLight + ';padding:5px 8px">' +
    '<div style="font-size:7px;font-weight:700;color:' + neutral + ';text-transform:uppercase">Kode Cabang</div>' +
    '<div style="font-weight:700;font-size:10px">' + kodeCabang + '</div>' +
    '</td>' +
    '</tr></table>' +

    '<!-- Status Overview -->' +
    '<table style="margin-bottom:8px"><tr>' +
    overviewHtml +
    '</tr></table>' +

    '<!-- Comparison Table -->' +
    '<div style="font-size:9px;font-weight:700;color:' + textDark + ';margin-bottom:4px;text-transform:uppercase">' +
    'Perbandingan Stok - Kritis Lebih Dulu' +
    '</div>' +
    (prevInfo ?
    '<div style="background:' + primary + '11;border:1px solid ' + primary + '33;border-radius:3px;padding:4px 8px;margin-bottom:6px;font-size:9px;color:' + primary + ';font-weight:600">' +
    'SO Sebelumnya: ' + (prevInfo.tanggal || '-') + ' Shift ' + (prevInfo.shift || '') +
    ' | SO Sekarang: ' + tanggal + ' Shift ' + shift +
    '</div>' : '') +
    '<table>' +
    '<tr style="background:' + textDark + ';color:#fff">' +
    '<th style="' + thStyle + ';color:#fff;border-color:' + textDark + '" colspan="4"></th>' +
    '<th style="' + thStyle + ';color:#B3D4FF;text-align:center;border-color:' + textDark + '" colspan="3">SO Sebelumnya</th>' +
    '<th style="' + thStyle + ';color:#B3D4FF;text-align:center;border-color:' + textDark + '" colspan="3">SO Sekarang</th>' +
    '<th style="' + thStyle + ';color:#fff;border-color:' + textDark + '" colspan="3"></th>' +
    '</tr>' +
    '<tr style="background:' + neutral + ';color:#fff">' +
    '<th style="' + thStyle + ';color:#fff;width:19px">No</th>' +
    '<th style="' + thStyle + ';color:#fff;width:95px">Nama Barang</th>' +
    '<th style="' + thStyle + ';color:#fff;text-align:center;width:42px">Threshold</th>' +
    '<th style="' + thStyle + ';color:#fff;width:46px">Area</th>' +
    '<th style="' + thStyle + ';color:#B3D4FF;text-align:right;width:24px">S1</th>' +
    '<th style="' + thStyle + ';color:#B3D4FF;text-align:right;width:24px">S2</th>' +
    '<th style="' + thStyle + ';color:#B3D4FF;text-align:right;width:28px">Tot</th>' +
    '<th style="' + thStyle + ';color:#B3D4FF;text-align:right;width:24px">S1</th>' +
    '<th style="' + thStyle + ';color:#B3D4FF;text-align:right;width:24px">S2</th>' +
    '<th style="' + thStyle + ';color:#B3D4FF;text-align:right;width:28px">Tot</th>' +
    '<th style="' + thStyle + ';color:#fff;text-align:right;width:36px">Pemk</th>' +
    '<th style="' + thStyle + ';color:#fff;width:60px">Ket</th>' +
    '<th style="' + thStyle + ';color:#fff;width:46px">Status</th>' +
    '</tr>' +
    tableRows +
    '</table>' +

    '<!-- Footer -->' +
    '<div style="margin-top:12px;font-size:7px;color:#B3BAC5;text-align:center;border-top:1px solid ' + borderLight + ';padding-top:5px">' +
    kodeCabang + '-' + tanggal.replace(/-/g,'') + '-' + shift.toUpperCase() + '.pdf &middot; Sistem Stokis &middot; ' + new Date().toLocaleString('id-ID') +
    '</div>' +
    '</body></html>';
}

/**
 * Upload file ke Google Drive folder cabang.
 * payload: { folderId, fileName, mimeType, fileBase64 }
 * Mengembalikan { fileId, webViewLink, downloadUrl }
 */
function uploadFileToDrive(cabangId, payload) {
  var folderId = payload.folderId;
  var fileName = payload.fileName;
  var mimeType = payload.mimeType;
  var fileBase64 = payload.fileBase64;

  if (!folderId || !fileName || !fileBase64) {
    throw ApiError_('validation_error', 'folderId, fileName, fileBase64 wajib diisi');
  }

  var decoded = Utilities.base64Decode(fileBase64);
  var blob = Utilities.newBlob(decoded, mimeType, fileName);

  var folder = DriveApp.getFolderById(folderId);
  var file = folder.createFile(blob);

  var webViewLink = file.getUrl();
  var downloadUrl = 'https://drive.google.com/uc?export=download&id=' + file.getId();

  return {
    fileId: file.getId(),
    webViewLink: webViewLink,
    downloadUrl: downloadUrl
  };
}
