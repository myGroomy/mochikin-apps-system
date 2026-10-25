import { getAppSettings } from '@/services/settingsService'

export function buildWaLink(phone: string, name?: string): string {
  const digits = phone.replace(/\D/g, '')
  const number = digits.startsWith('0') ? '62' + digits.slice(1) : digits
  
  const settings = getAppSettings()
  let message = settings.waTemplate
  
  if (name) {
    message = message.replace('{nama}', name)
  } else {
    message = message.replace('{nama}', 'Pelanggan')
  }
  message = message.replace('{toko}', settings.storeName)

  const params = new URLSearchParams()
  if (message) {
    params.set('text', message)
  }

  const query = params.toString()
  return `https://wa.me/${number}${query ? '?' + query : ''}`
}