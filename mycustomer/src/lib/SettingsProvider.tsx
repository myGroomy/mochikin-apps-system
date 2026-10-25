'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { getAppSettings, syncSettingsFromSheets, saveAppSettings, type AppSettings } from '@/services/settingsService'

interface SettingsContextType {
  settings: AppSettings
  loading: boolean
  saveSettings: (settings: AppSettings) => Promise<void>
}

const SettingsContext = createContext<SettingsContextType>({
  settings: getAppSettings(),
  loading: true,
  saveSettings: async () => {},
})

export function useSettings() {
  return useContext(SettingsContext)
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(getAppSettings)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const synced = await syncSettingsFromSheets()
        setSettings(synced)
      } catch {
        // Use localStorage fallback
        setSettings(getAppSettings())
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const save = useCallback(async (newSettings: AppSettings) => {
    setSettings(newSettings)
    await saveAppSettings(newSettings)
  }, [])

  return (
    <SettingsContext.Provider value={{ settings, loading, saveSettings: save }}>
      {children}
    </SettingsContext.Provider>
  )
}
