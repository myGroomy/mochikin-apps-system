import { getAppSettings, type AppSettings } from '@/services/settingsService'

export function selectWaTemplateByOrderCount(
  orderCount?: number,
  settings: AppSettings = getAppSettings(),
): string {
  if (typeof orderCount === 'number' && orderCount > 0 && Array.isArray(settings.waFrequencyTemplates)) {
    const matched = settings.waFrequencyTemplates.find(
      (rule) =>
        orderCount >= rule.minOrders &&
        (rule.maxOrders === null || orderCount <= rule.maxOrders) &&
        rule.template.trim().length > 0,
    )
    if (matched) return matched.template
  }
  return settings.waTemplate
}

export function formatWaMessage(
  template: string,
  params: { name?: string; storeName?: string; orderCount?: number },
): string {
  const safeName = params.name?.trim() || 'Pelanggan'
  const safeStore = params.storeName?.trim() || 'Toko Kami'
  const safeCount = typeof params.orderCount === 'number' && params.orderCount > 0 ? String(params.orderCount) : '1'

  return template
    .replaceAll('{nama}', safeName)
    .replaceAll('{toko}', safeStore)
    .replaceAll('{jumlah_order}', safeCount)
}

export function buildWaLink(phone: string, name?: string, orderCount?: number): string {
  const digits = phone.replace(/\D/g, '')
  const number = digits.startsWith('0') ? '62' + digits.slice(1) : digits

  const settings = getAppSettings()
  const rawTemplate = selectWaTemplateByOrderCount(orderCount, settings)
  const message = formatWaMessage(rawTemplate, {
    name,
    storeName: settings.storeName,
    orderCount,
  })

  const params = new URLSearchParams()
  if (message) {
    params.set('text', message)
  }

  const query = params.toString()
  return `https://wa.me/${number}${query ? '?' + query : ''}`
}