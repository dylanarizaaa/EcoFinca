import { create } from 'zustand'
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from '@/persistence/repository'
import type { AppSettings } from '@/persistence/schema'

interface SettingsStore {
  settings: AppSettings
  loaded: boolean
  load: () => Promise<void>
  update: (patch: Partial<AppSettings>) => Promise<void>
  reset: () => Promise<void>
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  loaded: false,
  load: async () => {
    try {
      const settings = await loadSettings()
      set({ settings, loaded: true })
    } catch {
      set({ settings: DEFAULT_SETTINGS, loaded: true })
    }
  },
  update: async (patch) => {
    const next = { ...get().settings, ...patch }
    set({ settings: next })
    await saveSettings(next)
  },
  reset: async () => {
    set({ settings: DEFAULT_SETTINGS })
    await saveSettings(DEFAULT_SETTINGS)
  },
}))
