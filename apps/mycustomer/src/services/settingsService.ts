export interface WaFrequencyTemplate {
  id: string
  label: string
  minOrders: number
  maxOrders: number | null
  template: string
}

export interface AppSettings {
  storeName: string
  activeDays: number
  atRiskDays: number
  waTemplate: string
  waFrequencyTemplates: WaFrequencyTemplate[]
}

export const DEFAULT_WA_FREQUENCY_TEMPLATES: WaFrequencyTemplate[] = [
  {
    id: 'freq_new',
    label: 'Pelanggan Baru (1x Order)',
    minOrders: 1,
    maxOrders: 1,
    template: 'Halo Kak {nama}, terima kasih atas order pertamanya di {toko}! 😊 Semoga suka ya, ada yang bisa kami bantu?',
  },
  {
    id: 'freq_repeat',
    label: 'Repeat Order (2–5x Order)',
    minOrders: 2,
    maxOrders: 5,
    template: 'Halo Kak {nama}, terima kasih sudah order ke-{jumlah_order} kalinya di {toko}! 😊 Semoga selalu puas dengan menu kami ya!',
  },
  {
    id: 'freq_loyal',
    label: 'Pelanggan Setia (6–10x Order)',
    minOrders: 6,
    maxOrders: 10,
    template: 'Halo Kak {nama}, terima kasih sudah jadi pelanggan setia {toko} ({jumlah_order}x order)! 🙏😊 Ada yang bisa kami bantu hari ini?',
  },
  {
    id: 'freq_vip',
    label: 'Pelanggan VIP (11x+ Order)',
    minOrders: 11,
    maxOrders: null,
    template: 'Halo Kak {nama}, apresiasi spesial dari {toko} untuk Kakak yang sudah {jumlah_order}x order bersama kami! 🌟 Terima kasih atas kepercayaannya!',
  },
]

export const DEFAULT_APP_SETTINGS: AppSettings = {
  storeName: '',
  activeDays: 30,
  atRiskDays: 60,
  waTemplate: 'Halo {nama}, terima kasih sudah order di {toko}! 😊 Ada yang bisa kami bantu?',
  waFrequencyTemplates: DEFAULT_WA_FREQUENCY_TEMPLATES,
}

function parseFrequencyTemplates(raw: string | undefined): WaFrequencyTemplate[] {
  if (!raw) return DEFAULT_WA_FREQUENCY_TEMPLATES
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_WA_FREQUENCY_TEMPLATES
    return parsed
      .filter((item) => item && typeof item.template === 'string')
      .map((item, idx) => ({
        id: typeof item.id === 'string' && item.id ? item.id : `freq_${idx + 1}`,
        label: typeof item.label === 'string' && item.label ? item.label : `Kategori ${idx + 1}`,
        minOrders: Math.max(1, Number(item.minOrders) || 1),
        maxOrders: item.maxOrders === null || item.maxOrders === '' || item.maxOrders === undefined
          ? null
          : Math.max(1, Number(item.maxOrders)),
        template: item.template,
      }))
  } catch {
    return DEFAULT_WA_FREQUENCY_TEMPLATES
  }
}

// Diisi dari Supabase agar komponen client dapat membaca pengaturan secara sinkron.
let _cache: AppSettings | null = null

function broadcastChange(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('mycustomer_settings_changed'))
  }
}

// Get settings synchronously from the cache populated by Supabase.
export function getAppSettings(): AppSettings {
  return _cache ?? DEFAULT_APP_SETTINGS
}

export async function syncSettingsFromSupabase(): Promise<AppSettings> {
  const response = await fetch('/api/settings')
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'Gagal memuat pengaturan')
  const settings: AppSettings = data.settings
    ? {
        ...DEFAULT_APP_SETTINGS,
        ...data.settings,
        waFrequencyTemplates: parseFrequencyTemplates(
          JSON.stringify(data.settings.waFrequencyTemplates),
        ),
      }
    : DEFAULT_APP_SETTINGS
  _cache = settings
  broadcastChange()
  return settings
}

export async function saveAppSettings(settings: AppSettings): Promise<void> {
  const response = await fetch('/api/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ settings }),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'Gagal menyimpan pengaturan')
  _cache = data.settings
  broadcastChange()
}