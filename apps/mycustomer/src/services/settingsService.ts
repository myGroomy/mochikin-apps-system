import { getSheetData, appendRow, updateRow } from './sheetsService'

const SETTINGS_SHEET = 'settings'

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

// Convert rows to key-value object
function rowsToSettings(rows: Record<string, string>[]): AppSettings {
  const map = new Map(rows.map(r => [r.key, r.value]))

  return {
    storeName: map.get('storeName') || DEFAULT_APP_SETTINGS.storeName,
    activeDays: parseInt(map.get('activeDays') || '') || DEFAULT_APP_SETTINGS.activeDays,
    atRiskDays: parseInt(map.get('atRiskDays') || '') || DEFAULT_APP_SETTINGS.atRiskDays,
    waTemplate: map.get('waTemplate') || DEFAULT_APP_SETTINGS.waTemplate,
    waFrequencyTemplates: parseFrequencyTemplates(map.get('waFrequencyTemplates')),
  }
}

// In-memory cache sumber utama settings adalah Google Sheets, bukan localStorage.
// Di-set lewat syncSettingsFromSheets(); dipakai sebagai sumber sinkron untuk
// komponen yang butuh nilai seketika (churnStatus, waLinkBuilder, layout, provider).
let _cache: AppSettings | null = null

function broadcastChange(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('mycustomer_settings_changed'))
  }
}

// Get settings (synchronous, dari cache yang di-sync dari Sheets)
export function getAppSettings(): AppSettings {
  return _cache ?? DEFAULT_APP_SETTINGS
}

// Baca langsung dari Sheets lalu simpan ke cache in-memory
export async function syncSettingsFromSheets(): Promise<AppSettings> {
  try {
    const rows = await getSheetData(SETTINGS_SHEET)
    if (rows.length > 0) {
      _cache = rowsToSettings(rows)
      broadcastChange()
      return _cache
    }
  } catch {
    // Fallback ke cache / default
  }
  return getAppSettings()
}

// Simpan ke cache + Sheets (Google Sheets adalah source of truth)
export async function saveAppSettings(settings: AppSettings): Promise<void> {
  _cache = settings
  broadcastChange()

  try {
    const rows = await getSheetData(SETTINGS_SHEET)
    const map = new Map(rows.map((r, idx) => [r.key, idx]))

    const updates = [
      { key: 'storeName', value: settings.storeName },
      { key: 'activeDays', value: String(settings.activeDays) },
      { key: 'atRiskDays', value: String(settings.atRiskDays) },
      { key: 'waTemplate', value: settings.waTemplate },
      { key: 'waFrequencyTemplates', value: JSON.stringify(settings.waFrequencyTemplates || DEFAULT_WA_FREQUENCY_TEMPLATES) },
    ]

    for (const item of updates) {
      const existingIndex = map.get(item.key)
      if (existingIndex !== undefined) {
        await updateRow(SETTINGS_SHEET, existingIndex, { key: item.key, value: item.value })
      } else {
        await appendRow(SETTINGS_SHEET, { key: item.key, value: item.value })
      }
    }
  } catch {
    // Cache sudah ter-update; Sheets sync bisa retry belakangan
  }
}