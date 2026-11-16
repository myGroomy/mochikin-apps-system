INSERT INTO public.mycustomer_app_settings (id, settings)
VALUES (
  'global',
  '{
    "storeName": "",
    "activeDays": 30,
    "atRiskDays": 60,
    "waTemplate": "Halo {nama}, terima kasih sudah order di {toko}! 😊 Ada yang bisa kami bantu?",
    "waFrequencyTemplates": [
      {
        "id": "freq_new",
        "label": "Pelanggan Baru (1x Order)",
        "minOrders": 1,
        "maxOrders": 1,
        "template": "Halo Kak {nama}, terima kasih atas order pertamanya di {toko}! 😊 Semoga suka ya, ada yang bisa kami bantu?"
      },
      {
        "id": "freq_repeat",
        "label": "Repeat Order (2–5x Order)",
        "minOrders": 2,
        "maxOrders": 5,
        "template": "Halo Kak {nama}, terima kasih sudah order ke-{jumlah_order} kalinya di {toko}! 😊 Semoga selalu puas dengan menu kami ya!"
      },
      {
        "id": "freq_loyal",
        "label": "Pelanggan Setia (6–10x Order)",
        "minOrders": 6,
        "maxOrders": 10,
        "template": "Halo Kak {nama}, terima kasih sudah jadi pelanggan setia {toko} ({jumlah_order}x order)! 🙏😊 Ada yang bisa kami bantu hari ini?"
      },
      {
        "id": "freq_vip",
        "label": "Pelanggan VIP (11x+ Order)",
        "minOrders": 11,
        "maxOrders": null,
        "template": "Halo Kak {nama}, apresiasi spesial dari {toko} untuk Kakak yang sudah {jumlah_order}x order bersama kami! 🌟 Terima kasih atas kepercayaannya!"
      }
    ]
  }'::jsonb
)
ON CONFLICT (id) DO NOTHING;
