const items = require('/tmp/all_master_items_v3.json');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function addItem(cabangId, item) {
  const res = await fetch(`${BASE_URL}/api/master-item`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cabangId,
      namaBarang: item.Nama_Barang,
      satuan: item.Satuan,
      area: item.Lokasi,
      threshold: item.Threshold,
      konversiIsi: item.Konversi_Isi,
      konversiKeterangan: item.Konversi_Keterangan,
    }),
  });
  return res.json();
}

async function main() {
  const cabangId = process.argv[2] || 'CBG001';
  console.log(`Seeding ${items.length} items to ${cabangId}...`);
  
  let success = 0, fail = 0;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    try {
      const result = await addItem(cabangId, item);
      if (result.success) {
        success++;
        if ((i + 1) % 20 === 0) console.log(`  Progress: ${i + 1}/${items.length}`);
      } else {
        fail++;
        console.log(`FAIL [${i+1}] ${item.Nama_Barang}: ${JSON.stringify(result.error)}`);
      }
    } catch (err) {
      fail++;
      console.log(`ERROR [${i+1}] ${item.Nama_Barang}: ${err.message}`);
    }
    // Small delay
    if (i % 5 === 4) await new Promise(r => setTimeout(r, 200));
  }
  
  console.log(`\nDone: ${success} success, ${fail} fail, ${items.length} total`);
}

main().catch(console.error);
