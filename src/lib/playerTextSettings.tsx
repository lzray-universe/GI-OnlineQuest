import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react'
import type { PlayerTextSettings } from './gameText'

const STORAGE_KEY = 'onlinequest_player_text_settings'

export const DEFAULT_PLAYER_TEXT_SETTINGS: PlayerTextSettings = {
  playerName: '旅行者',
  playerGender: 'F',
  realnameId1: '流浪者',
  realnameId2: '小龙',
}

type PlayerTextSettingsContextValue = {
  settings: PlayerTextSettings
  setSettings: Dispatch<SetStateAction<PlayerTextSettings>>
  updateSettings: (patch: Partial<PlayerTextSettings>) => void
  resetSettings: () => void
}

const PlayerTextSettingsContext = createContext<PlayerTextSettingsContextValue | null>(null)

const readStoredSettings = (): PlayerTextSettings => {
  if (typeof window === 'undefined') return DEFAULT_PLAYER_TEXT_SETTINGS
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) return DEFAULT_PLAYER_TEXT_SETTINGS
  try {
    const parsed = JSON.parse(raw) as Partial<PlayerTextSettings>
    return {
      ...DEFAULT_PLAYER_TEXT_SETTINGS,
      ...parsed,
      playerGender: parsed.playerGender === 'M' ? 'M' : 'F',
    }
  } catch {
    return DEFAULT_PLAYER_TEXT_SETTINGS
  }
}

export const PlayerTextSettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<PlayerTextSettings>(() => readStoredSettings())

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch {
      // ignore storage errors
    }
  }, [settings])

  const updateSettings = useCallback((patch: Partial<PlayerTextSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }))
  }, [])

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_PLAYER_TEXT_SETTINGS)
  }, [])

  const value = useMemo(
    () => ({
      settings,
      setSettings,
      updateSettings,
      resetSettings,
    }),
    [resetSettings, settings, updateSettings]
  )

  return <PlayerTextSettingsContext.Provider value={value}>{children}</PlayerTextSettingsContext.Provider>
}

export const usePlayerTextSettings = () => {
  const context = useContext(PlayerTextSettingsContext)
  if (!context) {
    throw new Error('usePlayerTextSettings must be used within PlayerTextSettingsProvider')
  }
  return context
}
